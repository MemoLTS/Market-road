import { ApiError } from './api.js';
import {
    actualizarPersonalSesion, guardarSesionSoporte, limpiarSesionSoporte, obtenerSesionSoporte, soporteFetch,
} from './soporte-api.js';
import type {
    Categoria, Estadisticas, EstadoTicket, LoginSoporteRespuesta, MensajeTicket, Pagina, PersonalSoporte,
    PrioridadTicket, TicketPanelDetalle, TicketPanelResumen,
} from './tipos-soporte.js';
import {
    conBoton, escapeHtml, formatoFechaCorta, mensajeDeError, mostrarAlerta, ocultarAlerta, porId,
} from './util.js';

type Vista = 'tickets' | 'equipo' | 'estadisticas' | 'cuenta';

const INTERVALO_LISTA_MS = 10000;
const INTERVALO_CHAT_MS = 5000;
const TAMANO_PAGINA = 20;
const MAX_MENSAJE = 1000;

const NOMBRE_ESTADO: Record<EstadoTicket, string> = {
    ABIERTO: 'Abierto', EN_PROGRESO: 'En progreso', RESUELTO: 'Resuelto', CERRADO: 'Cerrado',
};
const COLOR_ESTADO: Record<EstadoTicket, string> = {
    ABIERTO: 'text-bg-warning', EN_PROGRESO: 'text-bg-primary', RESUELTO: 'text-bg-success', CERRADO: 'text-bg-secondary',
};
const NOMBRE_PRIORIDAD: Record<PrioridadTicket, string> = {
    BAJA: 'Baja', NORMAL: 'Normal', ALTA: 'Alta', URGENTE: 'Urgente',
};
const COLOR_PRIORIDAD: Record<PrioridadTicket, string> = {
    BAJA: 'text-bg-light border', NORMAL: 'text-bg-light border', ALTA: 'text-bg-warning', URGENTE: 'text-bg-danger',
};

const estado = {
    yo: null as PersonalSoporte | null,
    vista: 'tickets' as Vista,
    categorias: [] as Categoria[],
    personal: [] as PersonalSoporte[],
    tickets: [] as TicketPanelResumen[],
    pagina: 0,
    totalPaginas: 0,
    totalElementos: 0,
    secuenciaLista: 0,
    activo: null as TicketPanelDetalle | null,
    firma: '',
    enviando: false,
    editando: null as PersonalSoporte | null,
};

const esAdmin = (): boolean => estado.yo?.rol === 'ADMIN';

document.addEventListener('DOMContentLoaded', () => {
    configurarEventos();
    window.addEventListener('mr:soporte-sesion-expirada', () => mostrarLogin('Tu sesión expiró. Inicia sesión nuevamente.'));

    const sesion = obtenerSesionSoporte();
    if (sesion) void entrar(); else mostrarLogin();

    setInterval(() => {
        if (estado.yo && estado.vista === 'tickets' && !document.hidden) void cargarLista();
    }, INTERVALO_LISTA_MS);
    setInterval(() => {
        if (estado.yo && estado.vista === 'tickets' && estado.activo && !document.hidden) void refrescarChat();
    }, INTERVALO_CHAT_MS);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden || !estado.yo || estado.vista !== 'tickets') return;
        void cargarLista();
        if (estado.activo) void refrescarChat();
    });
});

// ================================================================ Sesión

function mostrarLogin(mensaje?: string): void {
    estado.yo = null;
    estado.activo = null;
    estado.firma = '';
    porId('panelApp').classList.add('d-none');
    porId('panelSesion').classList.add('d-none');
    porId('panelLogin').classList.remove('d-none');
    const alerta = porId('loginAlerta');
    if (mensaje) mostrarAlerta(alerta, mensaje); else ocultarAlerta(alerta);
}

