import { apiFetch, CLAVE_SESION, guardarSesion, limpiarSesion, obtenerSesion, urlAbsoluta, usuarioActual } from './api.js';
import { conBoton, mensajeDeError, mostrarAlerta, ocultarAlerta, opcionalPorId } from './util.js';
import { LIMITES, primerError, validarCorreo } from './validaciones.js';
const CLAVE_DISPOSITIVO = 'mr_device_id';
document.addEventListener('DOMContentLoaded', () => {
    actualizarNavegacion();
    opcionalPorId('formLogin')?.addEventListener('submit', manejarLogin);
    opcionalPorId('btnCerrarSesion')?.addEventListener('click', manejarLogout);
});
// La sesión vive en localStorage: si se inicia o cierra en otra pestaña, esta se actualiza sola.
window.addEventListener('storage', (e) => {
    if (e.key !== CLAVE_SESION && e.key !== null)
        return;
    actualizarNavegacion();
    window.dispatchEvent(new CustomEvent('mr:sesion-cambiada'));
});
window.addEventListener('mr:foto-perfil-actualizada', actualizarNavegacion);
// Al volver a la pestaña se revisa el vencimiento (obtenerSesion limpia el token si ya expiró).
document.addEventListener('visibilitychange', () => {
    if (!document.hidden)
        actualizarNavegacion();
});
// Si api.ts detecta un 401, se actualiza la UI y se avisa en vez de dejar una sesión "fantasma".
window.addEventListener('mr:sesion-expirada', () => {
    actualizarNavegacion();
    alert('Tu sesión expiró o no es válida. Por favor inicia sesión nuevamente.');
});
async function manejarLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const alerta = opcionalPorId('loginAlerta');
    ocultarAlerta(alerta);
    const correo = opcionalPorId('loginCorreo')?.value.trim() ?? '';
    const contrasena = opcionalPorId('loginContrasena')?.value ?? '';
    const error = primerError(!correo || !contrasena ? 'Completa correo y contraseña.' : null, validarCorreo(correo), contrasena.length < LIMITES.contrasena.min ? `La contraseña debe tener al menos ${LIMITES.contrasena.min} caracteres.` : null, contrasena.length > LIMITES.contrasena.max ? `La contraseña puede tener como máximo ${LIMITES.contrasena.max} caracteres.` : null);
    if (error) {
        mostrarAlerta(alerta, error);
        return;
    }
    try {
        await conBoton(opcionalPorId('btnLogin'), 'Entrando...', async () => {
            const datos = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ correo, contrasena, dispositivoId: obtenerDispositivoId() }),
            });
            guardarSesion(datos);
            actualizarNavegacion();
            window.dispatchEvent(new CustomEvent('mr:sesion-cambiada'));
            const modalEl = opcionalPorId('modalLogin');
            if (modalEl)
                bootstrap.Modal.getOrCreateInstance(modalEl).hide();
            form.reset();
        });
    }
    catch (e) {
        mostrarAlerta(alerta, mensajeDeError(e, 'No se pudo iniciar sesión.'));
    }
}
function obtenerDispositivoId() {
    const guardado = localStorage.getItem(CLAVE_DISPOSITIVO);
    if (guardado && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guardado)) {
        return guardado;
    }
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    localStorage.setItem(CLAVE_DISPOSITIVO, id);
    return id;
}
async function manejarLogout() {
    try {
        // Best effort: si falla (sin conexión), igual se cierra la sesión localmente.
        await apiFetch('/auth/logout', { method: 'POST' });
    }
    catch (e) {
        console.warn('No se pudo notificar el logout al servidor:', mensajeDeError(e));
    }
    finally {
        limpiarSesion();
        actualizarNavegacion();
        window.dispatchEvent(new CustomEvent('mr:sesion-cambiada'));
        // En páginas que exigen sesión (mensajes) se vuelve al inicio.
        if (document.body.dataset['requiereSesion'] === 'true')
            window.location.href = 'index.html';
    }
}
export function actualizarNavegacion() {
    const sesion = obtenerSesion();
    opcionalPorId('navAuthInvitado')?.classList.toggle('d-none', sesion !== null);
    opcionalPorId('navAuthUsuario')?.classList.toggle('d-none', sesion === null);
    const apodo = opcionalPorId('navApodoUsuario');
    if (apodo && sesion)
        apodo.textContent = usuarioActual()?.apodo || 'Usuario';
    const foto = opcionalPorId('navFotoPerfil');
    const iconoFoto = opcionalPorId('navIconoPerfil');
    if (foto && iconoFoto) {
        foto.classList.add('d-none');
        iconoFoto.classList.toggle('d-none', sesion === null);
        if (sesion) {
            foto.onload = () => {
                foto.classList.remove('d-none');
                iconoFoto.classList.add('d-none');
            };
            foto.onerror = () => {
                foto.classList.add('d-none');
                iconoFoto.classList.remove('d-none');
            };
            foto.src = urlAbsoluta(`/api/v1/usuarios/${sesion.usuario.id}/foto?v=${Date.now()}`);
        }
    }
}
