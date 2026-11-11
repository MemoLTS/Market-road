import type { LoginSoporteRespuesta, PersonalSoporte } from '../types/soporte';
import { peticion } from './http';

/**
 * Sesión del PERSONAL de soporte: independiente de la de la tienda (otra clave, otro token).
 * Vive en sessionStorage: se cierra al cerrar la pestaña, pensado para equipos compartidos.
 */
export const CLAVE_SESION_SOPORTE = 'mr_soporte_session';
export const EVENTO_SESION_SOPORTE = 'mr:soporte-sesion-cambiada';

export interface SesionSoporte {
    token: string;
    personal: PersonalSoporte;
    expiraEn: number;
}

export function guardarSesionSoporte({ token, expiraEnMs, personal }: LoginSoporteRespuesta): SesionSoporte {
    const sesion: SesionSoporte = { token, personal, expiraEn: Date.now() + (expiraEnMs || 0) };
    sessionStorage.setItem(CLAVE_SESION_SOPORTE, JSON.stringify(sesion));
    window.dispatchEvent(new CustomEvent(EVENTO_SESION_SOPORTE));
    return sesion;
}

export function obtenerSesionSoporte(): SesionSoporte | null {
    const crudo = sessionStorage.getItem(CLAVE_SESION_SOPORTE);
    if (!crudo) return null;
    try {
        const sesion = JSON.parse(crudo) as Partial<SesionSoporte> | null;
        if (!sesion || typeof sesion.token !== 'string' || !sesion.personal
            || typeof sesion.expiraEn !== 'number' || sesion.expiraEn <= Date.now()) {
            sessionStorage.removeItem(CLAVE_SESION_SOPORTE);
            return null;
        }
        return sesion as SesionSoporte;
    } catch {
        sessionStorage.removeItem(CLAVE_SESION_SOPORTE);
        return null;
    }
}

export function limpiarSesionSoporte(): void {
    sessionStorage.removeItem(CLAVE_SESION_SOPORTE);
    window.dispatchEvent(new CustomEvent(EVENTO_SESION_SOPORTE));
}

export const soporteFetch = <T>(endpoint: string, options?: RequestInit): Promise<T> => peticion<T>(endpoint, options, {
    obtenerToken: () => obtenerSesionSoporte()?.token,
    alExpirar: limpiarSesionSoporte,
    endpointSinExpiracion: '/soporte/panel/auth/login',
});
