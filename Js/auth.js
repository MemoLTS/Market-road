import { apiFetch, guardarSesion, limpiarSesion, obtenerSesion, usuarioActual } from './api.js';
import { conBoton, mensajeDeError, mostrarAlerta, ocultarAlerta, opcionalPorId } from './util.js';
import { LIMITES, primerError, validarCorreo } from './validaciones.js';
document.addEventListener('DOMContentLoaded', () => {
    actualizarNavegacion();
    opcionalPorId('formLogin')?.addEventListener('submit', manejarLogin);
    opcionalPorId('btnCerrarSesion')?.addEventListener('click', manejarLogout);
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
                body: JSON.stringify({ correo, contrasena }),
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
}
