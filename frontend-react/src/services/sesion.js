/** Sesión de la persona usuaria (token + usuario) en localStorage. Misma clave que el frontend original. */
export const CLAVE_SESION = 'mr_session';
export const EVENTO_SESION = 'mr:sesion-cambiada';
export const EVENTO_SESION_EXPIRADA = 'mr:sesion-expirada';

export function guardarSesion({ token, expiraEnMs, usuario }) {
    const sesion = { token, usuario, expiraEn: Date.now() + (expiraEnMs || 0) };
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    window.dispatchEvent(new CustomEvent(EVENTO_SESION));
    return sesion;
}

export function obtenerSesion() {
    const raw = localStorage.getItem(CLAVE_SESION);
    if (!raw) return null;
    try {
        const sesion = JSON.parse(raw);
        if (!sesion || !sesion.token || !sesion.usuario) return null;
        if (sesion.expiraEn && Date.now() >= sesion.expiraEn) {
            localStorage.removeItem(CLAVE_SESION);
            return null;
        }
        return sesion;
    } catch {
        localStorage.removeItem(CLAVE_SESION);
        return null;
    }
}

export function limpiarSesion() {
    localStorage.removeItem(CLAVE_SESION);
    window.dispatchEvent(new CustomEvent(EVENTO_SESION));
}

export function actualizarUsuarioSesion(usuario) {
    const sesion = obtenerSesion();
    if (!sesion) return;
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ ...sesion, usuario }));
    window.dispatchEvent(new CustomEvent(EVENTO_SESION));
}

export function esSuperusuario(sesion = obtenerSesion()) {
    return sesion?.usuario?.rol === 'SUPERUSUARIO';
}
