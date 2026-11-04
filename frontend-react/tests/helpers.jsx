import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { UiProvider } from '../src/context/UiContext.jsx';
import { Router } from '../src/core/router.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const montados = [];

/** Renderiza un elemento en el DOM real del navegador (Karma) y devuelve el contenedor. */
export async function montar(elemento) {
    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    const root = createRoot(contenedor);
    await act(async () => { root.render(elemento); });
    montados.push({ root, contenedor });
    return contenedor;
}

/** Igual que montar, pero con sesión, modales y enrutador disponibles (como en la app real). */
export const montarConApp = elemento => montar(<Router><AuthProvider><UiProvider>{elemento}</UiProvider></AuthProvider></Router>);

export async function desmontarTodo() {
    while (montados.length) {
        const { root, contenedor } = montados.pop();
        await act(async () => { root.unmount(); });
        contenedor.remove();
    }
}

/** Escribe en un input/textarea/select controlado por React (usa el setter nativo y dispara el evento). */
export async function escribir(elemento, valor) {
    const proto = elemento instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
        : elemento instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(elemento, valor);
        elemento.dispatchEvent(new Event(elemento instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    });
}

export async function clic(elemento) {
    await act(async () => { elemento.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); });
}

export async function enviarFormulario(form) {
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
}

/** Deja correr promesas y temporizadores pendientes dentro de act(). */
export async function esperar(ms = 0) {
    await act(async () => { await new Promise(r => setTimeout(r, ms)); });
}

export const texto = contenedor => contenedor.textContent.replace(/\s+/g, ' ').trim();
export const botonPorTexto = (contenedor, t) => Array.from(contenedor.querySelectorAll('button')).find(b => b.textContent.trim() === t);

export function respuestaJson(cuerpo, status = 200) {
    return new Response(status === 204 ? null : JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
}

export function publicacionDePrueba(sobrescribir = {}) {
    return {
        id: 1, titulo: 'Bicicleta', precio: 150000, descripcion: 'Aro 29', ubicacion: 'Concepción', categoria: 'DEPORTES',
        categoriaNombre: 'Deportes y ocio', modalidadesEntrega: [], latitud: null, longitud: null, distanciaKm: null,
        usuarioId: 1, vendedorApodo: 'demo', estado: 'ACTIVA', fechaCreacion: '2026-10-01T10:00:00Z', imagenUrls: ['data:image/png;base64,AAAA'],
        ...sobrescribir,
    };
}
