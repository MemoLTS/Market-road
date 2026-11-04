import { useAsync } from './useAsync.js';
import { publicacionesService } from '../services/publicacionesService.js';

/** Conecta la capa de datos (API o base simulada) con los componentes: recarga al cambiar los filtros. */
export function usePublicaciones(filtros) {
    const clave = JSON.stringify(filtros);
    const { datos, cargando, error, recargar } = useAsync(() => publicacionesService.listar(filtros), [clave]);
    return {
        publicaciones: datos?.contenido ?? [],
        total: datos?.total ?? 0,
        totalPaginas: datos?.totalPaginas ?? 1,
        cargando, error, recargar,
    };
}

export function useCategorias() {
    const { datos } = useAsync(() => publicacionesService.listarCategorias(), []);
    return datos ?? [];
}