async function entrar(): Promise<void> {
    try {
        // El rol se confirma con el servidor: es lo que manda, no lo guardado en el navegador.
        const yo = await soporteFetch<PersonalSoporte>('/soporte/panel/auth/yo');
        actualizarPersonalSesion(yo);
        estado.yo = yo;
    } catch (error) {
        // Solo un 401 invalida la sesión; un corte de red no debería sacar a nadie del panel.
        if (error instanceof ApiError && error.status === 401) limpiarSesionSoporte();
        mostrarLogin(error instanceof ApiError && error.status === 401 ? undefined : mensajeDeError(error));
        return;
    }
    const yo = estado.yo!;
    porId('panelLogin').classList.add('d-none');
    porId('panelApp').classList.remove('d-none');
    porId('panelSesion').classList.remove('d-none');
    porId('panelNombre').textContent = yo.nombre;
    porId('panelRol').textContent = yo.rolNombre;
    document.querySelectorAll('.sp-solo-admin').forEach(el => {
        // Las pestañas de admin se ocultan solo en la barra; cada vista se muestra únicamente al elegirla.
        if (el.tagName === 'LI') el.classList.toggle('d-none', !esAdmin());
    });
    cambiarVista('tickets');
    await Promise.all([cargarCategorias(), cargarLista()]);
}

async function iniciarSesion(): Promise<void> {
    const alerta = porId('loginAlerta');
    ocultarAlerta(alerta);
    const correo = porId<HTMLInputElement>('loginCorreo').value.trim();
    const contrasena = porId<HTMLInputElement>('loginContrasena').value;
    if (!correo || !contrasena) return mostrarAlerta(alerta, 'Ingresa tu correo y tu contraseña.');
    try {
        const respuesta = await conBoton(porId<HTMLButtonElement>('btnLoginPanel'), 'Ingresando...', () =>
            soporteFetch<LoginSoporteRespuesta>('/soporte/panel/auth/login', {
                method: 'POST', body: JSON.stringify({ correo, contrasena }),
            }));
        guardarSesionSoporte(respuesta);
        porId<HTMLInputElement>('loginContrasena').value = '';
        await entrar();
    } catch (error) {
        mostrarAlerta(alerta, mensajeDeError(error));
    }
}

function cerrarSesion(): void {
    limpiarSesionSoporte();
    estado.tickets = [];
    estado.personal = [];
    porId<HTMLInputElement>('loginContrasena').value = '';
    mostrarLogin();
}

// ================================================================ Eventos

function configurarEventos(): void {
    porId<HTMLFormElement>('formLoginPanel').addEventListener('submit', e => { e.preventDefault(); void iniciarSesion(); });
    porId('btnSalirPanel').addEventListener('click', cerrarSesion);

    document.querySelectorAll<HTMLElement>('#panelTabs [data-vista]').forEach(b =>
        b.addEventListener('click', () => cambiarVista(b.dataset['vista'] as Vista)));

    // Filtros del listado
    for (const id of ['filtroEstado', 'filtroAsignacion', 'filtroPrioridad', 'filtroCategoria']) {
        porId(id).addEventListener('change', () => { estado.pagina = 0; void cargarLista(); });
    }
    let temporizador: number | undefined;
    porId('filtroBuscar').addEventListener('input', () => {
        window.clearTimeout(temporizador);
        temporizador = window.setTimeout(() => { estado.pagina = 0; void cargarLista(); }, 350);
    });
    porId('btnPagAnterior').addEventListener('click', () => { if (estado.pagina > 0) { estado.pagina--; void cargarLista(); } });
    porId('btnPagSiguiente').addEventListener('click', () => {
        if (estado.pagina + 1 < estado.totalPaginas) { estado.pagina++; void cargarLista(); }
    });

    // Chat
    porId<HTMLFormElement>('formChat').addEventListener('submit', e => { e.preventDefault(); void enviarMensaje(); });
    const texto = porId<HTMLTextAreaElement>('chatTexto');
    texto.addEventListener('input', () => { porId('chatContador').textContent = String(texto.value.length); });
    texto.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); void enviarMensaje(); }
    });
    porId('btnVolverLista').addEventListener('click', () => porId('ticketsLayout').classList.remove('chat-abierto'));

    // Equipo, estadísticas y cuenta
    porId('btnNuevoPersonal').addEventListener('click', () => abrirModalPersonal(null));
    porId<HTMLFormElement>('formPersonal').addEventListener('submit', e => { e.preventDefault(); void guardarPersonal(); });
    porId('btnActualizarStats').addEventListener('click', () => void cargarEstadisticas());
    porId<HTMLFormElement>('formContrasena').addEventListener('submit', e => { e.preventDefault(); void cambiarContrasena(); });
}

