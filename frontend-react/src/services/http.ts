import { config } from '../config';
import { actualizarUsuarioSesion, EVENTO_SESION_EXPIRADA, limpiarSesion, obtenerSesion } from './sesion';

/** Error de la API con el código HTTP, para distinguir 404, 409, 429, etc. */
export class ApiError extends Error {
    readonly status: number;
    transitorio = false;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

/** La API devuelve rutas relativas para las imágenes: se completan con el origen del gateway. */
export function urlAbsoluta(ruta: string): string {
    if (!ruta || /^(https?:|data:|blob:)/i.test(ruta)) return ruta;
    return new URL(ruta, config.apiBaseUrl).href;
}

export function mensajeDeCuerpo(cuerpo: Record<string, unknown> | null, status: number): string {
    if (cuerpo) {
        const directo = cuerpo.error ?? cuerpo.mensaje ?? cuerpo.message;
        if (typeof directo === 'string' && directo) return directo;
        const primero = Object.values(cuerpo).find((v): v is string => typeof v === 'string' && v.length > 0);
        if (primero) return primero;
    }
    if (status === 429) return 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.';
    if (status === 413) return 'El archivo es demasiado grande.';
    if (status >= 500) return 'El servidor tuvo un problema. Inténtalo más tarde.';
    return `Error HTTP: ${status}`;
}

/** Deja la sesión de la tienda como «cuenta deshabilitada» (solo soporte) sin cerrarla. */
function marcarCuentaDeshabilitada(): void {
    const sesion = obtenerSesion();
    if (sesion && sesion.usuario.activo !== false) actualizarUsuarioSesion({ ...sesion.usuario, activo: false });
}

export interface OpcionesSesion {
    obtenerToken: () => string | undefined;
    alExpirar: () => void;
    endpointSinExpiracion: string;
}

const SESION_TIENDA: OpcionesSesion = {
    obtenerToken: () => obtenerSesion()?.token,
    alExpirar: () => { limpiarSesion(); window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA)); },
    endpointSinExpiracion: '/auth/login',
};

/**
 * fetch con token, timeout y errores legibles. `opciones` permite reutilizarlo para la sesión del
 * personal de soporte, que es independiente de la de la tienda.
 */
/** Un GET que falla por la infraestructura (gateway o servicio arrancando) se reintenta un par de veces. */
const REINTENTOS_GET = 2;
const ESPERA_REINTENTO_MS = 1500;
const esperar = (ms: number) => new Promise(resolver => setTimeout(resolver, ms));

export async function peticion<T>(endpoint: string, options: RequestInit = {}, opciones: Partial<OpcionesSesion> = {}): Promise<T> {
    const esGet = (options.method ?? 'GET').toUpperCase() === 'GET';
    for (let intento = 0; ; intento++) {
        try {
            return await peticionUnica<T>(endpoint, options, opciones);
        } catch (error) {
            const transitorio = error instanceof ApiError && (error.status === 0 && error.message.startsWith('No se pudo conectar') || [502, 503, 504].includes(error.status) || (error.status === 500 && error.transitorio));
            if (!esGet || !transitorio || intento >= REINTENTOS_GET) throw error;
            await esperar(ESPERA_REINTENTO_MS);
        }
    }
}

async function peticionUnica<T>(endpoint: string, options: RequestInit = {}, opciones: Partial<OpcionesSesion> = {}): Promise<T> {
    const { obtenerToken, alExpirar, endpointSinExpiracion }: OpcionesSesion = { ...SESION_TIENDA, ...opciones };
    const token = obtenerToken();
    const esFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const headers = new Headers(options.headers);
    if (!esFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), config.timeoutMs);
    try {
        const response = await fetch(`${config.apiBaseUrl}${endpoint}`, { ...options, headers, signal: controlador.signal });
        // Solo es "sesión expirada" si se envió un token. Un 401 del login (clave incorrecta) no cierra nada.
        if (response.status === 401 && token && endpoint !== endpointSinExpiracion) alExpirar();
        if (!response.ok) {
            const cuerpo = await response.json().catch(() => null) as Record<string, unknown> | null;
            // El superusuario deshabilitó la cuenta con la sesión abierta: se refleja de inmediato en la interfaz.
            if (response.status === 403 && token && String(cuerpo?.mensaje ?? '').includes('deshabilitada')) marcarCuentaDeshabilitada();
            const falla = new ApiError(mensajeDeCuerpo(cuerpo, response.status), response.status);
            // Un 500 sin "mensaje" no lo generó la app (la app siempre responde con mensaje): es el gateway o un servicio caído.
            falla.transitorio = response.status === 500 && !cuerpo?.mensaje;
            throw falla;
        }
        if (response.status === 204) return null as T;
        return await response.json() as T;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        if (error instanceof Error && error.name === 'AbortError') throw new ApiError('El servidor tardó demasiado en responder.', 0);
        if (error instanceof TypeError) throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión.', 0);
        throw error;
    } finally {
        clearTimeout(temporizador);
    }
}

export const apiFetch = <T>(endpoint: string, options?: RequestInit): Promise<T> => peticion<T>(endpoint, options);
