import { apiFetch, obtenerSesion, urlAbsoluta } from './api.js';
import { montarPanelContacto } from './contacto.js';
import { conBoton, escapeHtml, formatoPrecio, mensajeDeError, mostrarAlerta, obtenerUbicacion, ocultarAlerta, opcionalPorId, porId, } from './util.js';
import { LIMITES, primerError, validarCoordenadas, validarDescripcion, validarFotos, validarMonto, validarRangoPrecios, validarTitulo, validarUbicacion, } from './validaciones.js';
const TAMANO_PAGINA = 12;
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
let ubicacionPublicacion = null;
let secuenciaCarga = 0; // descarta respuestas viejas si el usuario cambia filtros rápido
document.addEventListener('DOMContentLoaded', async () => {
    await cargarCategorias();
    void cargarPublicaciones();
    actualizarBotonPublicar();
    opcionalPorId('formPublicacion')?.addEventListener('submit', crearPublicacion);
    opcionalPorId('publicacionFotos')?.addEventListener('change', previsualizarFotos);
    opcionalPorId('formFiltros')?.addEventListener('submit', e => { e.preventDefault(); aplicarFiltros(); });
    opcionalPorId('filtroOrden')?.addEventListener('change', aplicarFiltros);
    opcionalPorId('filtroRadio')?.addEventListener('change', aplicarFiltros);
    opcionalPorId('btnLimpiarFiltros')?.addEventListener('click', limpiarFiltros);
    opcionalPorId('btnUbicacion')?.addEventListener('click', compartirUbicacion);
    opcionalPorId('btnUbicacionPublicacion')?.addEventListener('click', ubicacionParaPublicacion);
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
});
// ------------------------------------------------------------ catálogo
async function cargarCategorias() {
    let categorias = [];
    try {
        categorias = await apiFetch('/publicaciones/categorias');
    }
    catch { /* el catálogo sigue funcionando sin filtro por categoría */ }
    const cont = opcionalPorId('filtroCategorias');
    if (cont) {
        cont.innerHTML = categorias.map(c => `
            <input type="checkbox" class="btn-check" id="cat-${escapeHtml(c.codigo)}" value="${escapeHtml(c.codigo)}" autocomplete="off">
            <label class="btn btn-sm btn-outline-secondary" for="cat-${escapeHtml(c.codigo)}">${escapeHtml(c.nombre)}</label>`).join('');
        cont.querySelectorAll('input').forEach(i => i.addEventListener('change', aplicarFiltros));
    }
    const select = opcionalPorId('publicacionCategoria');
    if (select) {
        select.innerHTML = categorias.map(c => `<option value="${escapeHtml(c.codigo)}">${escapeHtml(c.nombre)}</option>`).join('');
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
    const alerta = opcionalPorId('publicacionesAlerta');
    ocultarAlerta(alerta);
    const error = primerError(estado.q.length > LIMITES.titulo.max ? `La búsqueda puede tener como máximo ${LIMITES.titulo.max} caracteres.` : null, validarRangoPrecios(estado.precioMin, estado.precioMax));
    if (error) {
        mostrarAlerta(alerta, error);
        return;
    }
    if ((estado.orden === 'DISTANCIA' || estado.radioKm) && !estado.ubicacion) {
        mostrarAlerta(alerta, 'Para ordenar o filtrar por distancia primero comparte tu ubicación.');
        porId('filtroOrden').value = estado.orden = 'RELEVANCIA';
        porId('filtroRadio').value = estado.radioKm = '';
        return;
    }
    estado.soloMias = false;
    estado.pagina = 0;
    void cargarPublicaciones();
}
function limpiarFiltros() {
    porId('formFiltros').reset();
    document.querySelectorAll('#filtroCategorias input').forEach(i => { i.checked = false; });
    estado.ubicacion = null;
    porId('estadoUbicacion').textContent = 'Comparte tu ubicación para ordenar por distancia.';
    porId('grupoRadio').classList.add('d-none');
    aplicarFiltros();
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
    p.set('tamano', String(TAMANO_PAGINA));
    return p.toString();
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
    if (pagina.totalPaginas <= 1)
        return;
    nav.innerHTML = `
        <button class="btn btn-outline-secondary btn-sm" id="pagAnterior" ${pagina.pagina === 0 ? 'disabled' : ''}>Anterior</button>
        <span class="small">Página ${pagina.pagina + 1} de ${pagina.totalPaginas}</span>
        <button class="btn btn-outline-secondary btn-sm" id="pagSiguiente" ${pagina.pagina + 1 >= pagina.totalPaginas ? 'disabled' : ''}>Siguiente</button>`;
    const ir = (delta) => {
        estado.pagina = Math.max(0, estado.pagina + delta);
        void cargarPublicaciones();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    porId('pagAnterior').addEventListener('click', () => ir(-1));
    porId('pagSiguiente').addEventListener('click', () => ir(1));
}
function renderPublicacion(p) {
    const src = p.imagenUrls[0] ? urlAbsoluta(p.imagenUrls[0]) : '';
    const vendida = p.estado === 'VENDIDA' ? '<span class="mk-badge mk-badge-vendida">Vendida</span>' : '';
    const distancia = p.distanciaKm != null ? ` · ${p.distanciaKm} km` : '';
    return `
        <article class="mk-card" role="button" tabindex="0" data-publicacion-id="${p.id}"
            aria-label="Ver detalles de ${escapeHtml(p.titulo)}">
            <div class="mk-img">
                ${src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(p.titulo)}" loading="lazy">`
        : '<div class="mk-sin-imagen"><i class="bi bi-image" aria-hidden="true"></i></div>'}
                ${vendida}
            </div>
            <div class="mk-info">
                <span class="mk-price">${formatoPrecio(p.precio)}</span>
                <span class="mk-title" title="${escapeHtml(p.titulo)}">${escapeHtml(p.titulo)}</span>
                <span class="mk-loc"><i class="bi bi-geo-alt" aria-hidden="true"></i> ${escapeHtml(p.ubicacion)}${distancia}</span>
            </div>
        </article>`;
}
// ------------------------------------------------------------ crear publicación
async function ubicacionParaPublicacion() {
    const texto = porId('estadoUbicacionPublicacion');
    try {
        ubicacionPublicacion = await obtenerUbicacion();
        texto.textContent = 'Ubicación guardada para esta publicación.';
    }
    catch (e) {
        ubicacionPublicacion = null;
        texto.textContent = mensajeDeError(e);
    }
}
function validarPublicacion(titulo, precio, descripcion, ubicacion, categoria, fotos) {
    return primerError(obtenerSesion() ? null : 'Debes iniciar sesión para publicar.', validarTitulo(titulo), validarDescripcion(descripcion), validarUbicacion(ubicacion), categoria ? null : 'Elige una categoría.', validarMonto(precio, 'El precio'), ubicacionPublicacion ? validarCoordenadas(ubicacionPublicacion.lat, ubicacionPublicacion.lon) : null, validarFotos(fotos));
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
    const fotos = Array.from(porId('publicacionFotos').files ?? []);
    const error = validarPublicacion(titulo, precio, descripcion, ubicacion, categoria, fotos);
    if (error) {
        mostrarAlerta(alerta, error);
        return;
    }
    const datos = new FormData();
    datos.append('titulo', titulo);
    datos.append('precio', precio.replace(',', '.'));
    datos.append('descripcion', descripcion);
    datos.append('ubicacion', ubicacion);
    datos.append('categoria', categoria);
    if (ubicacionPublicacion) {
        datos.append('latitud', String(ubicacionPublicacion.lat));
        datos.append('longitud', String(ubicacionPublicacion.lon));
    }
    fotos.forEach(f => datos.append('fotos', f));
    try {
        await conBoton(opcionalPorId('btnPublicar'), 'Publicando...', async () => {
            await apiFetch('/publicaciones', { method: 'POST', body: datos });
            bootstrap.Modal.getOrCreateInstance(porId('modalPublicacion')).hide();
            form.reset();
            ubicacionPublicacion = null;
            porId('estadoUbicacionPublicacion').textContent = 'Opcional: permite que te encuentren por distancia.';
            porId('fotosPreview').innerHTML = '';
            mostrarAlerta(opcionalPorId('publicacionesAlerta'), 'Publicación creada correctamente.', 'success');
            estado.pagina = 0;
            await cargarPublicaciones();
        });
    }
    catch (e) {
        mostrarAlerta(alerta, mensajeDeError(e, 'No se pudo crear la publicación.'));
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