function cambiarVista(vista: Vista): void {
    if ((vista === 'equipo' || vista === 'estadisticas') && !esAdmin()) vista = 'tickets';
    estado.vista = vista;
    const ids: Record<Vista, string> = {
        tickets: 'vistaTickets', equipo: 'vistaEquipo', estadisticas: 'vistaEstadisticas', cuenta: 'vistaCuenta',
    };
    (Object.keys(ids) as Vista[]).forEach(v => porId(ids[v]).classList.toggle('d-none', v !== vista));
    document.querySelectorAll<HTMLElement>('#panelTabs [data-vista]').forEach(b =>
        b.classList.toggle('active', b.dataset['vista'] === vista));
    if (vista === 'tickets') void cargarLista();
    if (vista === 'equipo') void cargarEquipo();
    if (vista === 'estadisticas') void cargarEstadisticas();
}

// ================================================================ Lista de tickets

async function cargarCategorias(): Promise<void> {
    try {
        estado.categorias = await soporteFetch<Categoria[]>('/soporte/categorias');
        const select = porId<HTMLSelectElement>('filtroCategoria');
        const actual = select.value;
        select.innerHTML = '<option value="">Todas</option>' + estado.categorias
            .map(c => `<option value="${escapeHtml(c.codigo)}">${escapeHtml(c.nombre)}</option>`).join('');
        select.value = actual;
    } catch (error) {
        console.error('No se pudieron cargar las categorías', error);
    }
}

function parametrosLista(): string {
    const p = new URLSearchParams();
    const estadoF = porId<HTMLSelectElement>('filtroEstado').value;
    const asignacion = porId<HTMLSelectElement>('filtroAsignacion').value;
    const prioridad = porId<HTMLSelectElement>('filtroPrioridad').value;
    const categoria = porId<HTMLSelectElement>('filtroCategoria').value;
    const q = porId<HTMLInputElement>('filtroBuscar').value.trim();
    if (estadoF) p.set('estado', estadoF);
    if (asignacion !== 'TODOS') p.set('asignacion', asignacion);
    if (prioridad) p.set('prioridad', prioridad);
    if (categoria) p.set('categoria', categoria);
    if (q) p.set('q', q);
    p.set('pagina', String(estado.pagina));
    p.set('tamano', String(TAMANO_PAGINA));
    return p.toString();
}

async function cargarLista(): Promise<void> {
    if (!estado.yo) return;
    const secuencia = ++estado.secuenciaLista;
    try {
        const res = await soporteFetch<Pagina<TicketPanelResumen>>(`/soporte/panel/tickets?${parametrosLista()}`);
        if (secuencia !== estado.secuenciaLista) return; // llegó una respuesta más nueva
        if (!res.contenido.length && res.pagina > 0 && res.totalPaginas > 0) {
            estado.pagina = res.totalPaginas - 1;
            return void cargarLista();
        }
        estado.tickets = res.contenido;
        estado.totalPaginas = res.totalPaginas;
        estado.totalElementos = res.totalElementos;
        pintarLista();
    } catch (error) {
        if (secuencia !== estado.secuenciaLista || !estado.yo) return;
        porId('resumenLista').textContent = mensajeDeError(error, 'No se pudieron cargar los tickets.');
    }
}

function pintarLista(): void {
    porId('resumenLista').textContent = estado.totalElementos === 1 ? '1 ticket' : `${estado.totalElementos} tickets`;
    const pag = porId('paginacion');
    pag.classList.toggle('d-none', estado.totalPaginas <= 1);
    porId('textoPagina').textContent = `Página ${estado.pagina + 1} de ${Math.max(1, estado.totalPaginas)}`;
    porId<HTMLButtonElement>('btnPagAnterior').disabled = estado.pagina === 0;
    porId<HTMLButtonElement>('btnPagSiguiente').disabled = estado.pagina + 1 >= estado.totalPaginas;

    const lista = porId('listaTickets');
    if (!estado.tickets.length) {
        lista.innerHTML = '<p class="text-muted p-3 mb-0">No hay tickets con estos filtros.</p>';
        return;
    }
    const activoId = estado.activo?.ticket.id;
    lista.innerHTML = estado.tickets.map(t => `
        <button type="button" class="bandeja-item ${activoId === t.id ? 'activa' : ''}" data-ticket="${t.id}">
            <span class="bandeja-texto">
                <span class="d-flex justify-content-between gap-2">
                    <strong class="text-truncate">#${t.id} · ${escapeHtml(t.asunto)}</strong>
                    ${t.sinLeer ? `<span class="badge text-bg-danger" title="Mensajes sin leer">${t.sinLeer}</span>` : ''}
                </span>
                <small class="d-block text-truncate">${escapeHtml(t.usuarioApodo)} · ${escapeHtml(t.categoriaNombre)}</small>
                <span class="d-flex gap-1 flex-wrap my-1">
                    <span class="badge ${COLOR_ESTADO[t.estado]}">${escapeHtml(t.estadoNombre)}</span>
                    <span class="badge ${COLOR_PRIORIDAD[t.prioridad]}">${escapeHtml(t.prioridadNombre)}</span>
                    <span class="badge text-bg-light border">${t.asignadoNombre ? escapeHtml(t.asignadoNombre) : 'Sin asignar'}</span>
                </span>
                <small class="d-block text-muted text-truncate">${escapeHtml(t.ultimoMensaje ?? '')}</small>
            </span>
        </button>`).join('');
    lista.querySelectorAll<HTMLElement>('[data-ticket]').forEach(b =>
        b.addEventListener('click', () => void abrirTicket(Number(b.dataset['ticket']))));
}

