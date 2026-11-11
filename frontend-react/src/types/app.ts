import type { Ubicacion } from '../core/formato';
import type { OrdenCatalogo } from './api';

/** Filtros del catálogo: son el estado de FiltersForm y los parámetros de GET /publicaciones. */
export interface FiltrosCatalogo {
    q?: string;
    categorias?: string[];
    precioMin?: string;
    precioMax?: string;
    ubicacion?: Ubicacion | null;
    radioKm?: string;
    orden?: OrdenCatalogo;
    pagina?: number;
    tamano?: number;
}

/** Valores que entrega PublicationForm. `fotos` solo se usa con la API real; en modo demo se usa `imagenUrls`. */
export interface DatosPublicacion {
    titulo: string;
    precio: string;
    descripcion: string;
    ubicacion: string;
    categoria: string;
    modalidadesEntrega: string[];
    /** Texto del campo; vacío = 1 unidad. */
    unidades?: string;
    fotos?: File[];
    latitud: number | null;
    longitud: number | null;
    imagenUrls?: string[];
}

export type CambiosPublicacion = Partial<Pick<DatosPublicacion, 'titulo' | 'descripcion' | 'ubicacion' | 'categoria'>> & {
    precio?: string | number;
    unidades?: number;
    estado?: string;
};

export interface DatosRegistro {
    nombre: string;
    apellido: string;
    apodo: string;
    correo: string;
    contrasena: string;
}

export interface DispositivoSesion {
    id?: number;
    dispositivoId?: string;
    navegador?: string;
    dispositivo?: string;
    ultimoAcceso?: string;
    fecha?: string;
}
