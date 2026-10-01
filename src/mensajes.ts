import { ApiError, apiFetch, obtenerSesion } from './api.js';
import type { ConversacionDetalle, ConversacionResumen, Mensaje } from './tipos.js';
import {
    conBoton, escapeHtml, formatoFechaCorta, formatoPrecio, mensajeDeError, mostrarAlerta, ocultarAlerta, porId,
} from './util.js';
import { LIMITES, validarMensaje, validarMonto } from './validaciones.js';

type Filtro = 'TODAS' | 'COMPRAS' | 'VENTAS' | 'NO_LEIDAS';

const INTERVALO_LISTA_MS = 10000;
const INTERVALO_CHAT_MS = 5000;
const RESPUESTAS_COMPRADOR = ['¿Sigue disponible?', '¿Aceptas una oferta?', '¿Dónde podríamos juntarnos?', 'Gracias'];
const RESPUESTAS_VENDEDOR = ['Sí, sigue disponible', 'Podemos coordinar la entrega por aquí', '¿Cuándo podrías pasar?', 'Gracias'];

const estado = {
    conversaciones: [] as ConversacionResumen[],
    filtro: 'TODAS' as Filtro,
    busqueda: '',
    publicacionId: null as number | null,
    activa: null as ConversacionResumen | null,
    firmaMensajes: '',
    cargandoChat: false,
};

document.addEventListener('DOMContentLoaded', () => {
    if (!obtenerSesion()) {
        porId('mensajesSinSesion').classList.remove('d-none');
        return;
    }
    porId('mensajesLayout').classList.remove('d-none');
    configurarEventos();
    void iniciar();

    setInterval(() => { if (!document.hidden) void cargarLista(); }, INTERVALO_LISTA_MS);
    setInterval(() => { if (!document.hidden && estado.activa) void refrescarChat(); }, INTERVALO_CHAT_MS);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) { void cargarLista(); if (estado.activa) void refrescarChat(); }
    });
    window.addEventListener('mr:sesion-expirada', () => { window.location.href = 'index.html'; });
});

async function iniciar(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const p = Number(params.get('p'));
    const c = Number(params.get('c'));
    if (Number.isInteger(p) && p > 0) estado.publicacionId = p;

    await cargarLista();
    if (Number.isInteger(c) && c > 0) {
        await abrirConversacion(c);
    } else if (estado.publicacionId !== null) {
        const primera = visibles()[0];
        if (primera) await abrirConversacion(primera.id);
    }
}

// ------------------------------------------------------------ lista

async function cargarLista(): Promise<void> {
    try {
        estado.conversaciones = await apiFetch<ConversacionResumen[]>('/conversaciones');
        renderLista();
    } catch (e) {
        if (!estado.conversaciones.length) {
            porId('listaConversaciones').innerHTML =
                `<p class="text-danger p-3 mb-0">${escapeHtml(mensajeDeError(e, 'No se pudieron cargar las conversaciones.'))}</p>`;
        }
    }
}

function visibles(): ConversacionResumen[] {
    const q = estado.busqueda.toLowerCase();
    return estado.conversaciones.filter(c => {
        if (estado.publicacionId !== null && c.publicacionId !== estado.publicacionId) return false;
        if (estado.filtro === 'COMPRAS' && c.rol !== 'COMPRADOR') return false;
        if (estado.filtro === 'VENTAS' && c.rol !== 'VENDEDOR') return false;
        if (estado.filtro === 'NO_LEIDAS' && c.noLeidos === 0) return false;
        if (q && !(c.publicacionTitulo.toLowerCase().includes(q) || c.interlocutorApodo.toLowerCase().includes(q))) return false;
        return true;
    });
}

