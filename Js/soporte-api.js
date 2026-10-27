import { API_BASE_URL, ApiError } from './api.js';
/**
 * Sesión del PERSONAL de soporte: es independiente de la sesión de las personas usuarias de la tienda
 * (otra clave, otro token). Se guarda en sessionStorage: se cierra al cerrar la pestaña, pensado para equipos compartidos.
 */
export const CLAVE_SESION_SOPORTE = 'mr_soporte_session';
const TIMEOUT_MS = 20000;
export function guardarSesionSoporte({ token, expiraEnMs, personal }) {
    const sesion = { token, personal, expiraEn: Date.now() + (expiraEnMs || 0) };
    sessionStorage.setItem(CLAVE_SESION_SOPORTE, JSON.stringify(sesion));
    return sesion;
}
export function obtenerSesionSoporte() {
    const crudo = sessionStorage.getItem(CLAVE_SESION_SOPORTE);
    if (!crudo)
        return null;
    try {
        const sesion = JSON.parse(crudo);
        if (!sesion || typeof sesion.token !== 'string' || !sesion.personal || typeof sesion.expiraEn !== 'number'
            || sesion.expiraEn <= Date.now()) {
            limpiarSesionSoporte();
            return null;
        }
        return sesion;
    }
    catch {
        limpiarSesionSoporte();
        return null;
    }
}
export function limpiarSesionSoporte() {
    sessionStorage.removeItem(CLAVE_SESION_SOPORTE);
}
export function actualizarPersonalSesion(personal) {
    const sesion = obtenerSesionSoporte();
    if (!sesion)
        return;
    sessionStorage.setItem(CLAVE_SESION_SOPORTE, JSON.stringify({ ...sesion, personal }));
}
function mensajeDeCuerpo(cuerpo, status) {
    if (cuerpo) {
        if (typeof cuerpo.mensaje === 'string' && cuerpo.mensaje)
            return cuerpo.mensaje;
        const primero = Object.values(cuerpo).find((v) => typeof v === 'string' && v.length > 0);
        if (primero)
            return primero;
    }
    if (status === 429)
        return 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.';
    if (status >= 500)
        return 'El servidor tuvo un problema. Inténtalo más tarde.';
    return `Error HTTP: ${status}`;
}
/** Igual que apiFetch, pero con el token del personal de soporte. Un 401 con sesión cierra la sesión del panel. */
export async function soporteFetch(endpoint, options = {}) {
    const sesion = obtenerSesionSoporte();
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type'))
        headers.set('Content-Type', 'application/json');
    if (sesion?.token)
        headers.set('Authorization', `Bearer ${sesion.token}`);
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers, signal: controlador.signal });
        if (response.status === 401 && sesion?.token) {
            limpiarSesionSoporte();
            window.dispatchEvent(new CustomEvent('mr:soporte-sesion-expirada'));
        }
        if (!response.ok) {
            const cuerpo = (await response.json().catch(() => null));
            throw new ApiError(mensajeDeCuerpo(cuerpo, response.status), response.status);
        }
        if (response.status === 204)
            return null;
        return (await response.json());
    }
    catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new ApiError('El servidor tardó demasiado en responder.', 0);
        }
        if (error instanceof TypeError) {
            throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión.', 0);
        }
        throw error;
    }
    finally {
        clearTimeout(temporizador);
    }
}
