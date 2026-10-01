import { apiFetch, obtenerSesion } from './api.js';
import { montarPanelContacto } from './contacto.js';
import { conBoton, escapeHtml, formatoPrecio, mensajeDeError, mostrarAlerta, obtenerUbicacion, ocultarAlerta, opcionalPorId, porId, } from './util.js';
import { LIMITES, primerError, validarCoordenadas, validarDescripcion, validarFotos, validarMonto, validarRangoPrecios, validarTitulo, validarUbicacion, } from './validaciones.js';
const TAMANO_PAGINA = 12;
const ORDENES = ['RELEVANCIA', 'PRECIO_ASC', 'PRECIO_DESC', 'DISTANCIA', 'RECIENTES'];
const estado = {
    q: '', categorias: new Set(), precioMin: '', precioMax: '', orden: 'RELEVANCIA',
    radioKm: '', ubicacion: null, pagina: 0, soloMias: false,
};
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
async function cargarPublicaciones() {
    const contenedor = opcionalPorId('contenedor-publicaciones');
    const resumen = opcionalPorId('resumenCatalogo');
    const paginacion = opcionalPorId('paginacionCatalogo');
    if (!contenedor || !resumen || !paginacion)
        return;
    const mio = ++secuenciaCarga;
    contenedor.innerHTML = '<div class="col-12 text-center text-muted py-4">Cargando publicaciones...</div>';
    paginacion.innerHTML = '';
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
            contenedor.innerHTML = '<div class="col-12"><div class="alert alert-light border">No se encontraron publicaciones con esos criterios.</div></div>';
            return;
        }
        contenedor.innerHTML = lista.map(renderPublicacion).join('');
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
        contenedor.innerHTML = `<div class="col-12"><div class="alert alert-danger">${escapeHtml(mensajeDeError(e, 'No se pudieron cargar las publicaciones.'))}</div></div>`;
    }
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
    const src = p.imagenUrls[0] ?? '';
    const distancia = p.distanciaKm != null
        ? `<span class="badge text-bg-light border"><i class="bi bi-geo-alt"></i> ${p.distanciaKm} km</span>` : '';
    const vendida = p.estado === 'VENDIDA' ? '<span class="badge text-bg-secondary">Vendida</span>' : '';
    return `
        <article class="col-12 col-sm-6 col-lg-4">
            <div class="publicacion-card h-100" role="button" tabindex="0" data-publicacion-id="${p.id}" aria-label="Ver detalles de ${escapeHtml(p.titulo)}">
                <div class="publicacion-imagen">
                    ${src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(p.titulo)}" loading="lazy">`
        : '<div class="publicacion-sin-imagen"><i class="bi bi-image"></i></div>'}
                </div>
                <div class="publicacion-barra">
                    <span class="publicacion-titulo" title="${escapeHtml(p.titulo)}">${escapeHtml(p.titulo)}</span>
                    <span class="publicacion-precio">${formatoPrecio(p.precio)}</span>
                </div>
                <div class="publicacion-meta">
                    <span class="badge text-bg-light border">${escapeHtml(p.categoriaNombre)}</span>
                    ${distancia}${vendida}
                    <small class="text-muted ms-auto text-truncate">${escapeHtml(p.ubicacion)}</small>
                </div>
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
    opcionalPorId('btnNuevaPublicacion')?.classList.toggle('d-none', !obtenerSesion());
}
// ------------------------------------------------------------ detalle
async function abrirDetalle(id) {
    if (!Number.isInteger(id) || id <= 0)
        return;
    try {
        const p = await apiFetch(`/publicaciones/${id}`);
        const imagenes = p.imagenUrls.map((url, i) => `<img src="${escapeHtml(url)}" class="detalle-foto ${i === 0 ? 'detalle-foto-principal' : ''}" alt="${escapeHtml(p.titulo)} foto ${i + 1}">`).join('');
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