function renderLista(): void {
    const lista = porId('listaConversaciones');
    const items = visibles();

    const chip = porId('chipPublicacion');
    if (estado.publicacionId !== null) {
        chip.classList.remove('d-none');
        chip.innerHTML = `Filtrando por una publicación. <a href="#" id="quitarFiltroPublicacion">Ver todas</a>`;
        document.getElementById('quitarFiltroPublicacion')?.addEventListener('click', e => {
            e.preventDefault();
            estado.publicacionId = null;
            history.replaceState(null, '', estado.activa ? `mensajes.html?c=${estado.activa.id}` : 'mensajes.html');
            renderLista();
        });
    } else {
        chip.classList.add('d-none');
    }

    if (!items.length) {
        lista.innerHTML = `<p class="text-muted p-3 mb-0">${estado.conversaciones.length
            ? 'No hay conversaciones con ese filtro.'
            : 'Aún no tienes conversaciones. Cuando escribas a un vendedor o alguien te escriba, aparecerán aquí.'}</p>`;
        return;
    }

    lista.innerHTML = items.map(c => `
        <button type="button" class="bandeja-item ${estado.activa?.id === c.id ? 'activa' : ''}" data-conv="${c.id}">
            <img src="${escapeHtml(c.imagenUrl)}" alt="" class="bandeja-miniatura" loading="lazy">
            <span class="bandeja-texto">
                <span class="d-flex justify-content-between gap-2">
                    <strong class="text-truncate">${escapeHtml(c.interlocutorApodo)}</strong>
                    ${c.noLeidos ? `<span class="badge text-bg-danger">${c.noLeidos}</span>` : ''}
                </span>
                <small class="d-block text-truncate">${escapeHtml(c.publicacionTitulo)} · ${c.rol === 'VENDEDOR' ? 'Vendes' : 'Compras'}</small>
                <small class="d-block text-muted text-truncate">${escapeHtml(c.ultimoMensaje ?? '')}</small>
            </span>
        </button>`).join('');
    lista.querySelectorAll<HTMLElement>('[data-conv]').forEach(btn =>
        btn.addEventListener('click', () => void abrirConversacion(Number(btn.dataset['conv']))));
}

// ------------------------------------------------------------ chat

async function abrirConversacion(id: number): Promise<void> {
    if (estado.cargandoChat) return;
    estado.cargandoChat = true;
    estado.firmaMensajes = '';
    ocultarAlerta(porId('chatAlerta'));
    try {
        const detalle = await apiFetch<ConversacionDetalle>(`/conversaciones/${id}`);
        estado.activa = detalle.conversacion;
        porId('chatVacio').classList.add('d-none');
        porId('chatActivo').classList.remove('d-none');
        porId('mensajesLayout').classList.add('chat-abierto');
        history.replaceState(null, '', `mensajes.html?c=${id}`);
        pintarCabecera(detalle.conversacion);
        pintarMensajes(detalle, true);
        pintarPie(detalle.conversacion);
        sincronizarEnLista(detalle.conversacion);
    } catch (e) {
        const noExiste = e instanceof ApiError && e.status === 404;
        estado.activa = null;
        porId('chatActivo').classList.add('d-none');
        const vacio = porId('chatVacio');
        vacio.classList.remove('d-none');
        vacio.innerHTML = `<i class="bi bi-exclamation-circle display-4"></i><p class="mb-0">${
            escapeHtml(noExiste ? 'Esa conversación no existe o no tienes acceso.' : mensajeDeError(e))}</p>`;
        porId('mensajesLayout').classList.remove('chat-abierto');
    } finally {
        estado.cargandoChat = false;
    }
}

async function refrescarChat(): Promise<void> {
    const activa = estado.activa;
    if (!activa || estado.cargandoChat) return;
    try {
        const detalle = await apiFetch<ConversacionDetalle>(`/conversaciones/${activa.id}`);
        if (estado.activa?.id !== activa.id) return; // el usuario cambió de conversación
        estado.activa = detalle.conversacion;
        pintarCabecera(detalle.conversacion);
        pintarMensajes(detalle, false);
        pintarPie(detalle.conversacion);
        sincronizarEnLista(detalle.conversacion);
    } catch { /* se reintenta en el siguiente ciclo */ }
}

function sincronizarEnLista(c: ConversacionResumen): void {
    const i = estado.conversaciones.findIndex(x => x.id === c.id);
    if (i >= 0) estado.conversaciones[i] = c; else estado.conversaciones.unshift(c);
    renderLista();
}

function pintarCabecera(c: ConversacionResumen): void {
    const imagen = porId<HTMLImageElement>('chatImagen');
    imagen.src = c.imagenUrl;
    porId('chatTitulo').textContent = c.publicacionTitulo;

    const etiquetas: Record<string, string> = { VENDIDA: 'Vendida', ELIMINADA: 'Publicación eliminada' };
    const estadoTexto = etiquetas[c.publicacionEstado] ?? '';
    porId('chatSubtitulo').textContent =
        `${formatoPrecio(c.publicacionPrecio)}${c.montoAcordado ? ` · acordado ${formatoPrecio(c.montoAcordado)}` : ''}`
        + ` · ${c.rol === 'VENDEDOR' ? 'Comprador' : 'Vendedor'}: ${c.interlocutorApodo}${estadoTexto ? ` · ${estadoTexto}` : ''}`;

    const acciones = porId('chatAcciones');
    acciones.innerHTML = '';
    if (c.publicacionEstado !== 'ACTIVA') return;
    if (c.rol === 'COMPRADOR') {
        acciones.innerHTML = '<button class="btn btn-sm btn-outline-primary" type="button" id="btnOfertar"><i class="bi bi-tag"></i> Hacer oferta</button>';
        document.getElementById('btnOfertar')?.addEventListener('click', () => alternarOferta(true));
    } else {
        acciones.innerHTML = '<button class="btn btn-sm btn-outline-success" type="button" id="btnVender"><i class="bi bi-check2-circle"></i> Marcar como vendido</button>';
        document.getElementById('btnVender')?.addEventListener('click', () => void marcarVendido());
    }
}

