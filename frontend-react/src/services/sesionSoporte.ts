import type { LoginSoporteRespuesta, PersonalSoporte } from '../types/soporte';
import { peticion } from './http';

/**
 * Sesión del PERSONAL de soporte: independiente de la de la tienda (otra clave, otro token).
 * Vive en localStorage (dura lo que el token, 8 h): así el personal no vuelve a ingresar al recargar ni al abrir otra pestaña.
 * Se borra al cerrar sesión en el panel o en la tienda (equipos compartidos).
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
    localStorage.setItem(CLAVE_SESION_SOPORTE, JSON.stringify(sesion));
    window.dispatchEvent(new CustomEvent(EVENTO_SESION_SOPORTE));
    return sesion;
}

export function obtenerSesionSoporte(): SesionSoporte | null {
    const crudo = localStorage.getItem(CLAVE_SESION_SOPORTE);
    if (!crudo) return null;
    try {
        const sesion = JSON.parse(crudo) as Partial<SesionSoporte> | null;
        if (!sesion || typeof sesion.token !== 'string' || !sesion.personal
            || typeof sesion.expiraEn !== 'number' || sesion.expiraEn <= Date.now()) {
            localStorage.removeItem(CLAVE_SESION_SOPORTE);
            return null;
        }
        return sesion as SesionSoporte;
    } catch {
        localStorage.removeItem(CLAVE_SESION_SOPORTE);
        return null;
    }
}

export function limpiarSesionSoporte(): void {
    localStorage.removeItem(CLAVE_SESION_SOPORTE);
    window.dispatchEvent(new CustomEvent(EVENTO_SESION_SOPORTE));
}

export const soporteFetch = <T>(endpoint: string, options?: RequestInit): Promise<T> => peticion<T>(endpoint, options, {
    obtenerToken: () => obtenerSesionSoporte()?.token,
    alExpirar: limpiarSesionSoporte,
    endpointSinExpiracion: '/soporte/panel/auth/login',
});
