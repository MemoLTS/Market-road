import { config } from '../config';
import * as bd from '../data/baseDatos';
import type { Categoria, Pagina, Publicacion } from '../types/api';
import type { CambiosPublicacion, DatosPublicacion, FiltrosCatalogo } from '../types/app';
import { unidadesDe } from '../core/validaciones';
import { apiFetch } from './http';
import { obtenerSesion } from './sesion';

/** Convierte el estado de los filtros en el query string que entiende GET /publicaciones. */
export function construirQuery({ q, categorias = [], precioMin = '', precioMax = '', ubicacion = null, radioKm = '', orden = 'RELEVANCIA', pagina = 0, tamano = 12 }: FiltrosCatalogo = {}): string {
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

const asincrono = <T>(valor: T): Promise<T> => Promise.resolve(valor);

function errorConEstado(mensaje: string, status: number): Error & { status: number } {
    return Object.assign(new Error(mensaje), { status });
}

export const publicacionesService = {
    listarCategorias(): Promise<Categoria[]> {
        return config.usarMock ? asincrono(bd.listarCategorias()) : apiFetch<Categoria[]>('/publicaciones/categorias');
    },

    listar(filtros: FiltrosCatalogo = {}): Promise<Pagina<Publicacion>> {
        if (config.usarMock) return asincrono(bd.listarPublicaciones(filtros));
        return apiFetch<Pagina<Publicacion>>(`/publicaciones?${construirQuery(filtros)}`);
    },

    obtener(id: number | string): Promise<Publicacion> {
        if (config.usarMock) {
            const p = bd.obtenerPublicacion(id);
            return p ? asincrono(p) : Promise.reject(errorConEstado('La publicación no existe.', 404));
        }
        return apiFetch<Publicacion>(`/publicaciones/${id}`);
    },

    mias(): Promise<Publicacion[]> {
        if (config.usarMock) {
            const sesion = obtenerSesion();
            return asincrono(sesion ? bd.listarPublicacionesDeUsuario(sesion.usuario.id) : []);
        }
        return apiFetch<Publicacion[]>('/publicaciones/mias');
    },

    /** En modo API los datos se transforman a multipart/form-data. */
    crear(datos: DatosPublicacion): Promise<Publicacion> {
        if (config.usarMock) {
            const sesion = obtenerSesion();
            if (!sesion) return Promise.reject(errorConEstado('Inicia sesión para publicar.', 401));
            return asincrono(bd.crearPublicacion(datos, sesion.usuario));
        }
        const form = new FormData();
        form.append('titulo', datos.titulo.trim());
        form.append('precio', String(datos.precio).replace(',', '.'));
        form.append('descripcion', datos.descripcion.trim());
        form.append('ubicacion', datos.ubicacion.trim());
        form.append('unidades', String(unidadesDe(datos.unidades)));
        form.append('categoria', datos.categoria);
        datos.modalidadesEntrega.forEach(m => form.append('modalidadesEntrega', m));
        form.append('latitud', String(datos.latitud));
        form.append('longitud', String(datos.longitud));
        (datos.fotos ?? []).forEach(f => form.append('fotos', f));
        return apiFetch<Publicacion>('/publicaciones', { method: 'POST', body: form });
    },

    actualizar(id: number | string, cambios: CambiosPublicacion): Promise<Publicacion> {
        if (config.usarMock) {
            const p = bd.actualizarPublicacion(id, cambios);
            return p ? asincrono(p) : Promise.reject(errorConEstado('La publicación no existe.', 404));
        }
        return apiFetch<Publicacion>(`/publicaciones/${id}`, { method: 'PATCH', body: JSON.stringify(cambios) });
    },

    eliminar(id: number | string): Promise<null> {
        if (config.usarMock) return bd.eliminarPublicacion(id) ? asincrono(null) : Promise.reject(errorConEstado('La publicación no existe.', 404));
        return apiFetch<null>(`/publicaciones/${id}`, { method: 'DELETE' });
    },
};