// ================================================================ Chat del ticket

async function asegurarPersonal(): Promise<void> {
    if (!esAdmin() || estado.personal.length) return;
    try {
        estado.personal = await soporteFetch<PersonalSoporte[]>('/soporte/panel/personal');
    } catch (error) {
        console.error('No se pudo cargar el equipo', error);
    }
}

async function abrirTicket(id: number): Promise<void> {
    const alerta = porId('chatAlerta');
    ocultarAlerta(alerta);
    try {
        const [detalle] = await Promise.all([
            soporteFetch<TicketPanelDetalle>(`/soporte/panel/tickets/${id}`), asegurarPersonal(),
        ]);
        estado.activo = detalle;
        estado.firma = '';
        pintarChat(true);
        void cargarLista(); // actualiza el contador de "sin leer"
    } catch (error) {
        porId('chatVacio').classList.remove('d-none');
        porId('chatActivo').classList.add('d-none');
        porId('chatVacio').querySelector('p')!.textContent = mensajeDeError(error, 'No se pudo abrir el ticket.');
        estado.activo = null;
    }
}

async function refrescarChat(): Promise<void> {
    const actual = estado.activo;
    if (!actual) return;
    try {
        const detalle = await soporteFetch<TicketPanelDetalle>(`/soporte/panel/tickets/${actual.ticket.id}`);
        if (estado.activo?.ticket.id !== actual.ticket.id) return; // se abrió otro ticket mientras tanto
        estado.activo = detalle;
        pintarChat(false);
    } catch {
        // El sondeo falla en silencio: el siguiente intento lo reintenta.
    }
}

function firmaDe(d: TicketPanelDetalle): string {
    const ultimo = d.mensajes[d.mensajes.length - 1];
    const t = d.ticket;
    return [t.id, t.estado, t.prioridad, t.asignadoId ?? '-', d.mensajes.length, ultimo?.id ?? 0, d.puedeResponder,
        d.puedeTomar, d.estadosPermitidos.join(','), estado.personal.length].join('|');
}

function pintarChat(forzar: boolean): void {
    const d = estado.activo;
    if (!d) return;
    const t = d.ticket;

    porId('chatVacio').classList.add('d-none');
    porId('chatActivo').classList.remove('d-none');
    porId('ticketsLayout').classList.add('chat-abierto');
    porId('chatTitulo').textContent = `#${t.id} · ${t.asunto}`;
    porId('chatSubtitulo').textContent = `${t.categoriaNombre} · abierto ${formatoFechaCorta(t.fechaCreacion)}`;

    const firma = firmaDe(d);
    if (firma === estado.firma && !forzar) return;
    estado.firma = firma;

    pintarAcciones(d);
    pintarDatosUsuario(d);
    pintarMensajes(d.mensajes, forzar);
    pintarPie(d);
    pintarLista();
}

