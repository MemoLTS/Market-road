import { peticion } from './http.js';

/**
 * Sesión del PERSONAL de soporte: independiente de la de la tienda (otra clave, otro token).
 * Vive en sessionStorage: se cierra al cerrar la pestaña, pensado para equipos compartidos.
 */
export const CLAVE_SESION_SOPORTE = 'mr_soporte_session';
export const EVENTO_SESION_SOPORTE = 'mr:soporte-sesion-cambiada';

export function guardarSesionSoporte({ token, expiraEnMs, personal }) {
    const sesion = { token, personal, expiraEn: Date.now() + (expiraEnMs || 0) };
    sessionStorage.setItem(CLAVE_SESION_SOPORTE, JSON.stringify(sesion));
    window.dispatchEvent(new CustomEvent(EVENTO_SESION_SOPORTE));
    return sesion;
}

export function obtenerSesionSoporte() {
    const crudo = sessionStorage.getItem(CLAVE_SESION_SOPORTE);
    if (!crudo) return null;
    try {
        const sesion = JSON.parse(crudo);
        if (!sesion || typeof sesion.token !== 'string' || !sesion.personal
            || typeof sesion.expiraEn !== 'number' || sesion.expiraEn <= Date.now()) {
            sessionStorage.removeItem(CLAVE_SESION_SOPORTE);
            return null;
        }
        return sesion;
    } catch {
        sessionStorage.removeItem(CLAVE_SESION_SOPORTE);
        return null;
    }
}

export function limpiarSesionSoporte() {
    sessionStorage.removeItem(CLAVE_SESION_SOPORTE);
    window.dispatchEvent(new CustomEvent(EVENTO_SESION_SOPORTE));
}

export const soporteFetch = (endpoint, options) => peticion(endpoint, options, {
    obtenerToken: () => obtenerSesionSoporte()?.token,
    alExpirar: limpiarSesionSoporte,
    endpointSinExpiracion: '/soporte/panel/auth/login',
});
