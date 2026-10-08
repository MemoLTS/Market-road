import { apiFetch, obtenerSesion, urlAbsoluta } from './api.js';
import { montarPanelContacto } from './contacto.js';
import type { Categoria, OrdenCatalogo, Pagina, Publicacion } from './tipos.js';
import {
    conBoton, escapeHtml, formatoPrecio, mensajeDeError, mostrarAlerta, obtenerUbicacion, ocultarAlerta,
    opcionalPorId, porId, type Ubicacion,
} from './util.js';
import {
    LIMITES, primerError, validarCoordenadas, validarDescripcion, validarFotos, validarMonto,
    validarRangoPrecios, validarTitulo, validarUbicacion,
} from './validaciones.js';

const TAMANO_PAGINA = 12;
const ORDENES: readonly OrdenCatalogo[] = ['RELEVANCIA', 'PRECIO_ASC', 'PRECIO_DESC', 'DISTANCIA', 'RECIENTES'];

interface EstadoCatalogo {
    q: string;
    categorias: Set<string>;
    precioMin: string;
    precioMax: string;
    orden: OrdenCatalogo;
    radioKm: string;
    ubicacion: Ubicacion | null;
    pagina: number;
    soloMias: boolean;
}

const estado: EstadoCatalogo = {
    q: '', categorias: new Set(), precioMin: '', precioMax: '', orden: 'RELEVANCIA',
    radioKm: '', ubicacion: null, pagina: 0, soloMias: false,
};

/** Única tarjeta de ejemplo: ocupa el primer lugar y las publicaciones nuevas se agregan a continuación. */
const EJEMPLO = { titulo: 'Tu primera publicación', precio: 185000, ubicacion: 'Cerca de ti' };
const IMAGEN_EJEMPLO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">'
    + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0" stop-color="#8ec5ff"/><stop offset="1" stop-color="#1877f2"/></linearGradient></defs>'
    + '<rect width="400" height="400" fill="url(#g)"/>'
    + '<g fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">'
    + '<circle cx="130" cy="250" r="55"/><circle cx="280" cy="250" r="55"/>'
    + '<path d="M130 250 L180 160 H250 L280 250 M180 160 L210 250 H130 M245 125 H290"/></g>'
    + '<text x="200" y="352" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" fill="#fff">Ejemplo</text>'
    + '</svg>');

let ubicacionPublicacion: Ubicacion | null = null;
let secuenciaCarga = 0; // descarta respuestas viejas si el usuario cambia filtros rápido

