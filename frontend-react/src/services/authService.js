import { config } from '../config.js';
import * as bd from '../data/baseDatos.js';
import { apiFetch } from './http.js';
import { actualizarUsuarioSesion, guardarSesion, limpiarSesion, obtenerSesion } from './sesion.js';

const CLAVE_DISPOSITIVO = 'mr_device_id';

/** UUID v4 persistente por navegador: el backend lo usa para listar "mis dispositivos". */
export function obtenerDispositivoId() {
    const guardado = localStorage.getItem(CLAVE_DISPOSITIVO);
    if (guardado && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guardado)) return guardado;
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    localStorage.setItem(CLAVE_DISPOSITIVO, id);
    return id;
}

export const authService = {
    async login(correo, contrasena) {
        const datos = config.usarMock
            ? bd.autenticar(correo, contrasena)
            : await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ correo, contrasena, dispositivoId: obtenerDispositivoId() }) });
        guardarSesion(datos);
        return datos.usuario;
    },

    /** Crea la cuenta y deja la sesión iniciada. Si el login automático falla, lo informa con `sesionIniciada: false`. */
    async registrar(datos) {
        if (config.usarMock) bd.registrarUsuario(datos);
        else await apiFetch('/usuarios', { method: 'POST', body: JSON.stringify(datos) });
        try {
            await this.login(datos.correo, datos.contrasena);
            return { sesionIniciada: true };
        } catch {
            return { sesionIniciada: false };
        }
    },

    async logout() {
        try {
            if (!config.usarMock) await apiFetch('/auth/logout', { method: 'POST' });
        } catch { /* mejor esfuerzo: igual se cierra la sesión localmente */ } finally {
            limpiarSesion();
        }
    },

    async actualizarPerfil(cambios) {
        const sesion = obtenerSesion();
        const usuario = config.usarMock
            ? bd.actualizarUsuario(sesion.usuario.id, cambios)
            : await apiFetch(`/usuarios/${sesion.usuario.id}`, { method: 'PATCH', body: JSON.stringify(cambios) });
        actualizarUsuarioSesion(usuario);
        return usuario;
    },

    async cambiarCorreo(correo, contrasenaActual) {
        const sesion = obtenerSesion();
        if (config.usarMock) throw new Error('Esta acción requiere el backend real.');
        const usuario = await apiFetch(`/usuarios/${sesion.usuario.id}/correo`, { method: 'PATCH', body: JSON.stringify({ correo, contrasenaActual }) });
        actualizarUsuarioSesion(usuario);
        return usuario;
    },

    async subirFoto(archivo) {
        const sesion = obtenerSesion();
        if (config.usarMock) throw new Error('Esta acción requiere el backend real.');
        const form = new FormData();
        form.append('foto', archivo);
        await apiFetch(`/usuarios/${sesion.usuario.id}/foto`, { method: 'PUT', body: form });
    },

    dispositivos() {
        const sesion = obtenerSesion();
        return config.usarMock ? Promise.resolve([]) : apiFetch(`/usuarios/${sesion.usuario.id}/dispositivos`);
    },
};
