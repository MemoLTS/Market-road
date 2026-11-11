import { publicacionesService } from '../services/publicacionesService';
import type { Categoria, Publicacion } from '../types/api';
import type { FiltrosCatalogo } from '../types/app';
import { useAsync } from './useAsync';

export interface ResultadoPublicaciones {
    publicaciones: Publicacion[];
    total: number;
    totalPaginas: number;
    cargando: boolean;
    error: string;
    recargar: () => Promise<void>;
}

/** Conecta la capa de datos (API o base simulada) con los componentes: recarga al cambiar los filtros. */
export function usePublicaciones(filtros: FiltrosCatalogo): ResultadoPublicaciones {
    const clave = JSON.stringify(filtros);
    const { datos, cargando, error, recargar } = useAsync(() => publicacionesService.listar(filtros), [clave]);
    return {
        publicaciones: datos?.contenido ?? [],
        total: datos?.total ?? 0,
        totalPaginas: datos?.totalPaginas ?? 1,
        cargando, error, recargar,
    };
}

export function useCategorias(): Categoria[] {
    const { datos } = useAsync(() => publicacionesService.listarCategorias(), []);
    return datos ?? [];
}