function pintarAcciones(d: TicketPanelDetalle): void {
    const t = d.ticket;
    const cont = porId('chatAcciones');
    const partes: string[] = [`<span class="badge ${COLOR_ESTADO[t.estado]}">${escapeHtml(t.estadoNombre)}</span>`];

    if (d.puedeTomar) {
        partes.push(`<button type="button" class="btn btn-sm btn-primary" data-accion="tomar">${t.asignadoId ? 'Reasignarme' : 'Tomar ticket'}</button>`);
    } else if (t.asignadoNombre) {
        partes.push(`<span class="small text-muted">Lo lleva <strong>${escapeHtml(t.asignadoNombre)}</strong></span>`);
    }

    if (d.estadosPermitidos.length) {
        const opciones = d.estadosPermitidos.map(e => `<option value="${e}">${escapeHtml(NOMBRE_ESTADO[e])}</option>`).join('');
        partes.push(`<label class="sp-campo"><span>Cambiar estado</span>
            <select class="form-select form-select-sm" data-campo="estado"><option value="" selected disabled>Elegir…</option>${opciones}</select></label>`);
    }

    const prioridades = (Object.keys(NOMBRE_PRIORIDAD) as PrioridadTicket[])
        .map(p => `<option value="${p}" ${p === t.prioridad ? 'selected' : ''}>${escapeHtml(NOMBRE_PRIORIDAD[p])}</option>`).join('');
    partes.push(`<label class="sp-campo"><span>Prioridad</span>
        <select class="form-select form-select-sm" data-campo="prioridad">${prioridades}</select></label>`);

    if (esAdmin() && t.estado !== 'CERRADO') {
        const miembros = estado.personal.filter(p => p.activo || p.id === t.asignadoId)
            .map(p => `<option value="${p.id}" ${p.id === t.asignadoId ? 'selected' : ''}>${escapeHtml(p.nombre)}${p.activo ? '' : ' (inactivo)'}</option>`).join('');
        partes.push(`<label class="sp-campo"><span>Asignar a</span>
            <select class="form-select form-select-sm" data-campo="asignacion">
                <option value="" ${t.asignadoId === null ? 'selected' : ''}>Sin asignar</option>${miembros}</select></label>`);
    }
    cont.innerHTML = partes.join('');

    cont.querySelector<HTMLElement>('[data-accion="tomar"]')?.addEventListener('click', () =>
        void ejecutar(`/soporte/panel/tickets/${t.id}/tomar`, {}));
    cont.querySelector<HTMLSelectElement>('[data-campo="estado"]')?.addEventListener('change', e =>
        void ejecutar(`/soporte/panel/tickets/${t.id}/estado`, { estado: (e.target as HTMLSelectElement).value }));
    cont.querySelector<HTMLSelectElement>('[data-campo="prioridad"]')?.addEventListener('change', e =>
        void ejecutar(`/soporte/panel/tickets/${t.id}/prioridad`, { prioridad: (e.target as HTMLSelectElement).value }));
    cont.querySelector<HTMLSelectElement>('[data-campo="asignacion"]')?.addEventListener('change', e => {
        const valor = (e.target as HTMLSelectElement).value;
        void ejecutar(`/soporte/panel/tickets/${t.id}/asignacion`, { personalId: valor ? Number(valor) : null });
    });
}

/** Envía una acción sobre el ticket abierto; el servidor devuelve el ticket actualizado. */
async function ejecutar(endpoint: string, cuerpo: Record<string, unknown>): Promise<void> {
    const alerta = porId('chatAlerta');
    ocultarAlerta(alerta);
    try {
        estado.activo = await soporteFetch<TicketPanelDetalle>(endpoint, { method: 'POST', body: JSON.stringify(cuerpo) });
        estado.firma = '';
        pintarChat(true);
        void cargarLista();
    } catch (error) {
        mostrarAlerta(alerta, mensajeDeError(error));
        estado.firma = ''; // vuelve a pintar los selectores con el valor real
        pintarChat(false);
    }
}

function pintarDatosUsuario(d: TicketPanelDetalle): void {
    const caja = porId('chatDatosUsuario');
    const u = d.usuario;
    const extra = u.correo || u.id !== null
        ? ` · ID ${u.id ?? '—'} · ${escapeHtml(u.correo ?? 'sin correo')} <span class="text-muted">(datos visibles solo para administradores)</span>`
        : '';
    caja.innerHTML = `<i class="bi bi-person" aria-hidden="true"></i> Usuario: <strong>${escapeHtml(u.apodo)}</strong>${extra}`;
    caja.classList.remove('d-none');
}