function firmaDe(mensajes: Mensaje[]): string {
    return mensajes.map(m => `${m.id}:${m.estadoOferta ?? ''}`).join('|');
}

function pintarMensajes(detalle: ConversacionDetalle, forzarBajar: boolean): void {
    const firma = firmaDe(detalle.mensajes) + `|${detalle.conversacion.publicacionEstado}`;
    if (firma === estado.firmaMensajes) return; // nada cambió: no se repinta
    estado.firmaMensajes = firma;

    const cont = porId('chatMensajes');
    const pegado = forzarBajar || cont.scrollTop + cont.clientHeight >= cont.scrollHeight - 60;
    const yo = obtenerSesion()?.usuario.id;
    const c = detalle.conversacion;
    const puedeResponder = c.rol === 'VENDEDOR' && c.publicacionEstado === 'ACTIVA';

    let diaAnterior = '';
    cont.innerHTML = detalle.mensajes.map(m => {
        const dia = new Date(m.fechaEnvio).toLocaleDateString('es-CL', { dateStyle: 'medium' });
        const separador = dia !== diaAnterior ? `<div class="chat-dia">${escapeHtml(dia)}</div>` : '';
        diaAnterior = dia;
        return separador + burbuja(m, m.remitenteId === yo, puedeResponder);
    }).join('') || '<p class="text-muted text-center my-4">Aún no hay mensajes.</p>';

    cont.querySelectorAll<HTMLElement>('[data-aceptar]').forEach(b =>
        b.addEventListener('click', () => void responderOferta(Number(b.dataset['aceptar']), true)));
    cont.querySelectorAll<HTMLElement>('[data-rechazar]').forEach(b =>
        b.addEventListener('click', () => void responderOferta(Number(b.dataset['rechazar']), false)));
    if (pegado) cont.scrollTop = cont.scrollHeight;
}

