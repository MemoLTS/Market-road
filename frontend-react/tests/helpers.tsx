import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '../src/context/AuthContext';
import { UiProvider } from '../src/context/UiContext';
import { Router } from '../src/core/router';
import type { Publicacion } from '../src/types/api';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface Montado {
    root: { unmount(): void };
    contenedor: HTMLElement;
}

const montados: Montado[] = [];

/** Renderiza un elemento en el DOM real del navegador (Karma) y devuelve el contenedor. */
export async function montar(elemento: ReactElement): Promise<HTMLElement> {
    const contenedor = document.createElement('div');
    document.body.appendChild(contenedor);
    const root = createRoot(contenedor);
    await act(async () => { root.render(elemento); });
    montados.push({ root, contenedor });
    return contenedor;
}

/** Igual que montar, pero con sesión, modales y enrutador disponibles (como en la app real). */
export const montarConApp = (elemento: ReactElement): Promise<HTMLElement> => montar(<Router><AuthProvider><UiProvider>{elemento}</UiProvider></AuthProvider></Router>);

export async function desmontarTodo(): Promise<void> {
    while (montados.length) {
        const { root, contenedor } = montados.pop() as Montado;
        await act(async () => { root.unmount(); });
        contenedor.remove();
    }
}

/** Escribe en un input/textarea/select controlado por React (usa el setter nativo y dispara el evento). */
export async function escribir(elemento: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, valor: string): Promise<void> {
    const proto = elemento instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype
        : elemento instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
        (Object.getOwnPropertyDescriptor(proto, 'value') as PropertyDescriptor).set?.call(elemento, valor);
        elemento.dispatchEvent(new Event(elemento instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    });
}

export async function clic(elemento: Element | null | undefined): Promise<void> {
    await act(async () => { elemento?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); });
}

export async function enviarFormulario(form: Element | null): Promise<void> {
    await act(async () => { form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
}

/** Deja correr promesas y temporizadores pendientes dentro de act(). */
export async function esperar(ms = 0): Promise<void> {
    await act(async () => { await new Promise(r => setTimeout(r, ms)); });
}

export const texto = (contenedor: HTMLElement): string => (contenedor.textContent ?? '').replace(/\s+/g, ' ').trim();
export const botonPorTexto = (contenedor: HTMLElement, t: string): HTMLButtonElement | undefined =>
    Array.from(contenedor.querySelectorAll('button')).find(b => (b.textContent ?? '').trim() === t);

export function respuestaJson(cuerpo: unknown, status = 200): Response {
    return new Response(status === 204 ? null : JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
}

export function publicacionDePrueba(sobrescribir: Partial<Publicacion> = {}): Publicacion {
    return {
        id: 1, titulo: 'Bicicleta', precio: 150000, descripcion: 'Aro 29', ubicacion: 'Concepción', categoria: 'DEPORTES',
        categoriaNombre: 'Deportes y ocio', modalidadesEntrega: [], latitud: null, longitud: null, distanciaKm: null,
        usuarioId: 1, vendedorApodo: 'demo', estado: 'ACTIVA' as const, fechaCreacion: '2026-10-01T10:00:00Z', imagenUrls: ['data:image/png;base64,AAAA'], unidades: 1,
        ...sobrescribir,
    };
}