function pintarMensajes(mensajes: MensajeTicket[], forzarBajar: boolean): void {
    const cont = porId('chatMensajes');
    const pegado = forzarBajar || cont.scrollTop + cont.clientHeight >= cont.scrollHeight - 60;
    let diaAnterior = '';
    cont.innerHTML = mensajes.map(m => {
        const dia = new Date(m.fecha).toLocaleDateString('es-CL', { dateStyle: 'medium' });
        const separador = dia !== diaAnterior ? `<div class="chat-dia">${escapeHtml(dia)}</div>` : '';
        diaAnterior = dia;
        return separador + burbuja(m);
    }).join('');
    if (pegado) cont.scrollTop = cont.scrollHeight;
}

function burbuja(m: MensajeTicket): string {
    if (m.autorTipo === 'SISTEMA') return `<div class="chat-sistema">${escapeHtml(m.contenido)}</div>`;
    // En el panel, lo escrito por el equipo va a la derecha y lo de la persona usuaria a la izquierda.
    const equipo = m.autorTipo === 'PERSONAL';
    return `<div class="chat-burbuja ${equipo ? 'mia' : 'otra'}"><small class="d-block fw-semibold">${escapeHtml(m.autorNombre)}${equipo ? ' · Soporte' : ''}</small>`
        + `${escapeHtml(m.contenido).replace(/\n/g, '<br>')}<small class="d-block chat-hora">${formatoFechaCorta(m.fecha)}</small></div>`;
}

function pintarPie(d: TicketPanelDetalle): void {
    const nota = porId('chatNota');
    porId('formChat').classList.toggle('d-none', !d.puedeResponder);
    nota.classList.toggle('d-none', d.puedeResponder);
    if (d.puedeResponder) return;
    nota.textContent = d.ticket.estado === 'CERRADO'
        ? 'Este ticket está cerrado. Solo un administrador puede reabrirlo.'
        : `Este ticket lo lleva ${d.ticket.asignadoNombre ?? 'otra persona'}. Solo esa persona o un administrador puede responder.`;
}

async function enviarMensaje(): Promise<void> {
    const actual = estado.activo;
    if (!actual || estado.enviando || !actual.puedeResponder) return;
    const caja = porId<HTMLTextAreaElement>('chatTexto');
    const alerta = porId('chatAlerta');
    ocultarAlerta(alerta);
    const contenido = caja.value.trim();
    if (!contenido) return;
    if (contenido.length > MAX_MENSAJE) return mostrarAlerta(alerta, `El mensaje puede tener como máximo ${MAX_MENSAJE} caracteres.`);

    estado.enviando = true;
    try {
        estado.activo = await conBoton(porId<HTMLButtonElement>('btnEnviarMensaje'), '...', () =>
            soporteFetch<TicketPanelDetalle>(`/soporte/panel/tickets/${actual.ticket.id}/mensajes`, {
                method: 'POST', body: JSON.stringify({ contenido }),
            }));
        caja.value = '';
        porId('chatContador').textContent = '0';
        estado.firma = '';
        pintarChat(true);
        void cargarLista();
    } catch (error) {
        mostrarAlerta(alerta, mensajeDeError(error));
    } finally {
        estado.enviando = false;
        caja.focus();
    }
}

// ================================================================ Equipo (ADMIN)

async function cargarEquipo(): Promise<void> {
    const alerta = porId('equipoAlerta');
    ocultarAlerta(alerta);
    try {
        estado.personal = await soporteFetch<PersonalSoporte[]>('/soporte/panel/personal');
        pintarEquipo();
    } catch (error) {
        mostrarAlerta(alerta, mensajeDeError(error, 'No se pudo cargar el equipo.'));
    }
}

function pintarEquipo(): void {
    porId('tablaEquipo').innerHTML = estado.personal.map(p => `
        <tr>
            <td>${escapeHtml(p.nombre)}${p.id === estado.yo?.id ? ' <span class="badge text-bg-light border">tú</span>' : ''}</td>
            <td>${escapeHtml(p.correo)}</td>
            <td><span class="badge ${p.rol === 'ADMIN' ? 'text-bg-primary' : 'text-bg-secondary'}">${escapeHtml(p.rolNombre)}</span></td>
            <td><span class="badge ${p.activo ? 'text-bg-success' : 'text-bg-danger'}">${p.activo ? 'Activo' : 'Desactivado'}</span></td>
            <td class="text-end">${p.ticketsEnCurso}</td>
            <td>${p.ultimoAcceso ? formatoFechaCorta(p.ultimoAcceso) : '—'}</td>
            <td class="text-end"><button type="button" class="btn btn-sm btn-outline-secondary" data-editar="${p.id}">Editar</button></td>
        </tr>`).join('');
    porId('tablaEquipo').querySelectorAll<HTMLElement>('[data-editar]').forEach(b =>
        b.addEventListener('click', () => {
            const persona = estado.personal.find(p => p.id === Number(b.dataset['editar']));
            if (persona) abrirModalPersonal(persona);
        }));
}

