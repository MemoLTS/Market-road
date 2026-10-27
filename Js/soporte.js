import { ApiError, apiFetch, obtenerSesion } from './api.js';
import { conBoton, escapeHtml, formatoFechaCorta, mensajeDeError, mostrarAlerta, ocultarAlerta, porId, } from './util.js';
const INTERVALO_LISTA_MS = 10000;
const INTERVALO_CHAT_MS = 5000;
const MAX_MENSAJE = 1000;
const MAX_ASUNTO = 120;
const MIN_ASUNTO = 3;
const COLOR_ESTADO = {
    ABIERTO: 'text-bg-warning',
    EN_PROGRESO: 'text-bg-primary',
    RESUELTO: 'text-bg-success',
    CERRADO: 'text-bg-secondary',
};
const estado = {
    tickets: [],
    categorias: [],
    activo: null,
    firma: '',
    enviando: false,
};
document.addEventListener('DOMContentLoaded', () => {
    if (!obtenerSesion()) {
        porId('soporteSinSesion').classList.remove('d-none');
        return;
    }
    porId('soporteLayout').classList.remove('d-none');
    configurarEventos();
    void iniciar();
    setInterval(() => { if (!document.hidden)
        void cargarLista(); }, INTERVALO_LISTA_MS);
    setInterval(() => { if (!document.hidden && estado.activo)
        void refrescarChat(); }, INTERVALO_CHAT_MS);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            void cargarLista();
            if (estado.activo)
                void refrescarChat();
        }
    });
    window.addEventListener('mr:sesion-expirada', () => { window.location.href = 'index.html'; });
});
async function iniciar() {
    await Promise.all([cargarCategorias(), cargarLista()]);
    // Permite enlazar directo a un ticket: soporte.html?ticket=12
    const id = Number(new URLSearchParams(window.location.search).get('ticket'));
    if (Number.isInteger(id) && id > 0)
        await abrirTicket(id);
}
function configurarEventos() {
    porId('btnNuevoTicket').addEventListener('click', abrirModalNuevoTicket);
    porId('formNuevoTicket').addEventListener('submit', e => { e.preventDefault(); void crearTicket(); });
    porId('ticketMensaje').addEventListener('input', () => {
        porId('ticketContador').textContent = String(porId('ticketMensaje').value.length);
    });
    porId('formChat').addEventListener('submit', e => { e.preventDefault(); void enviarMensaje(); });
    const texto = porId('chatTexto');
    texto.addEventListener('input', () => { porId('chatContador').textContent = String(texto.value.length); });
    texto.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            void enviarMensaje();
        }
    });
    porId('btnCerrarTicket').addEventListener('click', () => void cerrarTicket());
    porId('btnVolverLista').addEventListener('click', () => {
        porId('soporteLayout').classList.remove('chat-abierto');
    });
}
// ---------------------------------------------------------------- Lista
async function cargarCategorias() {
    try {
        estado.categorias = await apiFetch('/soporte/categorias');
        porId('ticketCategoria').innerHTML = estado.categorias
            .map(c => `<option value="${escapeHtml(c.codigo)}">${escapeHtml(c.nombre)}</option>`).join('');
    }
    catch (error) {
        console.error('No se pudieron cargar las categorías', error);
    }
}
async function cargarLista() {
    try {
        estado.tickets = await apiFetch('/soporte/tickets');
        pintarLista();
    }
    catch (error) {
        if (error instanceof ApiError && error.status === 401)
            return;
        porId('listaTickets').innerHTML = `<p class="text-danger p-3 mb-0">${escapeHtml(mensajeDeError(error, 'No se pudieron cargar tus tickets.'))}</p>`;
    }
}
function pintarLista() {
    const lista = porId('listaTickets');
    if (!estado.tickets.length) {
        lista.innerHTML = '<p class="text-muted p-3 mb-0">Aún no tienes tickets. Si necesitas ayuda, abre uno con «Nuevo ticket».</p>';
        return;
    }
    const activoId = estado.activo?.ticket.id;
    lista.innerHTML = estado.tickets.map(t => `
        <button type="button" class="bandeja-item ${activoId === t.id ? 'activa' : ''}" data-ticket="${t.id}">
            <span class="bandeja-texto">
                <span class="d-flex justify-content-between gap-2">
                    <strong class="text-truncate">${escapeHtml(t.asunto)}</strong>
                    ${t.noLeidos ? `<span class="badge text-bg-danger">${t.noLeidos}</span>` : ''}
                </span>
                <span class="d-flex gap-1 align-items-center my-1">
                    <span class="badge ${COLOR_ESTADO[t.estado]}">${escapeHtml(t.estadoNombre)}</span>
                    <small class="text-muted text-truncate">${escapeHtml(t.categoriaNombre)} · #${t.id}</small>
                </span>
                <small class="d-block text-muted text-truncate">${escapeHtml(t.ultimoMensaje ?? '')}</small>
            </span>
        </button>`).join('');
    lista.querySelectorAll('[data-ticket]').forEach(b => b.addEventListener('click', () => void abrirTicket(Number(b.dataset['ticket']))));
}
// ---------------------------------------------------------------- Nuevo ticket
function abrirModalNuevoTicket() {
    ocultarAlerta(porId('ticketAlerta'));
    porId('formNuevoTicket').reset();
    porId('ticketContador').textContent = '0';
    bootstrap.Modal.getOrCreateInstance(porId('modalNuevoTicket')).show();
}
async function crearTicket() {
    const alerta = porId('ticketAlerta');
    ocultarAlerta(alerta);
    const categoria = porId('ticketCategoria').value;
    const asunto = porId('ticketAsunto').value.trim();
    const mensaje = porId('ticketMensaje').value.trim();
    if (!categoria)
        return mostrarAlerta(alerta, 'Elige una categoría.');
    if (asunto.length < MIN_ASUNTO)
        return mostrarAlerta(alerta, `El asunto debe tener al menos ${MIN_ASUNTO} caracteres.`);
    if (asunto.length > MAX_ASUNTO)
        return mostrarAlerta(alerta, `El asunto puede tener como máximo ${MAX_ASUNTO} caracteres.`);
    if (!mensaje)
        return mostrarAlerta(alerta, 'Cuéntanos qué necesitas.');
    if (mensaje.length > MAX_MENSAJE)
        return mostrarAlerta(alerta, `El mensaje puede tener como máximo ${MAX_MENSAJE} caracteres.`);
    try {
        const detalle = await conBoton(porId('btnEnviarTicket'), 'Enviando...', () => apiFetch('/soporte/tickets', { method: 'POST', body: JSON.stringify({ asunto, categoria, mensaje }) }));
        bootstrap.Modal.getOrCreateInstance(porId('modalNuevoTicket')).hide();
        estado.activo = detalle;
        estado.firma = '';
        await cargarLista();
        pintarChat(true);
    }
    catch (error) {
        mostrarAlerta(alerta, mensajeDeError(error));
    }
}
// ---------------------------------------------------------------- Chat
async function abrirTicket(id) {
    try {
        estado.activo = await apiFetch(`/soporte/tickets/${id}`);
        estado.firma = '';
        pintarChat(true);
        void cargarLista(); // actualiza el contador de no leídos
    }
    catch (error) {
        estado.activo = null;
        porId('chatVacio').classList.remove('d-none');
        porId('chatActivo').classList.add('d-none');
        const aviso = mensajeDeError(error, 'No se pudo abrir el ticket.');
        porId('chatVacio').querySelector('p').textContent = aviso;
    }
}
async function refrescarChat() {
    const actual = estado.activo;
    if (!actual)
        return;
    try {
        const detalle = await apiFetch(`/soporte/tickets/${actual.ticket.id}`);
        estado.activo = detalle;
        pintarChat(false);
    }
    catch {
        // El sondeo falla en silencio: el siguiente intento lo reintenta.
    }
}
function pintarChat(forzarBajar) {
    const detalle = estado.activo;
    if (!detalle)
        return;
    const t = detalle.ticket;
    porId('chatVacio').classList.add('d-none');
    porId('chatActivo').classList.remove('d-none');
    porId('soporteLayout').classList.add('chat-abierto');
    porId('chatTitulo').textContent = t.asunto;
    porId('chatSubtitulo').textContent = `#${t.id} · ${t.categoriaNombre} · ${t.estadoNombre}`;
    porId('btnCerrarTicket').classList.toggle('d-none', t.estado === 'CERRADO');
    porId('formChat').classList.toggle('d-none', !detalle.puedeEscribir);
    porId('chatCerrado').classList.toggle('d-none', detalle.puedeEscribir);
    const ultimo = detalle.mensajes[detalle.mensajes.length - 1];
    const firma = `${t.id}|${t.estado}|${detalle.mensajes.length}|${ultimo?.id ?? 0}`;
    if (firma === estado.firma && !forzarBajar)
        return;
    estado.firma = firma;
    const cont = porId('chatMensajes');
    const pegado = forzarBajar || cont.scrollTop + cont.clientHeight >= cont.scrollHeight - 60;
    let diaAnterior = '';
    cont.innerHTML = detalle.mensajes.map(m => {
        const dia = new Date(m.fecha).toLocaleDateString('es-CL', { dateStyle: 'medium' });
        const separador = dia !== diaAnterior ? `<div class="chat-dia">${escapeHtml(dia)}</div>` : '';
        diaAnterior = dia;
        return separador + burbuja(m);
    }).join('');
    if (pegado)
        cont.scrollTop = cont.scrollHeight;
    pintarLista();
}
function burbuja(m) {
    if (m.autorTipo === 'SISTEMA')
        return `<div class="chat-sistema">${escapeHtml(m.contenido)}</div>`;
    const mio = m.autorTipo === 'USUARIO';
    const quien = mio ? '' : `<small class="d-block fw-semibold">${escapeHtml(m.autorNombre)} · Soporte</small>`;
    return `<div class="chat-burbuja ${mio ? 'mia' : 'otra'}">${quien}${escapeHtml(m.contenido).replace(/\n/g, '<br>')}`
        + `<small class="d-block chat-hora">${formatoFechaCorta(m.fecha)}</small></div>`;
}
async function enviarMensaje() {
    const actual = estado.activo;
    if (!actual || estado.enviando)
        return;
    const caja = porId('chatTexto');
    const alerta = porId('chatAlerta');
    ocultarAlerta(alerta);
    const contenido = caja.value.trim();
    if (!contenido)
        return;
    if (contenido.length > MAX_MENSAJE)
        return mostrarAlerta(alerta, `El mensaje puede tener como máximo ${MAX_MENSAJE} caracteres.`);
    estado.enviando = true;
    try {
        estado.activo = await conBoton(porId('btnEnviarMensaje'), '...', () => apiFetch(`/soporte/tickets/${actual.ticket.id}/mensajes`, {
            method: 'POST', body: JSON.stringify({ contenido }),
        }));
        caja.value = '';
        porId('chatContador').textContent = '0';
        pintarChat(true);
        void cargarLista();
    }
    catch (error) {
        mostrarAlerta(alerta, mensajeDeError(error));
    }
    finally {
        estado.enviando = false;
        caja.focus();
    }
}
async function cerrarTicket() {
    const actual = estado.activo;
    if (!actual)
        return;
    if (!window.confirm('¿Cerrar este ticket? Ya no podrás escribir en él, pero podrás abrir uno nuevo.'))
        return;
    const alerta = porId('chatAlerta');
    ocultarAlerta(alerta);
    try {
        estado.activo = await apiFetch(`/soporte/tickets/${actual.ticket.id}/cierre`, { method: 'POST' });
        pintarChat(true);
        void cargarLista();
    }
    catch (error) {
        mostrarAlerta(alerta, mensajeDeError(error));
    }
}
