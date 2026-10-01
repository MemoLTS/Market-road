import { apiFetch } from './api.js';
import { conBoton, mensajeDeError, mostrarAlerta, ocultarAlerta, opcionalPorId } from './util.js';
import {
    primerError, validarApodo, validarContrasenaNueva, validarCorreo, validarNombre,
} from './validaciones.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = opcionalPorId<HTMLFormElement>('formRegistro');
    form?.addEventListener('submit', registrarUsuario);

    // Validación en vivo: marca el campo cuando pierde el foco.
    const reglas: Record<string, (v: string) => string | null> = {
        regNombre: v => validarNombre(v, 'El nombre'),
        regApellido: v => validarNombre(v, 'El apellido'),
        regApodo: validarApodo,
        regCorreo: validarCorreo,
        regContrasena: validarContrasenaNueva,
    };
    for (const [id, regla] of Object.entries(reglas)) {
        const input = opcionalPorId<HTMLInputElement>(id);
        input?.addEventListener('blur', () => {
            if (input.value === '') return;
            const error = regla(input.value);
            input.setCustomValidity(error ?? '');
            input.classList.toggle('is-invalid', error !== null);
            input.classList.toggle('is-valid', error === null);
            input.title = error ?? '';
        });
    }
});

interface DatosRegistro {
    nombre: string;
    apellido: string;
    apodo: string;
    correo: string;
    contrasena: string;
}

function leerCampo(id: string): string {
    return opcionalPorId<HTMLInputElement>(id)?.value ?? '';
}

function validarRegistro(d: DatosRegistro): string | null {
    return primerError(
        !d.nombre || !d.apellido || !d.apodo || !d.correo || !d.contrasena ? 'Completa todos los campos.' : null,
        validarNombre(d.nombre, 'El nombre'),
        validarNombre(d.apellido, 'El apellido'),
        validarApodo(d.apodo),
        validarCorreo(d.correo),
        validarContrasenaNueva(d.contrasena),
    );
}

async function registrarUsuario(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const alerta = opcionalPorId('registroAlerta');
    ocultarAlerta(alerta);

    const datos: DatosRegistro = {
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
        await conBoton(opcionalPorId<HTMLButtonElement>('btnRegistrar'), 'Creando...', async () => {
            await apiFetch('/usuarios', { method: 'POST', body: JSON.stringify(datos) });
            mostrarAlerta(alerta, '¡Usuario registrado con éxito! Ya puedes iniciar sesión.', 'success');
            form.reset();
            form.querySelectorAll('.is-valid, .is-invalid').forEach(el => el.classList.remove('is-valid', 'is-invalid'));
        });
    } catch (e) {
        // El backend responde 409 si el correo o el apodo ya están en uso; se muestra tal cual.
        mostrarAlerta(alerta, mensajeDeError(e, 'Error al registrar. Verifica tu conexión.'));
    }
}
