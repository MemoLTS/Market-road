import { config } from '../config.js';
import * as bd from '../data/baseDatos.js';
import { apiFetch } from './http.js';
import { obtenerSesion } from './sesion.js';

/** Convierte el estado de los filtros en el query string que entiende GET /publicaciones. */
export function construirQuery({ q, categorias = [], precioMin = '', precioMax = '', ubicacion = null, radioKm = '', orden = 'RELEVANCIA', pagina = 0, tamano = 12 } = {}) {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    categorias.forEach(c => p.append('categoria', c));
    if (precioMin !== '') p.set('precioMin', precioMin);
    if (precioMax !== '') p.set('precioMax', precioMax);
    if (ubicacion) {
        p.set('lat', String(ubicacion.lat));
        p.set('lon', String(ubicacion.lon));
        if (radioKm) p.set('radioKm', radioKm);
    }
    p.set('orden', orden);
    p.set('pagina', String(pagina));
    p.set('tamano', String(tamano));
    return p.toString();
}

const asincrono = valor => Promise.resolve(valor);

function noEncontrada() {
    return Object.assign(new Error('La publicación no existe.'), { status: 404 });
}

export const publicacionesService = {
    listarCategorias() {
        return config.usarMock ? asincrono(bd.listarCategorias()) : apiFetch('/publicaciones/categorias');
    },

    listar(filtros = {}) {
        if (config.usarMock) return asincrono(bd.listarPublicaciones(filtros));
        return apiFetch(`/publicaciones?${construirQuery(filtros)}`);
    },

    obtener(id) {
        if (config.usarMock) {
            const p = bd.obtenerPublicacion(id);
            return p ? asincrono(p) : Promise.reject(noEncontrada());
        }
        return apiFetch(`/publicaciones/${id}`);
    },

    mias() {
        if (config.usarMock) {
            const sesion = obtenerSesion();
            return asincrono(sesion ? bd.listarPublicacionesDeUsuario(sesion.usuario.id) : []);
        }
        return apiFetch('/publicaciones/mias');
    },

    /** `datos` es un objeto simple (ver PublicationForm); en modo API se transforma a multipart. */
    crear(datos) {
        if (config.usarMock) {
            const sesion = obtenerSesion();
            if (!sesion) return Promise.reject(Object.assign(new Error('Inicia sesión para publicar.'), { status: 401 }));
            return asincrono(bd.crearPublicacion(datos, sesion.usuario));
        }
        const form = new FormData();
        form.append('titulo', datos.titulo.trim());
        form.append('precio', String(datos.precio).replace(',', '.'));
        form.append('descripcion', datos.descripcion.trim());
        form.append('ubicacion', datos.ubicacion.trim());
        form.append('categoria', datos.categoria);
        datos.modalidadesEntrega.forEach(m => form.append('modalidadesEntrega', m));
        form.append('latitud', String(datos.latitud));
        form.append('longitud', String(datos.longitud));
        (datos.fotos ?? []).forEach(f => form.append('fotos', f));
        return apiFetch('/publicaciones', { method: 'POST', body: form });
    },

    actualizar(id, cambios) {
        if (config.usarMock) {
            const p = bd.actualizarPublicacion(id, cambios);
            return p ? asincrono(p) : Promise.reject(noEncontrada());
        }
        // El backend actual no expone edición (solo alta, baja y lectura): se informa en vez de fallar en silencio.
        return Promise.reject(new Error('El backend aún no permite editar publicaciones.'));
    },

    eliminar(id) {
        if (config.usarMock) return bd.eliminarPublicacion(id) ? asincrono(null) : Promise.reject(noEncontrada());
        return apiFetch(`/publicaciones/${id}`, { method: 'DELETE' });
    },
};
