import type { Sesion, Usuario } from '../types/api';

/** Sesión de la persona usuaria (token + usuario) en localStorage. Misma clave que el frontend original. */
export const CLAVE_SESION = 'mr_session';
export const EVENTO_SESION = 'mr:sesion-cambiada';
export const EVENTO_SESION_EXPIRADA = 'mr:sesion-expirada';

export interface DatosSesion {
    token: string;
    expiraEnMs: number;
    usuario: Usuario;
}

export function guardarSesion({ token, expiraEnMs, usuario }: DatosSesion): Sesion {
    const sesion: Sesion = { token, usuario, expiraEn: Date.now() + (expiraEnMs || 0) };
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    window.dispatchEvent(new CustomEvent(EVENTO_SESION));
    return sesion;
}

export function obtenerSesion(): Sesion | null {
    // El acceso a localStorage también puede lanzar (modo privado/restricciones del navegador).
    try {
        const raw = localStorage.getItem(CLAVE_SESION);
        if (!raw) return null;
        const sesion = JSON.parse(raw) as Partial<Sesion> | null;
        if (!sesion || !sesion.token || !sesion.usuario) return null;
        if (sesion.expiraEn && Date.now() >= sesion.expiraEn) {
            localStorage.removeItem(CLAVE_SESION);
            return null;
        }
        return sesion as Sesion;
    } catch {
        // No permitimos que una sesión corrupta o un almacenamiento bloqueado impida montar React.
        try { localStorage.removeItem(CLAVE_SESION); } catch { /* almacenamiento no disponible */ }
        return null;
    }
}

export function limpiarSesion(): void {
    localStorage.removeItem(CLAVE_SESION);
    window.dispatchEvent(new CustomEvent(EVENTO_SESION));
}

export function actualizarUsuarioSesion(usuario: Usuario): void {
    const sesion = obtenerSesion();
    if (!sesion) return;
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ ...sesion, usuario }));
    window.dispatchEvent(new CustomEvent(EVENTO_SESION));
}

export function esSuperusuario(sesion: Sesion | null = obtenerSesion()): boolean {
    return sesion?.usuario?.rol === 'SUPERUSUARIO';
}