document.addEventListener('DOMContentLoaded', async () => {
    await cargarCategorias();
    void cargarPublicaciones();
    actualizarBotonPublicar();

    opcionalPorId<HTMLFormElement>('formPublicacion')?.addEventListener('submit', crearPublicacion);
    opcionalPorId<HTMLInputElement>('publicacionFotos')?.addEventListener('change', previsualizarFotos);
    document.querySelectorAll<HTMLInputElement>('#grupoModalidadesEntrega input[name="modalidadesEntrega"]')
        .forEach(input => input.addEventListener('change', actualizarEstadoModalidades));
    opcionalPorId<HTMLFormElement>('formFiltros')?.addEventListener('submit', e => { e.preventDefault(); aplicarFiltros(); });
    opcionalPorId('filtroOrden')?.addEventListener('change', aplicarFiltros);
    opcionalPorId('filtroRadio')?.addEventListener('change', aplicarFiltros);
    opcionalPorId('btnLimpiarFiltros')?.addEventListener('click', limpiarFiltros);
    opcionalPorId('btnUbicacion')?.addEventListener('click', compartirUbicacion);
    opcionalPorId('btnUbicacionPublicacion')?.addEventListener('click', ubicacionParaPublicacion);
    opcionalPorId('btnMisPublicaciones')?.addEventListener('click', alternarMisPublicaciones);

    const alCambiarSesion = (): void => {
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

async function cargarCategorias(): Promise<void> {
    let categorias: Categoria[] = [];
    let errorCarga: unknown = null;
    try {
        categorias = await apiFetch<Categoria[]>('/publicaciones/categorias');
    } catch (error) {
        errorCarga = error;
    }

    const cont = opcionalPorId('filtroCategorias');
    if (cont) {
        cont.innerHTML = categorias.map(c => `
            <input type="checkbox" class="btn-check" id="cat-${escapeHtml(c.codigo)}" value="${escapeHtml(c.codigo)}" autocomplete="off">
            <label class="btn btn-sm btn-outline-secondary" for="cat-${escapeHtml(c.codigo)}">${escapeHtml(c.nombre)}</label>`).join('');
        cont.querySelectorAll('input').forEach(i => i.addEventListener('change', aplicarFiltros));
    }
    const select = opcionalPorId<HTMLSelectElement>('publicacionCategoria');
    if (select) {
        select.innerHTML = '<option value="" selected disabled>Selecciona una categoría</option>'
            + categorias.map(c => `<option value="${escapeHtml(c.codigo)}">${escapeHtml(c.nombre)}</option>`).join('');
        if (errorCarga) {
            mostrarAlerta(
                opcionalPorId('publicacionModalAlerta'),
                mensajeDeError(errorCarga, 'No se pudieron cargar las categorías. Inténtalo nuevamente.'),
            );
        } else if (!categorias.length) {
            mostrarAlerta(opcionalPorId('publicacionModalAlerta'), 'No hay categorías disponibles para publicar.');
        }
    }
}

function leerFiltros(): void {
    estado.q = porId<HTMLInputElement>('filtroTexto').value.trim();
    estado.precioMin = porId<HTMLInputElement>('filtroPrecioMin').value.trim();
    estado.precioMax = porId<HTMLInputElement>('filtroPrecioMax').value.trim();
    const orden = porId<HTMLSelectElement>('filtroOrden').value as OrdenCatalogo;
    estado.orden = ORDENES.includes(orden) ? orden : 'RELEVANCIA';
    estado.radioKm = porId<HTMLSelectElement>('filtroRadio').value;
    estado.categorias = new Set(
        Array.from(document.querySelectorAll<HTMLInputElement>('#filtroCategorias input:checked')).map(i => i.value));
}

function aplicarFiltros(): void {
    leerFiltros();
    const alerta = opcionalPorId('publicacionesAlerta');
    ocultarAlerta(alerta);

    const error = primerError(
        estado.q.length > LIMITES.titulo.max ? `La búsqueda puede tener como máximo ${LIMITES.titulo.max} caracteres.` : null,
        validarRangoPrecios(estado.precioMin, estado.precioMax),
    );
    if (error) {
        mostrarAlerta(alerta, error);
        return;
    }
    if ((estado.orden === 'DISTANCIA' || estado.radioKm) && !estado.ubicacion) {
        mostrarAlerta(alerta, 'Para ordenar o filtrar por distancia primero comparte tu ubicación.');
        porId<HTMLSelectElement>('filtroOrden').value = estado.orden = 'RELEVANCIA';
        porId<HTMLSelectElement>('filtroRadio').value = estado.radioKm = '';
        return;
    }
    estado.soloMias = false;
    estado.pagina = 0;
    void cargarPublicaciones();
}

function limpiarFiltros(): void {
    porId<HTMLFormElement>('formFiltros').reset();
    document.querySelectorAll<HTMLInputElement>('#filtroCategorias input').forEach(i => { i.checked = false; });
    estado.ubicacion = null;
    porId('estadoUbicacion').textContent = 'Comparte tu ubicación para ordenar por distancia.';
    porId('grupoRadio').classList.add('d-none');
    aplicarFiltros();
}

async function compartirUbicacion(): Promise<void> {
    const texto = porId('estadoUbicacion');
    texto.textContent = 'Obteniendo ubicación...';
    try {
        const u = await obtenerUbicacion();
        const error = validarCoordenadas(u.lat, u.lon);
        if (error) throw new Error(error);
        estado.ubicacion = u;
        texto.textContent = 'Ubicación compartida: las distancias se muestran en cada publicación.';
        porId('grupoRadio').classList.remove('d-none');
        porId<HTMLSelectElement>('filtroOrden').value = 'DISTANCIA';
        aplicarFiltros();
    } catch (e) {
        texto.textContent = mensajeDeError(e);
    }
}

function alternarMisPublicaciones(): void {
    if (!obtenerSesion()) return;
    estado.soloMias = !estado.soloMias;
    estado.pagina = 0;
    void cargarPublicaciones();
}

function construirQuery(): string {
    const p = new URLSearchParams();
    if (estado.q) p.set('q', estado.q);
    estado.categorias.forEach(c => p.append('categoria', c));
    if (estado.precioMin !== '') p.set('precioMin', estado.precioMin);
    if (estado.precioMax !== '') p.set('precioMax', estado.precioMax);
    if (estado.ubicacion) {
        p.set('lat', String(estado.ubicacion.lat));
        p.set('lon', String(estado.ubicacion.lon));
        if (estado.radioKm) p.set('radioKm', estado.radioKm);
    }
    p.set('orden', estado.orden);
    p.set('pagina', String(estado.pagina));
    p.set('tamano', String(TAMANO_PAGINA));
    return p.toString();
}

function hayFiltrosActivos(): boolean {
    return Boolean(estado.q || estado.categorias.size || estado.precioMin || estado.precioMax
        || estado.ubicacion || estado.radioKm || estado.orden !== 'RELEVANCIA');
}

/** El ejemplo solo se muestra en el listado general (sin filtros, sin "mis publicaciones", primera página). */
function mostrarEjemplo(): boolean {
    return !estado.soloMias && estado.pagina === 0 && !hayFiltrosActivos();
}

function renderEjemplo(): string {
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

function renderMensaje(html: string, tipo: 'info' | 'error' = 'info'): string {
    return `<div class="mk-mensaje mk-mensaje-${tipo}" role="${tipo === 'error' ? 'alert' : 'status'}">${html}</div>`;
}

function abrirCrearPublicacion(): void {
    const modal = obtenerSesion() ? 'modalPublicacion' : 'modalLogin';
    const el = opcionalPorId(modal);
    if (el) bootstrap.Modal.getOrCreateInstance(el).show();
}

async function cargarPublicaciones(): Promise<void> {
    const contenedor = opcionalPorId('contenedor-publicaciones');
    const resumen = opcionalPorId('resumenCatalogo');
    const paginacion = opcionalPorId('paginacionCatalogo');
    if (!contenedor || !resumen || !paginacion) return;

    const mio = ++secuenciaCarga;
    const ejemplo = mostrarEjemplo() ? renderEjemplo() : '';
    contenedor.innerHTML = ejemplo + renderMensaje('Cargando publicaciones...');
    paginacion.innerHTML = '';
    activarEjemplo(contenedor);

    try {
        let lista: Publicacion[];
        let pagina: Pagina<Publicacion> | null = null;
        if (estado.soloMias) {
            lista = await apiFetch<Publicacion[]>('/publicaciones/mias');
            if (mio !== secuenciaCarga) return;
            resumen.textContent = `Mis publicaciones (${lista.length})`;
        } else {
            pagina = await apiFetch<Pagina<Publicacion>>(`/publicaciones?${construirQuery()}`);
            if (mio !== secuenciaCarga) return;
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
        contenedor.querySelectorAll<HTMLElement>('[data-publicacion-id]').forEach(card => {
            const abrir = (): void => { void abrirDetalle(Number(card.dataset['publicacionId'])); };
            card.addEventListener('click', abrir);
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
            });
        });
        if (pagina) renderPaginacion(pagina, paginacion);
    } catch (e) {
        if (mio !== secuenciaCarga) return;
        contenedor.innerHTML = ejemplo
            + renderMensaje(escapeHtml(mensajeDeError(e, 'No se pudieron cargar las publicaciones.')), 'error');
        activarEjemplo(contenedor);
    }
}

function activarEjemplo(contenedor: HTMLElement): void {
    const tarjeta = contenedor.querySelector<HTMLElement>('[data-ejemplo]');
    if (!tarjeta) return;
    tarjeta.addEventListener('click', abrirCrearPublicacion);
    tarjeta.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirCrearPublicacion(); }
    });
}

