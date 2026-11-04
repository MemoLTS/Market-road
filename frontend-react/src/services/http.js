import { config } from '../config.js';
import { EVENTO_SESION_EXPIRADA, limpiarSesion, obtenerSesion } from './sesion.js';

/** Error de la API con el código HTTP, para distinguir 404, 409, 429, etc. */
export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

/** La API devuelve rutas relativas para las imágenes: se completan con el origen del gateway. */
export function urlAbsoluta(ruta) {
    if (!ruta || /^(https?:|data:|blob:)/i.test(ruta)) return ruta;
    return new URL(ruta, config.apiBaseUrl).href;
}

export function mensajeDeCuerpo(cuerpo, status) {
    if (cuerpo) {
        const directo = cuerpo.error ?? cuerpo.mensaje ?? cuerpo.message;
        if (typeof directo === 'string' && directo) return directo;
        const primero = Object.values(cuerpo).find(v => typeof v === 'string' && v.length > 0);
        if (primero) return primero;
    }
    if (status === 429) return 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.';
    if (status === 413) return 'El archivo es demasiado grande.';
    if (status >= 500) return 'El servidor tuvo un problema. Inténtalo más tarde.';
    return `Error HTTP: ${status}`;
}

/**
 * fetch con token, timeout y errores legibles. `obtenerToken` y `alExpirar` permiten reutilizarlo
 * para la sesión del personal de soporte, que es independiente de la tienda.
 */
export async function peticion(endpoint, options = {}, {
    obtenerToken = () => obtenerSesion()?.token,
    alExpirar = () => { limpiarSesion(); window.dispatchEvent(new CustomEvent(EVENTO_SESION_EXPIRADA)); },
    endpointSinExpiracion = '/auth/login',
} = {}) {
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
            const cuerpo = await response.json().catch(() => null);
            throw new ApiError(mensajeDeCuerpo(cuerpo, response.status), response.status);
        }
        if (response.status === 204) return null;
        return await response.json();
    } catch (error) {
        if (error instanceof ApiError) throw error;
        if (error && error.name === 'AbortError') throw new ApiError('El servidor tardó demasiado en responder.', 0);
        if (error instanceof TypeError) throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión.', 0);
        throw error;
    } finally {
        clearTimeout(temporizador);
    }
}

export const apiFetch = (endpoint, options) => peticion(endpoint, options);