function burbuja(m: Mensaje, mio: boolean, puedeResponder: boolean): string {
    if (m.tipo === 'SISTEMA') return `<div class="chat-sistema">${escapeHtml(m.contenido)}</div>`;
    const hora = formatoFechaCorta(m.fechaEnvio);
    const visto = mio ? `<i class="bi ${m.leido ? 'bi-check2-all text-info' : 'bi-check2'}" title="${m.leido ? 'Leído' : 'Enviado'}"></i>` : '';
    let cuerpo = escapeHtml(m.contenido);
    if (m.tipo === 'OFERTA') {
        const etiquetas = { PENDIENTE: 'Pendiente', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada', REEMPLAZADA: 'Reemplazada' } as const;
        const botones = puedeResponder && m.estadoOferta === 'PENDIENTE' ? `
            <div class="d-flex gap-2 mt-2">
                <button class="btn btn-sm btn-success" data-aceptar="${m.id}">Aceptar</button>
                <button class="btn btn-sm btn-outline-danger" data-rechazar="${m.id}">Rechazar</button>
            </div>` : '';
        cuerpo = `<div class="chat-oferta"><i class="bi bi-tag"></i> Oferta de <strong>${formatoPrecio(m.monto ?? 0)}</strong>
            <span class="badge text-bg-secondary ms-1">${m.estadoOferta ? etiquetas[m.estadoOferta] : ''}</span>${botones}</div>`;
    }
    return `<div class="chat-burbuja ${mio ? 'mia' : 'otra'}">${cuerpo}<small class="d-block chat-hora">${hora} ${visto}</small></div>`;
}

function pintarPie(c: ConversacionResumen): void {
    const eliminada = c.publicacionEstado === 'ELIMINADA';
    porId('chatPie').classList.toggle('d-none', eliminada);
    if (eliminada) return;
    if (c.publicacionEstado !== 'ACTIVA') alternarOferta(false);

    const respuestas = porId('respuestasRapidas');
    const lista = c.rol === 'COMPRADOR' ? RESPUESTAS_COMPRADOR : RESPUESTAS_VENDEDOR;
    if (respuestas.dataset['rol'] !== c.rol) {
        respuestas.dataset['rol'] = c.rol;
        respuestas.innerHTML = lista.map((t, i) => `<button type="button" class="btn btn-sm btn-outline-secondary" data-rapida="${i}">${escapeHtml(t)}</button>`).join('');
        respuestas.querySelectorAll<HTMLElement>('[data-rapida]').forEach(b =>
            b.addEventListener('click', () => {
                const texto = porId<HTMLTextAreaElement>('chatTexto');
                texto.value = lista[Number(b.dataset['rapida'])] ?? '';
                actualizarContador();
                texto.focus();
            }));
    }
}

// ------------------------------------------------------------ acciones

function alertaChat(mensaje: string): void {
    mostrarAlerta(porId('chatAlerta'), mensaje);
}

async function accion(endpoint: string, cuerpo?: unknown): Promise<boolean> {
    const activa = estado.activa;
    if (!activa) return false;
    ocultarAlerta(porId('chatAlerta'));
    try {
        const detalle = await apiFetch<ConversacionDetalle>(`/conversaciones/${activa.id}${endpoint}`, {
            method: 'POST',
            ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
        });
        estado.activa = detalle.conversacion;
        pintarCabecera(detalle.conversacion);
        pintarMensajes(detalle, true);
        pintarPie(detalle.conversacion);
        sincronizarEnLista(detalle.conversacion);
        return true;
    } catch (e) {
        alertaChat(mensajeDeError(e, 'No se pudo completar la acción.'));
        void refrescarChat();
        return false;
    }
}

async function enviarMensaje(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const texto = porId<HTMLTextAreaElement>('chatTexto');
    const contenido = texto.value.trim();
    const error = validarMensaje(contenido);
    if (error) {
        alertaChat(error);
        return;
    }
    await conBoton(porId<HTMLButtonElement>('btnEnviarMensaje'), '...', async () => {
        if (await accion('/mensajes', { contenido })) {
            texto.value = '';
            actualizarContador();
        }
    });
}

function alternarOferta(mostrar: boolean): void {
    porId('formOferta').classList.toggle('d-none', !mostrar);
    if (mostrar) porId<HTMLInputElement>('ofertaMonto').focus();
    else porId<HTMLInputElement>('ofertaMonto').value = '';
}

async function enviarOferta(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const activa = estado.activa;
    if (!activa) return;
    const campo = porId<HTMLInputElement>('ofertaMonto');
    const valor = campo.value.trim().replace(/\./g, '').replace(',', '.'); // permite "45.000" o "45000,50"
    const error = validarMonto(valor, 'La oferta');
    if (error) {
        alertaChat(error);
        return;
    }
    if (Number(valor) > activa.publicacionPrecio * 10) {
        alertaChat('La oferta es demasiado alta respecto al precio publicado. Revisa el monto.');
        return;
    }
    await conBoton(porId<HTMLButtonElement>('btnEnviarOferta'), 'Enviando...', async () => {
        if (await accion('/ofertas', { monto: Number(valor) })) alternarOferta(false);
    });
}

async function responderOferta(mensajeId: number, aceptar: boolean): Promise<void> {
    if (!Number.isInteger(mensajeId) || mensajeId <= 0) return;
    await accion(`/ofertas/${mensajeId}/${aceptar ? 'aceptar' : 'rechazar'}`);
}

async function marcarVendido(): Promise<void> {
    const c = estado.activa;
    if (!c) return;
    const precio = formatoPrecio(c.montoAcordado ?? c.publicacionPrecio);
    if (!confirm(`¿Marcar como vendido a ${c.interlocutorApodo} por ${precio}? Esta acción cierra la publicación y no se puede deshacer.`)) return;
    await accion('/venta');
}

function actualizarContador(): void {
    porId('chatContador').textContent = String(porId<HTMLTextAreaElement>('chatTexto').value.length);
}

function configurarEventos(): void {
    porId<HTMLFormElement>('formChat').addEventListener('submit', e => void enviarMensaje(e));
    porId<HTMLFormElement>('formOferta').addEventListener('submit', e => void enviarOferta(e));
    porId('btnCancelarOferta').addEventListener('click', () => alternarOferta(false));
    porId('btnVolverLista').addEventListener('click', () => porId('mensajesLayout').classList.remove('chat-abierto'));

    const texto = porId<HTMLTextAreaElement>('chatTexto');
    texto.maxLength = LIMITES.mensaje.max;
    texto.addEventListener('input', actualizarContador);
    texto.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            porId<HTMLFormElement>('formChat').requestSubmit();
        }
    });

    porId('buscarConversacion').addEventListener('input', e => {
        estado.busqueda = (e.target as HTMLInputElement).value.trim();
        renderLista();
    });
    porId('filtrosConversacion').querySelectorAll<HTMLButtonElement>('[data-filtro]').forEach(btn =>
        btn.addEventListener('click', () => {
            estado.filtro = btn.dataset['filtro'] as Filtro;
            porId('filtrosConversacion').querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
            renderLista();
        }));
}
