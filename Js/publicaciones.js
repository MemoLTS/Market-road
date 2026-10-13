import { apiFetch, obtenerSesion, urlAbsoluta } from './api.js';
import { montarPanelContacto } from './contacto.js';
import { buscarLugarEnCoordenadas, buscarLugares } from './geocodificacion.js';
import { conBoton, escapeHtml, formatoPrecio, mensajeDeError, mostrarAlerta, obtenerUbicacion, ocultarAlerta, opcionalPorId, porId, } from './util.js';
import { LIMITES, primerError, validarCoordenadas, validarDescripcion, validarFotos, validarMonto, validarRangoPrecios, validarTitulo, validarUbicacion, } from './validaciones.js';
const FILAS_POR_PAGINA = 6;
const ORDENES = ['RELEVANCIA', 'PRECIO_ASC', 'PRECIO_DESC', 'DISTANCIA', 'RECIENTES'];
const estado = {
    q: '', categorias: new Set(), precioMin: '', precioMax: '', orden: 'RELEVANCIA',
    radioKm: '', ubicacion: null, pagina: 0, soloMias: false,
};
/** Única tarjeta de ejemplo: ocupa el primer lugar y las publicaciones nuevas se agregan a continuación. */
const EJEMPLO = { titulo: 'Tu primera publicación', precio: 185000, ubicacion: 'Cerca de ti' };
const IMAGEN_EJEMPLO = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">'
    + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0" stop-color="#8ec5ff"/><stop offset="1" stop-color="#1877f2"/></linearGradient></defs>'
    + '<rect width="400" height="400" fill="url(#g)"/>'
    + '<g fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">'
    + '<circle cx="130" cy="250" r="55"/><circle cx="280" cy="250" r="55"/>'
    + '<path d="M130 250 L180 160 H250 L280 250 M180 160 L210 250 H130 M245 125 H290"/></g>'
    + '<text x="200" y="352" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" fill="#fff">Ejemplo</text>'
    + '</svg>');
