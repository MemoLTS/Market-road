import { apiFetch, esSuperusuario } from './api.js';
import { escapeHtml, formatoFechaCorta, formatoPrecio, mensajeDeError, mostrarAlerta, ocultarAlerta, opcionalPorId, porId, } from './util.js';
const FILAS_POR_PAGINA = 15;
const TICKETS_POR_PAGINA = 15;
/** Tabla con búsqueda y paginación en el cliente sobre la lista completa que entrega la API. */
class TablaAdmin {
    cuerpoId;
    paginacionId;
    columnas;
    vacio;
    filas = [];
    filtro = () => true;
    pagina = 0;
    constructor(cuerpoId, paginacionId, columnas, vacio) {
        this.cuerpoId = cuerpoId;
        this.paginacionId = paginacionId;
        this.columnas = columnas;
        this.vacio = vacio;
    }
    establecer(filas) {
        this.filas = filas;
        this.pagina = 0;
        this.dibujar();
    }
    filtrar(filtro) {
        this.filtro = filtro;
        this.pagina = 0;
        this.dibujar();
    }
    dibujar() {
        const visibles = this.filas.filter(this.filtro);
        const totalPaginas = Math.max(1, Math.ceil(visibles.length / FILAS_POR_PAGINA));
        this.pagina = Math.min(this.pagina, totalPaginas - 1);
        const desde = this.pagina * FILAS_POR_PAGINA;
        const pagina = visibles.slice(desde, desde + FILAS_POR_PAGINA);
        porId(this.cuerpoId).innerHTML = pagina.length === 0
            ? `<tr><td colspan="${this.columnas.length}" class="text-center text-muted py-4">${escapeHtml(this.vacio)}</td></tr>`
            : pagina.map(f => `<tr>${this.columnas.map(c => `<td>${c.celda(f)}</td>`).join('')}</tr>`).join('');
        const nav = porId(this.paginacionId);
        if (visibles.length <= FILAS_POR_PAGINA) {
            nav.innerHTML = `<span class="small text-muted">${visibles.length} registro(s)</span>`;
            return;
        }
        nav.innerHTML = `
            <button type="button" class="btn btn-outline-secondary btn-sm" data-dir="-1" ${this.pagina === 0 ? 'disabled' : ''}>
                <i class="bi bi-chevron-left" aria-hidden="true"></i> Anterior</button>
            <span class="small text-muted">Página ${this.pagina + 1} de ${totalPaginas} · ${visibles.length} registros</span>
            <button type="button" class="btn btn-outline-secondary btn-sm" data-dir="1" ${this.pagina >= totalPaginas - 1 ? 'disabled' : ''}>
                Siguiente <i class="bi bi-chevron-right" aria-hidden="true"></i></button>`;
        nav.querySelectorAll('button[data-dir]').forEach(boton => {
            boton.addEventListener('click', () => {
                this.pagina += Number(boton.dataset['dir']);
                this.dibujar();
            });
        });
    }
}
const COLOR_ESTADO = { ACTIVA: 'success', VENDIDA: 'primary', ELIMINADA: 'secondary' };
const tablaUsuarios = new TablaAdmin('usuariosCuerpo', 'usuariosPaginacion', [
    { celda: u => String(u.id) },
    { celda: u => escapeHtml(`${u.nombre} ${u.apellido}`) },
    { celda: u => (u.apodo ? escapeHtml(u.apodo) : '<span class="text-muted">—</span>') },
    { celda: u => escapeHtml(u.correo) },
    { celda: u => (u.ciudad ? escapeHtml(u.ciudad) : '<span class="text-muted">—</span>') },
    {
        celda: u => (u.rol === 'SUPERUSUARIO'
            ? '<span class="badge text-bg-danger">Superusuario</span>'
            : '<span class="badge text-bg-light border">Usuario</span>'),
    },
], 'No hay usuarios que coincidan.');
const tablaPublicaciones = new TablaAdmin('publicacionesCuerpo', 'publicacionesPaginacion', [
    { celda: p => String(p.id) },
    { celda: p => `<span class="admin-truncar" title="${escapeHtml(p.titulo)}">${escapeHtml(p.titulo)}</span>` },
    { celda: p => escapeHtml(formatoPrecio(p.precio)) },
    { celda: p => escapeHtml(p.categoriaNombre) },
    { celda: p => `<span class="badge text-bg-${COLOR_ESTADO[p.estado] ?? 'secondary'}">${escapeHtml(p.estado)}</span>` },
    { celda: p => `${escapeHtml(p.vendedorApodo ?? 'Sin apodo')} <span class="text-muted small">#${p.usuarioId}</span>` },
    { celda: p => escapeHtml(p.ubicacion) },
    { celda: p => String(p.cantidadImagenes) },
    { celda: p => escapeHtml(formatoFechaCorta(p.fechaCreacion)) },
], 'No hay publicaciones que coincidan.');
const COLOR_ESTADO_TICKET = {
    ABIERTO: 'warning', EN_PROGRESO: 'primary', RESUELTO: 'success', CERRADO: 'secondary',
};
const COLOR_PRIORIDAD_TICKET = {
    BAJA: 'light border', NORMAL: 'light border', ALTA: 'warning', URGENTE: 'danger',
};
let usuarios = [];
let publicaciones = [];
const soporte = { pagina: 0, totalPaginas: 0, total: 0, secuencia: 0, temporizador: 0 };
document.addEventListener('DOMContentLoaded', () => {
    opcionalPorId('btnRecargarAdmin')?.addEventListener('click', () => void cargarDatos());
    opcionalPorId('buscarUsuarios')?.addEventListener('input', aplicarFiltroUsuarios);
    opcionalPorId('buscarPublicaciones')?.addEventListener('input', aplicarFiltroPublicaciones);
    opcionalPorId('filtroEstadoPublicaciones')?.addEventListener('change', aplicarFiltroPublicaciones);
    // Los tickets se filtran y paginan en el servidor: se espera un momento al escribir para no saturarlo.
    opcionalPorId('buscarSoporte')?.addEventListener('input', () => {
        window.clearTimeout(soporte.temporizador);
        soporte.temporizador = window.setTimeout(() => void cargarSoporte(0), 350);
    });
    opcionalPorId('filtroEstadoSoporte')?.addEventListener('change', () => void cargarSoporte(0));
    iniciar();
});
// Si la sesión cambia o expira con la ventana abierta, se vuelve a evaluar el acceso.
window.addEventListener('mr:sesion-cambiada', iniciar);
window.addEventListener('mr:sesion-expirada', iniciar);
function iniciar() {
    const permitido = esSuperusuario();
    opcionalPorId('adminSinAcceso')?.classList.toggle('d-none', permitido);
    opcionalPorId('adminContenido')?.classList.toggle('d-none', !permitido);
    if (permitido)
        void cargarDatos();
}
function normalizar(texto) {
    return texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
function aplicarFiltroUsuarios() {
    const q = normalizar(opcionalPorId('buscarUsuarios')?.value.trim() ?? '');
    tablaUsuarios.filtrar(u => q === ''
        || normalizar(`${u.nombre} ${u.apellido} ${u.apodo ?? ''} ${u.correo} ${u.ciudad ?? ''}`).includes(q));
}
function aplicarFiltroPublicaciones() {
    const q = normalizar(opcionalPorId('buscarPublicaciones')?.value.trim() ?? '');
    const estado = opcionalPorId('filtroEstadoPublicaciones')?.value ?? '';
    tablaPublicaciones.filtrar(p => (estado === '' || p.estado === estado)
        && (q === '' || normalizar(`${p.titulo} ${p.vendedorApodo ?? ''} ${p.categoriaNombre} ${p.ubicacion}`).includes(q)));
}
async function cargarDatos() {
    const alertaUsuarios = opcionalPorId('usuariosAlerta');
    const alertaPublicaciones = opcionalPorId('publicacionesAdminAlerta');
    ocultarAlerta(alertaUsuarios);
    ocultarAlerta(alertaPublicaciones);
    // Cada servicio tiene su propia base de datos: si uno falla, el otro igual se muestra.
    const [resUsuarios, resPublicaciones] = await Promise.allSettled([
        apiFetch('/admin/usuarios'),
        apiFetch('/admin/publicaciones'),
    ]);
    if (resUsuarios.status === 'fulfilled') {
        usuarios = resUsuarios.value;
        tablaUsuarios.establecer(usuarios);
        aplicarFiltroUsuarios();
    }
    else {
        mostrarAlerta(alertaUsuarios, mensajeDeError(resUsuarios.reason, 'No se pudieron cargar los usuarios.'));
    }
    if (resPublicaciones.status === 'fulfilled') {
        publicaciones = resPublicaciones.value;
        tablaPublicaciones.establecer(publicaciones);
        aplicarFiltroPublicaciones();
    }
    else {
        mostrarAlerta(alertaPublicaciones, mensajeDeError(resPublicaciones.reason, 'No se pudieron cargar las publicaciones.'));
    }
    dibujarResumen();
    // El soporte vive en otro servicio y otra base de datos: si falla, el resto del panel sigue funcionando.
    await cargarSoporte(soporte.pagina);
}
function tarjeta(titulo, valor) {
    return `<div class="col-6 col-md-3"><div class="admin-tarjeta">
        <div class="admin-tarjeta-valor">${valor}</div><div class="admin-tarjeta-titulo">${escapeHtml(titulo)}</div>
    </div></div>`;
}
function dibujarResumen() {
    const contar = (estado) => publicaciones.filter(p => p.estado === estado).length;
    porId('adminResumen').innerHTML = [
        tarjeta('Usuarios', usuarios.length),
        tarjeta('Publicaciones activas', contar('ACTIVA')),
        tarjeta('Vendidas', contar('VENDIDA')),
        tarjeta('Eliminadas', contar('ELIMINADA')),
    ].join('');
    porId('contadorUsuarios').textContent = String(usuarios.length);
    porId('contadorPublicaciones').textContent = String(publicaciones.length);
}
// ================================================================ Soporte (solo lectura)
async function cargarSoporte(pagina) {
    const alerta = opcionalPorId('soporteAlerta');
    ocultarAlerta(alerta);
    const secuencia = ++soporte.secuencia;
    const parametros = new URLSearchParams({ pagina: String(pagina), tamano: String(TICKETS_POR_PAGINA) });
    const q = opcionalPorId('buscarSoporte')?.value.trim() ?? '';
    const estado = opcionalPorId('filtroEstadoSoporte')?.value ?? '';
    if (q)
        parametros.set('q', q);
    if (estado)
        parametros.set('estado', estado);
    const [resLista, resResumen] = await Promise.allSettled([
        apiFetch(`/soporte/admin/tickets?${parametros.toString()}`),
        apiFetch('/soporte/admin/tickets/resumen'),
    ]);
    if (secuencia !== soporte.secuencia)
        return; // llegó una búsqueda más nueva
    if (resLista.status === 'fulfilled') {
        soporte.pagina = resLista.value.pagina;
        soporte.totalPaginas = resLista.value.totalPaginas;
        soporte.total = resLista.value.totalElementos;
        dibujarTicketsSoporte(resLista.value.contenido);
    }
    else {
        porId('soporteCuerpo').innerHTML = '';
        porId('soportePaginacion').innerHTML = '';
        mostrarAlerta(alerta, mensajeDeError(resLista.reason, 'No se pudieron cargar los tickets de soporte.'));
    }
    if (resResumen.status === 'fulfilled') {
        const r = resResumen.value;
        porId('contadorSoporte').textContent = String(r.total);
        porId('soporteResumen').textContent = `${r.total} ticket(s) en total · ${r.sinAsignar} activo(s) sin asignar · `
            + `${r.porEstado.ABIERTO ?? 0} abierto(s) · ${r.porEstado.EN_PROGRESO ?? 0} en progreso · `
            + `${r.porEstado.RESUELTO ?? 0} resuelto(s) · ${r.porEstado.CERRADO ?? 0} cerrado(s)`;
    }
}
function dibujarTicketsSoporte(tickets) {
    porId('soporteCuerpo').innerHTML = tickets.length === 0
        ? '<tr><td colspan="9" class="text-center text-muted py-4">No hay tickets que coincidan.</td></tr>'
        : tickets.map(t => `<tr>
            <td>${t.id}</td>
            <td><span class="admin-truncar" title="${escapeHtml(t.asunto)}">${escapeHtml(t.asunto)}</span></td>
            <td>${escapeHtml(t.categoriaNombre)}</td>
            <td><span class="badge text-bg-${COLOR_ESTADO_TICKET[t.estado] ?? 'secondary'}">${escapeHtml(t.estadoNombre)}</span></td>
            <td><span class="badge text-bg-${COLOR_PRIORIDAD_TICKET[t.prioridad] ?? 'light border'}">${escapeHtml(t.prioridadNombre)}</span></td>
            <td>${escapeHtml(t.usuarioApodo)}</td>
            <td>${t.asignadoNombre ? escapeHtml(t.asignadoNombre) : '<span class="text-muted">Sin asignar</span>'}</td>
            <td>${escapeHtml(formatoFechaCorta(t.fechaActualizacion))}</td>
            <td><button type="button" class="btn btn-outline-secondary btn-sm" data-ticket="${t.id}"
                aria-label="Ver el ticket ${t.id}"><i class="bi bi-eye" aria-hidden="true"></i></button></td>
        </tr>`).join('');
    porId('soporteCuerpo').querySelectorAll('button[data-ticket]').forEach(boton => {
        boton.addEventListener('click', () => void abrirTicketSoporte(Number(boton.dataset['ticket'])));
    });
    const nav = porId('soportePaginacion');
    if (soporte.totalPaginas <= 1) {
        nav.innerHTML = `<span class="small text-muted">${soporte.total} registro(s)</span>`;
        return;
    }
    nav.innerHTML = `
        <button type="button" class="btn btn-outline-secondary btn-sm" data-dir="-1" ${soporte.pagina === 0 ? 'disabled' : ''}>
            <i class="bi bi-chevron-left" aria-hidden="true"></i> Anterior</button>
        <span class="small text-muted">Página ${soporte.pagina + 1} de ${soporte.totalPaginas} · ${soporte.total} registros</span>
        <button type="button" class="btn btn-outline-secondary btn-sm" data-dir="1" ${soporte.pagina >= soporte.totalPaginas - 1 ? 'disabled' : ''}>
            Siguiente <i class="bi bi-chevron-right" aria-hidden="true"></i></button>`;
    nav.querySelectorAll('button[data-dir]').forEach(boton => {
        boton.addEventListener('click', () => void cargarSoporte(soporte.pagina + Number(boton.dataset['dir'])));
    });
}
async function abrirTicketSoporte(id) {
    const alerta = opcionalPorId('ticketSoporteAlerta');
    ocultarAlerta(alerta);
    porId('tituloTicketSoporte').textContent = `Ticket #${id}`;
    porId('ticketSoporteDatos').textContent = 'Cargando...';
    porId('ticketSoporteMensajes').innerHTML = '';
    bootstrap.Modal.getOrCreateInstance(porId('modalTicketSoporte')).show();
    try {
        const detalle = await apiFetch(`/soporte/admin/tickets/${id}`);
        const t = detalle.ticket;
        porId('tituloTicketSoporte').textContent = `Ticket #${t.id} · ${t.asunto}`;
        const persona = detalle.usuario.correo
            ? `${detalle.usuario.apodo} (#${detalle.usuario.id ?? '—'} · ${detalle.usuario.correo})`
            : detalle.usuario.apodo;
        porId('ticketSoporteDatos').innerHTML = `${escapeHtml(t.categoriaNombre)} · ${escapeHtml(t.estadoNombre)} · `
            + `Prioridad ${escapeHtml(t.prioridadNombre)}<br>Abierto por ${escapeHtml(persona)} · Atiende: `
            + `${t.asignadoNombre ? escapeHtml(t.asignadoNombre) : 'sin asignar'}`;
        porId('ticketSoporteMensajes').innerHTML = detalle.mensajes.map(m => {
            const clase = m.autorTipo === 'SISTEMA' ? 'text-bg-light border text-muted fst-italic'
                : m.autorTipo === 'PERSONAL' ? 'text-bg-primary' : 'text-bg-secondary';
            const alineacion = m.autorTipo === 'PERSONAL' ? 'align-self-end' : 'align-self-start';
            return `<div class="${alineacion} rounded p-2 ${clase}" style="max-width:85%">
                <div class="small opacity-75">${escapeHtml(m.autorNombre)} · ${escapeHtml(formatoFechaCorta(m.fecha))}</div>
                <div style="white-space:pre-wrap">${escapeHtml(m.contenido)}</div></div>`;
        }).join('');
    }
    catch (error) {
        porId('ticketSoporteDatos').textContent = '';
        mostrarAlerta(alerta, mensajeDeError(error, 'No se pudo cargar el ticket.'));
    }
}
