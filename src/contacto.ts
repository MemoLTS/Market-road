import { apiFetch, obtenerSesion } from './api.js';
import type { ConversacionDetalle, ConversacionResumen, Publicacion } from './tipos.js';
import { conBoton, escapeHtml, mensajeDeError, mostrarAlerta, ocultarAlerta, opcionalPorId } from './util.js';
import { LIMITES, validarMensaje } from './validaciones.js';

const INTERVALO_BADGE_MS = 30000;

document.addEventListener('DOMContentLoaded', () => {
    void actualizarBadge();
    setInterval(() => { if (!document.hidden) void actualizarBadge(); }, INTERVALO_BADGE_MS);
    window.addEventListener('mr:sesion-expirada', () => void actualizarBadge());
    window.addEventListener('mr:sesion-cambiada', () => void actualizarBadge());
});

/** Contador de mensajes sin leer en el menú de usuario. */
export async function actualizarBadge(): Promise<void> {
    const badge = opcionalPorId('badgeNoLeidos');
    if (!badge) return;
    if (!obtenerSesion()) {
        badge.classList.add('d-none');
        return;
    }
    try {
        const { total } = await apiFetch<{ total: number }>('/conversaciones/no-leidos');
        badge.textContent = total > 99 ? '99+' : String(total);
        badge.classList.toggle('d-none', total === 0);
    } catch { /* sin conexión: se conserva el valor anterior */ }
}

/** Panel inferior del detalle de una publicación: escribir al vendedor, o ver los interesados si es mía. */
export async function montarPanelContacto(contenedor: HTMLElement, publicacion: Publicacion): Promise<void> {
    const sesion = obtenerSesion();
    if (!sesion) {
        contenedor.innerHTML = '<p class="text-muted mb-0">Inicia sesión para contactar al vendedor.</p>';
        return;
    }

    if (sesion.usuario.id === publicacion.usuarioId) {
        let conversaciones: ConversacionResumen[] = [];
        try {
            conversaciones = await apiFetch<ConversacionResumen[]>(`/conversaciones?publicacionId=${publicacion.id}`);
        } catch { /* se muestra sin el contador */ }
        const n = conversaciones.length;
        const sinLeer = conversaciones.reduce((acc, c) => acc + c.noLeidos, 0);
        contenedor.innerHTML = `
            <p class="mb-2">Esta es tu publicación (${escapeHtml(publicacion.estado.toLowerCase())}).
                ${n ? `Tienes ${n} conversación(es) con interesados${sinLeer ? `, ${sinLeer} mensaje(s) sin leer` : ''}.` : 'Aún nadie te ha escrito.'}</p>
            ${n ? `<a class="btn btn-primary btn-sm" href="mensajes.html?p=${publicacion.id}"><i class="bi bi-chat-dots"></i> Ver mensajes</a>` : ''}`;
        return;
    }

    if (publicacion.estado !== 'ACTIVA') {
        contenedor.innerHTML = '<p class="text-muted mb-0">Esta publicación ya no está disponible.</p>';
        return;
    }

    // Si ya hay una conversación, se ofrece continuarla en lugar de crear otra.
    let existente: ConversacionResumen | undefined;
    try {
        existente = (await apiFetch<ConversacionResumen[]>(`/conversaciones?publicacionId=${publicacion.id}`))[0];
    } catch { /* se asume que no existe */ }

    contenedor.innerHTML = `
        <h6>Contactar a ${escapeHtml(publicacion.vendedorApodo || 'el vendedor')}</h6>
        ${existente ? `<p class="small mb-2">Ya tienes una conversación abierta. <a href="mensajes.html?c=${existente.id}">Abrir chat</a></p>` : ''}
        <div id="contactoAlerta" class="alert d-none" role="alert"></div>
        <form id="formContacto" class="d-flex gap-2" novalidate>
            <div class="flex-grow-1">
                <textarea id="contactoTexto" class="form-control" rows="2" maxlength="${LIMITES.mensaje.max}" required
                    placeholder="Hola, ¿sigue disponible?"></textarea>
                <small class="text-muted"><span id="contactoContador">0</span>/${LIMITES.mensaje.max}</small>
            </div>
            <button id="btnContactar" class="btn btn-primary align-self-start" type="submit">Enviar</button>
        </form>`;

    const texto = opcionalPorId<HTMLTextAreaElement>('contactoTexto');
    texto?.addEventListener('input', () => {
        const contador = opcionalPorId('contactoContador');
        if (contador) contador.textContent = String(texto.value.length);
    });

    opcionalPorId<HTMLFormElement>('formContacto')?.addEventListener('submit', async e => {
        e.preventDefault();
        const alerta = opcionalPorId('contactoAlerta');
        ocultarAlerta(alerta);
        const contenido = texto?.value.trim() ?? '';
        const error = validarMensaje(contenido);
        if (error) {
            mostrarAlerta(alerta, error);
            return;
        }
        try {
            await conBoton(opcionalPorId<HTMLButtonElement>('btnContactar'), 'Enviando...', async () => {
                const detalle = await apiFetch<ConversacionDetalle>('/conversaciones', {
                    method: 'POST',
                    body: JSON.stringify({ publicacionId: publicacion.id, contenido }),
                });
                window.location.href = `mensajes.html?c=${detalle.conversacion.id}`;
            });
        } catch (err) {
            mostrarAlerta(alerta, mensajeDeError(err, 'No se pudo enviar el mensaje.'));
        }
    });
}