let lugarPublicacion = null;
let resultadosLugar = [];
let temporizadorBusquedaLugar = null;
let solicitudBusquedaLugar = null;
let mapaPublicacion = null;
let marcadorPublicacion = null;
let secuenciaCarga = 0; // descarta respuestas viejas si el usuario cambia filtros rápido
let tamanoPaginaActual = 0;
let temporizadorCambioAncho = null;
document.addEventListener('DOMContentLoaded', async () => {
    await cargarCategorias();
    void cargarPublicaciones();
    actualizarBotonPublicar();
    opcionalPorId('formPublicacion')?.addEventListener('submit', crearPublicacion);
    opcionalPorId('publicacionFotos')?.addEventListener('change', previsualizarFotos);
    document.querySelectorAll('#grupoModalidadesEntrega input[name="modalidadesEntrega"]')
        .forEach(input => input.addEventListener('change', actualizarEstadoModalidades));
    opcionalPorId('formFiltros')?.addEventListener('submit', e => {
        e.preventDefault();
        if (aplicarFiltros()) {
            ocultarPanelFiltros();
        }
    });
    opcionalPorId('btnLimpiarFiltros')?.addEventListener('click', limpiarFiltros);
    opcionalPorId('btnUbicacion')?.addEventListener('click', compartirUbicacion);
    opcionalPorId('btnUbicacionPublicacion')?.addEventListener('click', ubicacionParaPublicacion);
    opcionalPorId('btnMapaPublicacion')?.addEventListener('click', alternarMapaPublicacion);
    opcionalPorId('btnCerrarMapaPublicacion')?.addEventListener('click', cerrarMapaPublicacion);
    opcionalPorId('publicacionUbicacion')?.addEventListener('input', buscarUbicacionPublicacion);
    opcionalPorId('resultadosUbicacionPublicacion')?.addEventListener('click', seleccionarResultadoUbicacion);
    opcionalPorId('formPublicacion')?.addEventListener('reset', limpiarUbicacionPublicacion);
    opcionalPorId('btnMisPublicaciones')?.addEventListener('click', alternarMisPublicaciones);
    const alCambiarSesion = () => {
        actualizarBotonPublicar();
        if (estado.soloMias && !obtenerSesion()) {
            estado.soloMias = false;
            void cargarPublicaciones();
        }
    };
    window.addEventListener('mr:sesion-expirada', alCambiarSesion);
    window.addEventListener('mr:sesion-cambiada', alCambiarSesion);
    window.addEventListener('resize', () => {
        if (temporizadorCambioAncho)
            clearTimeout(temporizadorCambioAncho);
        temporizadorCambioAncho = setTimeout(() => {
            if (estado.soloMias || !tamanoPaginaActual || tamanoPaginaActual === obtenerTamanoPagina())
                return;
            estado.pagina = 0;
            void cargarPublicaciones();
        }, 150);
    });
});
// ------------------------------------------------------------ catálogo
async function cargarCategorias() {
    let categorias = [];
    let errorCarga = null;
    try {
        categorias = await apiFetch('/publicaciones/categorias');
    }
    catch (error) {
        errorCarga = error;
    }
    const cont = opcionalPorId('filtroCategorias');
    if (cont) {
        cont.innerHTML = categorias.map(c => `
            <input type="checkbox" class="btn-check" id="cat-${escapeHtml(c.codigo)}" value="${escapeHtml(c.codigo)}" autocomplete="off">
            <label class="btn btn-sm btn-outline-secondary" for="cat-${escapeHtml(c.codigo)}">${escapeHtml(c.nombre)}</label>`).join('');
    }
    const select = opcionalPorId('publicacionCategoria');
    if (select) {
        select.innerHTML = '<option value="" selected disabled>Selecciona una categoría</option>'
            + categorias.map(c => `<option value="${escapeHtml(c.codigo)}">${escapeHtml(c.nombre)}</option>`).join('');
        if (errorCarga) {
            mostrarAlerta(opcionalPorId('publicacionModalAlerta'), mensajeDeError(errorCarga, 'No se pudieron cargar las categorías. Inténtalo nuevamente.'));
        }
        else if (!categorias.length) {
            mostrarAlerta(opcionalPorId('publicacionModalAlerta'), 'No hay categorías disponibles para publicar.');
        }
    }
}
function leerFiltros() {
    estado.q = porId('filtroTexto').value.trim();
    estado.precioMin = porId('filtroPrecioMin').value.trim();
    estado.precioMax = porId('filtroPrecioMax').value.trim();
    const orden = porId('filtroOrden').value;
    estado.orden = ORDENES.includes(orden) ? orden : 'RELEVANCIA';
    estado.radioKm = porId('filtroRadio').value;
    estado.categorias = new Set(Array.from(document.querySelectorAll('#filtroCategorias input:checked')).map(i => i.value));
}
function aplicarFiltros() {
    leerFiltros();
    const alerta = opcionalPorId('filtroAlerta');
    ocultarAlerta(alerta);
    const error = primerError(estado.q.length > LIMITES.titulo.max ? `La búsqueda puede tener como máximo ${LIMITES.titulo.max} caracteres.` : null, validarRangoPrecios(estado.precioMin, estado.precioMax));
    if (error) {
        mostrarAlerta(alerta, error);
        return false;
    }
    if ((estado.orden === 'DISTANCIA' || estado.radioKm) && !estado.ubicacion) {
        mostrarAlerta(alerta, 'Para ordenar o filtrar por distancia primero comparte tu ubicación.');
        porId('filtroOrden').value = estado.orden = 'RELEVANCIA';
        porId('filtroRadio').value = estado.radioKm = '';
        return false;
    }
    estado.soloMias = false;
    estado.pagina = 0;
    void cargarPublicaciones();
    return true;
}
function limpiarFiltros() {
    porId('formFiltros').reset();
    document.querySelectorAll('#filtroCategorias input').forEach(i => { i.checked = false; });
    estado.ubicacion = null;
    porId('estadoUbicacion').textContent = 'Comparte tu ubicación para ordenar por distancia.';
    porId('grupoRadio').classList.add('d-none');
    if (aplicarFiltros()) {
        ocultarPanelFiltros();
    }
}
function ocultarPanelFiltros() {
    const panel = opcionalPorId('panelFiltros');
    if (panel)
        bootstrap.Collapse.getOrCreateInstance(panel).hide();
}
async function compartirUbicacion() {
    const texto = porId('estadoUbicacion');
    texto.textContent = 'Obteniendo ubicación...';
    try {
        const u = await obtenerUbicacion();
        const error = validarCoordenadas(u.lat, u.lon);
        if (error)
            throw new Error(error);
        estado.ubicacion = u;
        texto.textContent = 'Ubicación compartida: las distancias se muestran en cada publicación.';
        porId('grupoRadio').classList.remove('d-none');
        porId('filtroOrden').value = 'DISTANCIA';
        aplicarFiltros();
    }
    catch (e) {
        texto.textContent = mensajeDeError(e);
    }
}
function alternarMisPublicaciones() {
    if (!obtenerSesion())
        return;
    estado.soloMias = !estado.soloMias;
    estado.pagina = 0;
    void cargarPublicaciones();
}
function construirQuery() {
    const p = new URLSearchParams();
    if (estado.q)
        p.set('q', estado.q);
    estado.categorias.forEach(c => p.append('categoria', c));
    if (estado.precioMin !== '')
        p.set('precioMin', estado.precioMin);
    if (estado.precioMax !== '')
        p.set('precioMax', estado.precioMax);
    if (estado.ubicacion) {
        p.set('lat', String(estado.ubicacion.lat));
        p.set('lon', String(estado.ubicacion.lon));
        if (estado.radioKm)
            p.set('radioKm', estado.radioKm);
    }
    p.set('orden', estado.orden);
    p.set('pagina', String(estado.pagina));
    const tamano = obtenerTamanoPagina();
    tamanoPaginaActual = tamano;
    p.set('tamano', String(tamano));
    return p.toString();
}
function obtenerTamanoPagina() {
    const contenedor = opcionalPorId('contenedor-publicaciones');
    if (!contenedor)
        return 4 * FILAS_POR_PAGINA;
    const cantidadColumnas = getComputedStyle(contenedor).gridTemplateColumns.split(/\s+/).filter(Boolean).length;
    return Math.max(1, cantidadColumnas) * FILAS_POR_PAGINA;
}
function hayFiltrosActivos() {
    return Boolean(estado.q || estado.categorias.size || estado.precioMin || estado.precioMax
        || estado.ubicacion || estado.radioKm || estado.orden !== 'RELEVANCIA');
}
/** El ejemplo solo se muestra en el listado general (sin filtros, sin "mis publicaciones", primera página). */
function mostrarEjemplo() {
    return !estado.soloMias && estado.pagina === 0 && !hayFiltrosActivos();
}
function renderEjemplo() {
    return `
        <article class="mk-card mk-card-ejemplo" role="button" tabindex="0" data-ejemplo="true"
            aria-label="Ejemplo de publicación. Pulsa para crear la tuya">
            <div class="mk-img">
                <img src="${IMAGEN_EJEMPLO}" alt="Ejemplo de publicación">
                <span class="mk-badge">Ejemplo</span>
            </div>
            <div class="mk-info">
                <span class="mk-price">${formatoPrecio(EJEMPLO.precio)}</span>
                <span class="mk-title">${escapeHtml(EJEMPLO.titulo)}</span>
                <span class="mk-loc"><i class="bi bi-geo-alt" aria-hidden="true"></i> ${escapeHtml(EJEMPLO.ubicacion)}</span>
            </div>
        </article>`;
}
function renderMensaje(html, tipo = 'info') {
    return `<div class="mk-mensaje mk-mensaje-${tipo}" role="${tipo === 'error' ? 'alert' : 'status'}">${html}</div>`;
}
function abrirCrearPublicacion() {
    const modal = obtenerSesion() ? 'modalPublicacion' : 'modalLogin';
    const el = opcionalPorId(modal);
    if (el)
        bootstrap.Modal.getOrCreateInstance(el).show();
}
async function cargarPublicaciones() {
    const contenedor = opcionalPorId('contenedor-publicaciones');
    const resumen = opcionalPorId('resumenCatalogo');
    const paginacion = opcionalPorId('paginacionCatalogo');
    if (!contenedor || !resumen || !paginacion)
        return;
    const mio = ++secuenciaCarga;
    const ejemplo = mostrarEjemplo() ? renderEjemplo() : '';
    contenedor.innerHTML = ejemplo + renderMensaje('Cargando publicaciones...');
    paginacion.innerHTML = '';
    activarEjemplo(contenedor);
    try {
        let lista;
        let pagina = null;
        if (estado.soloMias) {
            lista = await apiFetch('/publicaciones/mias');
            if (mio !== secuenciaCarga)
                return;
            resumen.textContent = `Mis publicaciones (${lista.length})`;
        }
        else {
            pagina = await apiFetch(`/publicaciones?${construirQuery()}`);
            if (mio !== secuenciaCarga)
                return;
            lista = pagina.contenido;
            resumen.textContent = `${pagina.total} resultado${pagina.total === 1 ? '' : 's'}`;
        }
        if (!lista.length) {
            contenedor.innerHTML = ejemplo + renderMensaje(ejemplo
                ? 'Aún no hay publicaciones. La tuya aparecerá justo al lado de este ejemplo.'
                : 'No se encontraron publicaciones con esos criterios.');
            activarEjemplo(contenedor);
            return;
        }
        // Ejemplo primero y las publicaciones a continuación; la grilla las baja de fila sola al llenarse.
        contenedor.innerHTML = ejemplo + lista.map(renderPublicacion).join('');
        activarEjemplo(contenedor);
        contenedor.querySelectorAll('[data-publicacion-id]').forEach(card => {
            const abrir = () => { void abrirDetalle(Number(card.dataset['publicacionId'])); };
            card.addEventListener('click', abrir);
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    abrir();
                }
            });
        });
        if (pagina)
            renderPaginacion(pagina, paginacion);
    }
    catch (e) {
        if (mio !== secuenciaCarga)
            return;
        contenedor.innerHTML = ejemplo
            + renderMensaje(escapeHtml(mensajeDeError(e, 'No se pudieron cargar las publicaciones.')), 'error');
        activarEjemplo(contenedor);
    }
}
function activarEjemplo(contenedor) {
    const tarjeta = contenedor.querySelector('[data-ejemplo]');
    if (!tarjeta)
        return;
    tarjeta.addEventListener('click', abrirCrearPublicacion);
    tarjeta.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            abrirCrearPublicacion();
        }
    });
}
function renderPaginacion(pagina, nav) {
    if (pagina.totalPaginas <= 0)
        return;
    const totalPaginas = pagina.totalPaginas;
    const paginaActual = Math.min(pagina.pagina + 1, totalPaginas);
    const maximoVisible = 5;
    const inicio = Math.max(1, Math.min(paginaActual - 2, totalPaginas - maximoVisible + 1));
    const fin = Math.min(totalPaginas, inicio + maximoVisible - 1);
    const botones = (numero) => `
        <button class="btn btn-sm ${numero === paginaActual ? 'btn-primary' : 'btn-outline-secondary'}"
            type="button" data-pagina="${numero - 1}" aria-label="Página ${numero}"
            ${numero === paginaActual ? 'aria-current="page"' : ''}>${numero}</button>`;
    const numeros = Array.from({ length: fin - inicio + 1 }, (_, indice) => inicio + indice);
    nav.innerHTML = `
        ${inicio > 1 ? `${botones(1)}${inicio > 2 ? '<span class="mk-paginacion-puntos" aria-hidden="true">…</span>' : ''}` : ''}
        ${numeros.map(botones).join('')}
        ${fin < totalPaginas ? `${fin < totalPaginas - 1 ? '<span class="mk-paginacion-puntos" aria-hidden="true">…</span>' : ''}${botones(totalPaginas)}` : ''}`;
    nav.querySelectorAll('[data-pagina]').forEach(boton => {
        boton.addEventListener('click', () => {
            estado.pagina = Number(boton.dataset['pagina']);
            void cargarPublicaciones();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}
function renderPublicacion(p) {
    const src = p.imagenUrls[0] ? urlAbsoluta(p.imagenUrls[0]) : '';
    const vendida = p.estado === 'VENDIDA' ? '<span class="mk-badge mk-badge-vendida">Vendida</span>' : '';
    const distancia = p.distanciaKm != null ? ` · ${p.distanciaKm} km` : '';
    const modalidades = (p.modalidadesEntrega ?? []).map(modalidad => modalidad.nombre).join(' · ');
    return `
        <article class="mk-card" role="button" tabindex="0" data-publicacion-id="${p.id}"
            aria-label="Ver detalles de ${escapeHtml(p.titulo)}">
            <div class="mk-img">
                ${src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(p.titulo)}" loading="lazy">`
        : '<div class="mk-sin-imagen"><i class="bi bi-image" aria-hidden="true"></i></div>'}
                ${vendida}
            </div>
            <div class="mk-info">
                <span class="mk-category">${escapeHtml(p.categoriaNombre || 'Otros')}</span>
                <span class="mk-price">${formatoPrecio(p.precio)}</span>
                <span class="mk-title" title="${escapeHtml(p.titulo)}">${escapeHtml(p.titulo)}</span>
                <span class="mk-loc"><i class="bi bi-geo-alt" aria-hidden="true"></i> ${escapeHtml(p.ubicacion)}${distancia}</span>
                <span class="mk-delivery" title="${escapeHtml(modalidades)}"><i class="bi bi-box-seam" aria-hidden="true"></i> ${escapeHtml(modalidades || 'Modalidad no informada')}</span>
            </div>
        </article>`;
}
// ------------------------------------------------------------ crear publicación
async function ubicacionParaPublicacion() {
    const texto = porId('estadoUbicacionPublicacion');
    texto.textContent = 'Obteniendo ubicación y buscando la ciudad o pueblo más cercano...';
    try {
        const ubicacion = await obtenerUbicacion();
        await seleccionarCoordenadas(ubicacion);
    }
    catch (e) {
        texto.textContent = mensajeDeError(e);
    }
}
function buscarUbicacionPublicacion() {
    lugarPublicacion = null;
    resultadosLugar = [];
    const texto = porId('estadoUbicacionPublicacion');
    const consulta = porId('publicacionUbicacion').value.trim();
    const resultados = porId('resultadosUbicacionPublicacion');
    texto.textContent = consulta ? 'Selecciona una ciudad o pueblo de los resultados.' : 'Selecciona una ciudad o pueblo para definir la zona.';
    resultados.replaceChildren();
    solicitudBusquedaLugar?.abort();
    if (temporizadorBusquedaLugar)
        clearTimeout(temporizadorBusquedaLugar);
    if (consulta.length < 2)
        return;
    temporizadorBusquedaLugar = setTimeout(() => {
        const solicitud = new AbortController();
        solicitudBusquedaLugar = solicitud;
        texto.textContent = 'Buscando ciudades y pueblos...';
        void buscarLugares(consulta, solicitud.signal).then(lugares => {
            if (solicitud.signal.aborted)
                return;
            resultadosLugar = lugares;
            if (!lugares.length) {
                texto.textContent = 'No encontramos una ciudad o pueblo real con ese nombre. Prueba otra búsqueda o el mapa.';
                return;
            }
            resultados.innerHTML = lugares.map((lugar, indice) => `
                <button type="button" class="list-group-item list-group-item-action"
                    role="option" data-lugar-indice="${indice}">${escapeHtml(lugar.nombre)}</button>`).join('');
            texto.textContent = 'Elige una ubicación de la lista para confirmarla.';
        }).catch(error => {
            if (solicitud.signal.aborted)
                return;
            texto.textContent = mensajeDeError(error, 'No se pudieron buscar ciudades y pueblos.');
        });
    }, 1000);
}
function seleccionarResultadoUbicacion(event) {
    const boton = event.target.closest('[data-lugar-indice]');
    if (!boton)
        return;
    const indice = Number(boton.dataset['lugarIndice']);
    const lugar = resultadosLugar[indice];
    if (lugar)
        establecerLugarPublicacion(lugar);
}
function establecerLugarPublicacion(lugar) {
    lugarPublicacion = lugar;
    porId('publicacionUbicacion').value = lugar.nombre;
    porId('resultadosUbicacionPublicacion').replaceChildren();
    porId('estadoUbicacionPublicacion').textContent = `Zona seleccionada: ${lugar.nombre}.`;
    if (mapaPublicacion) {
        mapaPublicacion.setView([lugar.ubicacion.lat, lugar.ubicacion.lon], 13);
        colocarMarcadorPublicacion(lugar.ubicacion, lugar.nombre);
    }
}
async function seleccionarCoordenadas(ubicacion) {
    const texto = porId('estadoUbicacionPublicacion');
    lugarPublicacion = null;
    solicitudBusquedaLugar?.abort();
    if (temporizadorBusquedaLugar)
        clearTimeout(temporizadorBusquedaLugar);
    porId('resultadosUbicacionPublicacion').replaceChildren();
    texto.textContent = 'Verificando la ciudad o pueblo de esta zona...';
    try {
        const lugar = await buscarLugarEnCoordenadas(ubicacion);
        establecerLugarPublicacion(lugar);
    }
    catch (error) {
        texto.textContent = mensajeDeError(error, 'No se pudo identificar una ciudad o pueblo en esa zona.');
        throw error;
    }
}
function alternarMapaPublicacion() {
    const panel = porId('panelMapaPublicacion');
    if (panel.classList.contains('d-none')) {
        panel.classList.remove('d-none');
        inicializarMapaPublicacion();
        window.setTimeout(() => mapaPublicacion?.invalidateSize(), 100);
    }
    else {
        cerrarMapaPublicacion();
    }
}
function cerrarMapaPublicacion() {
    porId('panelMapaPublicacion').classList.add('d-none');
}
function inicializarMapaPublicacion() {
    if (mapaPublicacion)
        return;
    if (typeof L === 'undefined') {
        porId('estadoUbicacionPublicacion').textContent =
            'No se pudo cargar el mapa. Puedes buscar la ciudad o pueblo por nombre.';
        return;
    }
    mapaPublicacion = L.map('mapaPublicacion').setView([-33.45, -70.66], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(mapaPublicacion);
    mapaPublicacion.on('click', event => {
        const ubicacion = { lat: event.latlng.lat, lon: event.latlng.lng };
        colocarMarcadorPublicacion(ubicacion, 'Buscando ciudad o pueblo...');
        void seleccionarCoordenadas(ubicacion).catch(() => undefined);
    });
    if (lugarPublicacion) {
        mapaPublicacion.setView([lugarPublicacion.ubicacion.lat, lugarPublicacion.ubicacion.lon], 13);
        colocarMarcadorPublicacion(lugarPublicacion.ubicacion, lugarPublicacion.nombre);
    }
}
function colocarMarcadorPublicacion(ubicacion, nombre) {
    if (!mapaPublicacion)
        return;
    const posicion = [ubicacion.lat, ubicacion.lon];
    if (marcadorPublicacion) {
        marcadorPublicacion.setLatLng(posicion).bindPopup(escapeHtml(nombre)).openPopup();
    }
    else {
        marcadorPublicacion = L.marker(posicion).addTo(mapaPublicacion)
            .bindPopup(escapeHtml(nombre)).openPopup();
    }
}
function limpiarUbicacionPublicacion() {
    lugarPublicacion = null;
    resultadosLugar = [];
    solicitudBusquedaLugar?.abort();
    if (temporizadorBusquedaLugar)
        clearTimeout(temporizadorBusquedaLugar);
    opcionalPorId('resultadosUbicacionPublicacion')?.replaceChildren();
    const estadoUbicacion = opcionalPorId('estadoUbicacionPublicacion');
    if (estadoUbicacion)
        estadoUbicacion.textContent = 'Selecciona una ciudad o pueblo para definir la zona.';
}
function validarPublicacion(titulo, precio, descripcion, ubicacion, categoria, modalidadesEntrega, fotos) {
    return primerError(obtenerSesion() ? null : 'Debes iniciar sesión para publicar.', validarTitulo(titulo), validarDescripcion(descripcion), validarUbicacion(ubicacion), lugarPublicacion && lugarPublicacion.nombre === ubicacion ? null
        : 'Selecciona una ciudad o pueblo real de los resultados o márcalo en el mapa.', categoria ? null : 'Elige una categoría.', modalidadesEntrega.length ? null : 'Selecciona al menos una modalidad de entrega.', validarMonto(precio, 'El precio'), lugarPublicacion ? validarCoordenadas(lugarPublicacion.ubicacion.lat, lugarPublicacion.ubicacion.lon) : null, validarFotos(fotos));
}
async function crearPublicacion(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const alerta = opcionalPorId('publicacionModalAlerta');
    ocultarAlerta(alerta);
    const titulo = porId('publicacionTitulo').value.trim();
    const precio = porId('publicacionPrecio').value.trim();
    const descripcion = porId('publicacionDescripcion').value.trim();
    const ubicacion = porId('publicacionUbicacion').value.trim();
    const categoria = porId('publicacionCategoria').value;
    const modalidadesEntrega = Array.from(document.querySelectorAll('#grupoModalidadesEntrega input[name="modalidadesEntrega"]:checked')).map(input => input.value);
    const fotos = Array.from(porId('publicacionFotos').files ?? []);
    const error = validarPublicacion(titulo, precio, descripcion, ubicacion, categoria, modalidadesEntrega, fotos);
    if (error) {
        if (!modalidadesEntrega.length) {
            porId('grupoModalidadesEntrega').classList.add('is-invalid');
        }
        mostrarAlerta(alerta, error);
        alerta?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
    }
    const datos = new FormData();
    datos.append('titulo', titulo);
    datos.append('precio', precio.replace(',', '.'));
    datos.append('descripcion', descripcion);
    datos.append('ubicacion', ubicacion);
    datos.append('categoria', categoria);
    modalidadesEntrega.forEach(modalidad => datos.append('modalidadesEntrega', modalidad));
    datos.append('latitud', String(lugarPublicacion?.ubicacion.lat));
    datos.append('longitud', String(lugarPublicacion?.ubicacion.lon));
    fotos.forEach(f => datos.append('fotos', f));
    try {
        await conBoton(opcionalPorId('btnPublicar'), 'Publicando...', async () => {
            await apiFetch('/publicaciones', { method: 'POST', body: datos });
            bootstrap.Modal.getOrCreateInstance(porId('modalPublicacion')).hide();
            form.reset();
            opcionalPorId('grupoModalidadesEntrega')?.classList.remove('is-invalid');
            limpiarUbicacionPublicacion();
            cerrarMapaPublicacion();
            if (marcadorPublicacion) {
                marcadorPublicacion = null;
                mapaPublicacion = null;
                porId('mapaPublicacion').replaceChildren();
            }
            porId('fotosPreview').innerHTML = '';
            mostrarAlerta(opcionalPorId('publicacionesAlerta'), 'Publicación creada correctamente.', 'success');
            estado.pagina = 0;
            await cargarPublicaciones();
        });
    }
    catch (e) {
        mostrarAlerta(alerta, mensajeDeError(e, 'No se pudo crear la publicación.'));
        alerta?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
function actualizarEstadoModalidades() {
    const grupo = opcionalPorId('grupoModalidadesEntrega');
    const seleccionada = document.querySelector('#grupoModalidadesEntrega input[name="modalidadesEntrega"]:checked');
    if (seleccionada) {
        grupo?.classList.remove('is-invalid');
    }
}
function previsualizarFotos(event) {
    const preview = porId('fotosPreview');
    preview.innerHTML = '';
    const archivos = Array.from(event.target.files ?? []).slice(0, LIMITES.fotos.max);
    for (const foto of archivos) {
        const div = document.createElement('div');
        div.className = 'col-4 col-md-3';
        const img = document.createElement('img');
        img.className = 'foto-preview';
        img.alt = 'Vista previa';
        img.src = URL.createObjectURL(foto);
        img.onload = () => URL.revokeObjectURL(img.src);
        div.appendChild(img);
        preview.appendChild(div);
    }
}
function actualizarBotonPublicar() {
    const conSesion = obtenerSesion() !== null;
    opcionalPorId('btnNuevaPublicacion')?.classList.toggle('d-none', !conSesion);
    opcionalPorId('btnPublicarInvitado')?.classList.toggle('d-none', conSesion);
}
// ------------------------------------------------------------ detalle
async function abrirDetalle(id) {
    if (!Number.isInteger(id) || id <= 0)
        return;
    try {
        const p = await apiFetch(`/publicaciones/${id}`);
        const imagenes = p.imagenUrls.map((url, i) => `<img src="${escapeHtml(urlAbsoluta(url))}" class="detalle-foto ${i === 0 ? 'detalle-foto-principal' : ''}" alt="${escapeHtml(p.titulo)} foto ${i + 1}">`).join('');
        porId('detallePublicacionContenido').innerHTML = `
            <div class="row g-3">
                <div class="col-lg-7"><div class="detalle-galeria">${imagenes}</div></div>
                <div class="col-lg-5">
                    <h3>${escapeHtml(p.titulo)}</h3>
                    <div class="detalle-precio">${formatoPrecio(p.precio)}</div>
                    <p class="mb-1"><span class="badge text-bg-light border">${escapeHtml(p.categoriaNombre)}</span>
                       ${p.estado === 'VENDIDA' ? '<span class="badge text-bg-secondary">Vendida</span>' : ''}</p>
                    <p><strong>Entrega:</strong> ${escapeHtml((p.modalidadesEntrega ?? []).map(modalidad => modalidad.nombre).join(' · ') || 'No informada')}</p>
                    <p><strong>Ubicación:</strong> ${escapeHtml(p.ubicacion)}</p>
                    <p><strong>Vendedor:</strong> ${escapeHtml(p.vendedorApodo || 'Usuario #' + p.usuarioId)}</p>
                    <p class="detalle-descripcion">${escapeHtml(p.descripcion)}</p>
                    <small class="text-muted">Publicación #${p.id}</small>
                </div>
            </div>`;
        const modal = bootstrap.Modal.getOrCreateInstance(porId('modalDetallePublicacion'));
        await montarPanelContacto(porId('panelContacto'), p);
        modal.show();
    }
    catch (e) {
        mostrarAlerta(opcionalPorId('publicacionesAlerta'), mensajeDeError(e, 'No se pudo abrir la publicación.'));
    }
}
