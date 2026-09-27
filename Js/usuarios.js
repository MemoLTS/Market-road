import { apiFetch } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // Captura el formulario o cualquier botón dentro del modal
    const formRegistro = document.getElementById('form-registro') || document.querySelector('form');
    if (formRegistro) {
        formRegistro.addEventListener('submit', handleRegistroUsuario);
    }

    // Evento secundario por si el botón "Crear cuenta" no es tipo submit
    document.addEventListener('click', (e) => {
        if (e.target && (e.target.matches('#btn-crear-cuenta') || e.target.textContent.trim() === 'Crear cuenta')) {
            const form = e.target.closest('.modal') ? e.target.closest('.modal').querySelector('form') : document.querySelector('form');
            if (form) {
                e.preventDefault();
                handleRegistroUsuario({ preventDefault: () => { }, target: form });
            }
        }
    });
});

// Extrae inteligentemente los datos de los inputs presentes en la pantalla
function extraerDatosFormulario() {
    const inputs = Array.from(document.querySelectorAll('input'));

    let nombre = '', apellido = '', apodo = '', correo = '', contrasena = '';

    inputs.forEach(input => {
        const id = (input.id || '').toLowerCase();
        const name = (input.name || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();
        const type = (input.type || '').toLowerCase();
        const val = input.value.trim();

        if (!val) return;

        // Identificación de Correo
        if (type === 'email' || id.includes('correo') || name.includes('correo') || id.includes('email') || name.includes('email') || placeholder.includes('correo')) {
            correo = val;
        }
        // Identificación de Contraseña
        else if (type === 'password' || id.includes('contra') || name.includes('contra') || id.includes('pass') || placeholder.includes('contra')) {
            contrasena = val;
        }
        // Identificación de Apellido
        else if (id.includes('apellido') || name.includes('apellido') || placeholder.includes('apellido')) {
            apellido = val;
        }
        // Identificación de Apodo
        else if (id.includes('apodo') || name.includes('apodo') || placeholder.includes('apodo') || id.includes('nick')) {
            apodo = val;
        }
        // Identificación de Nombre
        else if (id.includes('nombre') || name.includes('nombre') || placeholder.includes('nombre') || id.includes('first')) {
            nombre = val;
        }
    });

    return {
        nombre,
        apellido: apellido || 'Sin Apellido',
        apodo: apodo || nombre || 'User',
        correo,
        contrasena
    };
}

async function handleRegistroUsuario(event) {
    if (event && event.preventDefault) event.preventDefault();

    const feedbackEl = document.getElementById('form-feedback') || document.querySelector('.modal-body');

    // Obtener los datos desde los inputs de la pantalla
    const formData = extraerDatosFormulario();

    // Validaciones del cliente
    if (!formData.nombre || !formData.correo || !formData.contrasena) {
        alert('Por favor completa todos los campos obligatorios (Nombre, Correo y Contraseña).');
        return;
    }

    if (formData.contrasena.length < 8) {
        alert('La contraseña debe tener al menos 8 caracteres.');
        return;
    }

    try {
        await apiFetch('/usuarios', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        alert('¡Usuario registrado con éxito!');

        // Limpiar inputs del modal
        document.querySelectorAll('input').forEach(input => input.value = '');

        // Recargar la lista de usuarios si existe la función
        if (typeof window.cargarUsuarios === 'function') {
            window.cargarUsuarios();
        }
    } catch (error) {
        alert('Error al registrar: ' + (error.message || 'Error de conexión'));
    }
}