function abrirModalPersonal(persona: PersonalSoporte | null): void {
    estado.editando = persona;
    ocultarAlerta(porId('personalAlerta'));
    porId<HTMLFormElement>('formPersonal').reset();
    const esUnoMismo = persona !== null && persona.id === estado.yo?.id;

    porId('modalPersonalTitulo').textContent = persona ? 'Editar integrante' : 'Nuevo integrante';
    porId<HTMLInputElement>('personalNombre').value = persona?.nombre ?? '';
    const correo = porId<HTMLInputElement>('personalCorreo');
    correo.value = persona?.correo ?? '';
    correo.readOnly = persona !== null; // el correo es el identificador de acceso y no se cambia
    const rol = porId<HTMLSelectElement>('personalRol');
    rol.value = persona?.rol ?? 'SOPORTE';
    rol.disabled = esUnoMismo;
    porId('personalContrasenaEtiqueta').textContent = persona ? 'Restablecer contraseña (opcional)' : 'Contraseña';
    porId('personalContrasenaAyuda').textContent = persona
        ? 'Déjala vacía para no cambiarla. 8 a 32 caracteres, con al menos una letra y un número.'
        : 'De 8 a 32 caracteres, con al menos una letra y un número.';
    porId('personalActivoGrupo').classList.toggle('d-none', persona === null);
    const activo = porId<HTMLInputElement>('personalActivo');
    activo.checked = persona?.activo ?? true;
    activo.disabled = esUnoMismo;
    bootstrap.Modal.getOrCreateInstance(porId('modalPersonal')).show();
}

function errorContrasena(c: string): string | null {
    if (c.length < 8 || c.length > 32) return 'La contraseña debe tener entre 8 y 32 caracteres.';
    if (!/\p{L}/u.test(c) || !/\d/.test(c)) return 'La contraseña debe tener al menos una letra y un número.';
    return null;
}

async function guardarPersonal(): Promise<void> {
    const alerta = porId('personalAlerta');
    ocultarAlerta(alerta);
    const editando = estado.editando;
    const nombre = porId<HTMLInputElement>('personalNombre').value.trim();
    const correo = porId<HTMLInputElement>('personalCorreo').value.trim();
    const rol = porId<HTMLSelectElement>('personalRol').value;
    const contrasena = porId<HTMLInputElement>('personalContrasena').value;

    if (nombre.length < 2) return mostrarAlerta(alerta, 'Ingresa el nombre (mínimo 2 caracteres).');
    if (!editando && !correo) return mostrarAlerta(alerta, 'Ingresa el correo.');
    if (!editando || contrasena) {
        const problema = errorContrasena(contrasena);
        if (problema) return mostrarAlerta(alerta, problema);
    }
    try {
        await conBoton(porId<HTMLButtonElement>('btnGuardarPersonal'), 'Guardando...', async () => {
            if (editando) {
                const cuerpo: Record<string, unknown> = { nombre, activo: porId<HTMLInputElement>('personalActivo').checked };
                if (!porId<HTMLSelectElement>('personalRol').disabled) cuerpo['rol'] = rol;
                if (contrasena) cuerpo['contrasena'] = contrasena;
                const actualizado = await soporteFetch<PersonalSoporte>(`/soporte/panel/personal/${editando.id}`, {
                    method: 'PATCH', body: JSON.stringify(cuerpo),
                });
                if (actualizado.id === estado.yo?.id) {
                    estado.yo = actualizado;
                    actualizarPersonalSesion(actualizado);
                    porId('panelNombre').textContent = actualizado.nombre;
                }
            } else {
                await soporteFetch<PersonalSoporte>('/soporte/panel/personal', {
                    method: 'POST', body: JSON.stringify({ nombre, correo, contrasena, rol }),
                });
            }
        });
        bootstrap.Modal.getOrCreateInstance(porId('modalPersonal')).hide();
        estado.firma = '';
        await cargarEquipo();
    } catch (error) {
        mostrarAlerta(alerta, mensajeDeError(error));
    }
}

