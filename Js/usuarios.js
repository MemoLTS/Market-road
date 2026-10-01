import { apiFetch } from './api.js';
import { conBoton, mensajeDeError, mostrarAlerta, ocultarAlerta, opcionalPorId } from './util.js';
import { primerError, validarApodo, validarContrasenaNueva, validarCorreo, validarNombre, } from './validaciones.js';
document.addEventListener('DOMContentLoaded', () => {
    const form = opcionalPorId('formRegistro');
    form?.addEventListener('submit', registrarUsuario);
    // Validación en vivo: marca el campo cuando pierde el foco.
    const reglas = {
        regNombre: v => validarNombre(v, 'El nombre'),
        regApellido: v => validarNombre(v, 'El apellido'),
        regApodo: validarApodo,
        regCorreo: validarCorreo,
        regContrasena: validarContrasenaNueva,
    };
    for (const [id, regla] of Object.entries(reglas)) {
        const input = opcionalPorId(id);
        input?.addEventListener('blur', () => {
            if (input.value === '')
                return;
            const error = regla(input.value);
            input.setCustomValidity(error ?? '');
            input.classList.toggle('is-invalid', error !== null);
            input.classList.toggle('is-valid', error === null);
            input.title = error ?? '';
        });
    }
});
function leerCampo(id) {
    return opcionalPorId(id)?.value ?? '';
}
function validarRegistro(d) {
    return primerError(!d.nombre || !d.apellido || !d.apodo || !d.correo || !d.contrasena ? 'Completa todos los campos.' : null, validarNombre(d.nombre, 'El nombre'), validarNombre(d.apellido, 'El apellido'), validarApodo(d.apodo), validarCorreo(d.correo), validarContrasenaNueva(d.contrasena));
}
async function registrarUsuario(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const alerta = opcionalPorId('registroAlerta');
    ocultarAlerta(alerta);
    const datos = {
        nombre: leerCampo('regNombre').trim(),
        apellido: leerCampo('regApellido').trim(),
        apodo: leerCampo('regApodo').trim(),
        correo: leerCampo('regCorreo').trim(),
        contrasena: leerCampo('regContrasena'),
    };
    const error = validarRegistro(datos);
    if (error) {
        mostrarAlerta(alerta, error);
        return;
    }
    try {
        await conBoton(opcionalPorId('btnRegistrar'), 'Creando...', async () => {
            await apiFetch('/usuarios', { method: 'POST', body: JSON.stringify(datos) });
            mostrarAlerta(alerta, '¡Usuario registrado con éxito! Ya puedes iniciar sesión.', 'success');
            form.reset();
            form.querySelectorAll('.is-valid, .is-invalid').forEach(el => el.classList.remove('is-valid', 'is-invalid'));
        });
    }
    catch (e) {
        // El backend responde 409 si el correo o el apodo ya están en uso; se muestra tal cual.
        mostrarAlerta(alerta, mensajeDeError(e, 'Error al registrar. Verifica tu conexión.'));
    }
}