function renderPaginacion(pagina: Pagina<Publicacion>, nav: HTMLElement): void {
    if (pagina.totalPaginas <= 1) return;
    nav.innerHTML = `
        <button class="btn btn-outline-secondary btn-sm" id="pagAnterior" ${pagina.pagina === 0 ? 'disabled' : ''}>Anterior</button>
        <span class="small">Página ${pagina.pagina + 1} de ${pagina.totalPaginas}</span>
        <button class="btn btn-outline-secondary btn-sm" id="pagSiguiente" ${pagina.pagina + 1 >= pagina.totalPaginas ? 'disabled' : ''}>Siguiente</button>`;
    const ir = (delta: number): void => {
        estado.pagina = Math.max(0, estado.pagina + delta);
        void cargarPublicaciones();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    porId('pagAnterior').addEventListener('click', () => ir(-1));
    porId('pagSiguiente').addEventListener('click', () => ir(1));
}

function renderPublicacion(p: Publicacion): string {
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

async function ubicacionParaPublicacion(): Promise<void> {
    const texto = porId('estadoUbicacionPublicacion');
    try {
        ubicacionPublicacion = await obtenerUbicacion();
        texto.textContent = 'Ubicación guardada para esta publicación.';
    } catch (e) {
        ubicacionPublicacion = null;
        texto.textContent = mensajeDeError(e);
    }
}

function validarPublicacion(titulo: string, precio: string, descripcion: string, ubicacion: string,
                            categoria: string, modalidadesEntrega: string[], fotos: File[]): string | null {
    return primerError(
        obtenerSesion() ? null : 'Debes iniciar sesión para publicar.',
        validarTitulo(titulo),
        validarDescripcion(descripcion),
        validarUbicacion(ubicacion),
        categoria ? null : 'Elige una categoría.',
        modalidadesEntrega.length ? null : 'Selecciona al menos una modalidad de entrega.',
        validarMonto(precio, 'El precio'),
        ubicacionPublicacion ? validarCoordenadas(ubicacionPublicacion.lat, ubicacionPublicacion.lon) : null,
        validarFotos(fotos),
    );
}

async function crearPublicacion(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const alerta = opcionalPorId('publicacionModalAlerta');
    ocultarAlerta(alerta);

    const titulo = porId<HTMLInputElement>('publicacionTitulo').value.trim();
    const precio = porId<HTMLInputElement>('publicacionPrecio').value.trim();
    const descripcion = porId<HTMLTextAreaElement>('publicacionDescripcion').value.trim();
    const ubicacion = porId<HTMLInputElement>('publicacionUbicacion').value.trim();
    const categoria = porId<HTMLSelectElement>('publicacionCategoria').value;
    const modalidadesEntrega = Array.from(
        document.querySelectorAll<HTMLInputElement>('#grupoModalidadesEntrega input[name="modalidadesEntrega"]:checked'),
    ).map(input => input.value);
    const fotos = Array.from(porId<HTMLInputElement>('publicacionFotos').files ?? []);

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
    if (ubicacionPublicacion) {
        datos.append('latitud', String(ubicacionPublicacion.lat));
        datos.append('longitud', String(ubicacionPublicacion.lon));
    }
    fotos.forEach(f => datos.append('fotos', f));

    try {
        await conBoton(opcionalPorId<HTMLButtonElement>('btnPublicar'), 'Publicando...', async () => {
            await apiFetch('/publicaciones', { method: 'POST', body: datos });
            bootstrap.Modal.getOrCreateInstance(porId('modalPublicacion')).hide();
            form.reset();
            opcionalPorId('grupoModalidadesEntrega')?.classList.remove('is-invalid');
            ubicacionPublicacion = null;
            porId('estadoUbicacionPublicacion').textContent = 'Opcional: permite que te encuentren por distancia.';
            porId('fotosPreview').innerHTML = '';
            mostrarAlerta(opcionalPorId('publicacionesAlerta'), 'Publicación creada correctamente.', 'success');
            estado.pagina = 0;
            await cargarPublicaciones();
        });
    } catch (e) {
        mostrarAlerta(alerta, mensajeDeError(e, 'No se pudo crear la publicación.'));
        alerta?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function actualizarEstadoModalidades(): void {
    const grupo = opcionalPorId('grupoModalidadesEntrega');
    const seleccionada = document.querySelector(
        '#grupoModalidadesEntrega input[name="modalidadesEntrega"]:checked',
    );
    if (seleccionada) {
        grupo?.classList.remove('is-invalid');
    }
}

function previsualizarFotos(event: Event): void {
    const preview = porId('fotosPreview');
    preview.innerHTML = '';
    const archivos = Array.from((event.target as HTMLInputElement).files ?? []).slice(0, LIMITES.fotos.max);
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

function actualizarBotonPublicar(): void {
    const conSesion = obtenerSesion() !== null;
    opcionalPorId('btnNuevaPublicacion')?.classList.toggle('d-none', !conSesion);
    opcionalPorId('btnPublicarInvitado')?.classList.toggle('d-none', conSesion);
}

// ------------------------------------------------------------ detalle

async function abrirDetalle(id: number): Promise<void> {
    if (!Number.isInteger(id) || id <= 0) return;
    try {
        const p = await apiFetch<Publicacion>(`/publicaciones/${id}`);
        const imagenes = p.imagenUrls.map((url, i) =>
            `<img src="${escapeHtml(urlAbsoluta(url))}" class="detalle-foto ${i === 0 ? 'detalle-foto-principal' : ''}" alt="${escapeHtml(p.titulo)} foto ${i + 1}">`).join('');
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
    } catch (e) {
        mostrarAlerta(opcionalPorId('publicacionesAlerta'), mensajeDeError(e, 'No se pudo abrir la publicación.'));
    }
}