// ================================================================ Estadísticas (ADMIN)

async function cargarEstadisticas(): Promise<void> {
    const alerta = porId('statsAlerta');
    ocultarAlerta(alerta);
    try {
        pintarEstadisticas(await soporteFetch<Estadisticas>('/soporte/panel/estadisticas'));
    } catch (error) {
        mostrarAlerta(alerta, mensajeDeError(error, 'No se pudieron cargar las estadísticas.'));
    }
}

function tarjeta(titulo: string, valor: number, icono: string): string {
    return `<div class="col-6 col-lg-3"><div class="card sp-tarjeta h-100"><div class="card-body">
        <div class="text-muted small"><i class="bi ${icono}" aria-hidden="true"></i> ${escapeHtml(titulo)}</div>
        <div class="fs-2 fw-semibold">${valor}</div></div></div></div>`;
}

function barras(titulo: string, datos: Record<string, number>, nombres: (clave: string) => string): string {
    const max = Math.max(1, ...Object.values(datos));
    const filas = Object.entries(datos).map(([clave, n]) => `
        <div class="mb-2">
            <div class="d-flex justify-content-between small"><span>${escapeHtml(nombres(clave))}</span><strong>${n}</strong></div>
            <div class="progress" role="progressbar" aria-label="${escapeHtml(nombres(clave))}" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="${max}">
                <div class="progress-bar" style="width: ${Math.round((n / max) * 100)}%"></div>
            </div>
        </div>`).join('');
    return `<div class="col-md-6 col-xl-4"><div class="card h-100"><div class="card-body"><h3 class="h6 mb-3">${escapeHtml(titulo)}</h3>${filas}</div></div></div>`;
}

function pintarEstadisticas(s: Estadisticas): void {
    const nombreCategoria = (c: string): string => estado.categorias.find(x => x.codigo === c)?.nombre ?? c;
    const carga = Object.fromEntries(s.carga.map(c => [c.nombre, c.ticketsEnCurso]));
    porId('statsContenido').innerHTML = `
        <div class="row g-3 mb-3">
            ${tarjeta('Tickets en total', s.totalTickets, 'bi-inboxes')}
            ${tarjeta('Pendientes sin asignar', s.sinAsignar, 'bi-hourglass-split')}
            ${tarjeta('Creados en 7 días', s.creadosUltimos7Dias, 'bi-calendar-week')}
            ${tarjeta('Personal activo', s.personalActivo, 'bi-people')}
        </div>
        <div class="row g-3">
            ${barras('Por estado', s.porEstado, c => NOMBRE_ESTADO[c as EstadoTicket] ?? c)}
            ${barras('Por categoría', s.porCategoria, nombreCategoria)}
            ${barras('Por prioridad', s.porPrioridad, c => NOMBRE_PRIORIDAD[c as PrioridadTicket] ?? c)}
            ${Object.keys(carga).length ? barras('Tickets en curso por persona', carga, c => c) : ''}
        </div>`;
}

// ================================================================ Mi cuenta

async function cambiarContrasena(): Promise<void> {
    const alerta = porId('cuentaAlerta');
    ocultarAlerta(alerta);
    const actual = porId<HTMLInputElement>('contrasenaActual').value;
    const nueva = porId<HTMLInputElement>('contrasenaNueva').value;
    const repetir = porId<HTMLInputElement>('contrasenaRepetir').value;
    if (!actual) return mostrarAlerta(alerta, 'Ingresa tu contraseña actual.');
    const problema = errorContrasena(nueva);
    if (problema) return mostrarAlerta(alerta, problema);
    if (nueva !== repetir) return mostrarAlerta(alerta, 'Las contraseñas nuevas no coinciden.');
    try {
        await conBoton(porId<HTMLButtonElement>('btnCambiarContrasena'), 'Guardando...', () =>
            soporteFetch('/soporte/panel/auth/contrasena', { method: 'POST', body: JSON.stringify({ actual, nueva }) }));
        porId<HTMLFormElement>('formContrasena').reset();
        mostrarAlerta(alerta, 'Contraseña actualizada.', 'success');
    } catch (error) {
        mostrarAlerta(alerta, mensajeDeError(error));
    }
}
