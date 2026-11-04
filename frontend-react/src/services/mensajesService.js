import { apiFetch } from './http.js';

/** Conversaciones, mensajes y ofertas (Publication-Api). Todas las acciones devuelven el detalle actualizado. */
export const mensajesService = {
    listar: () => apiFetch('/conversaciones'),
    noLeidos: () => apiFetch('/conversaciones/no-leidos'),
    detalle: id => apiFetch(`/conversaciones/${id}`),
    deLaPublicacion: publicacionId => apiFetch(`/conversaciones?publicacionId=${publicacionId}`),
    iniciar: (publicacionId, contenido) =>
        apiFetch('/conversaciones', { method: 'POST', body: JSON.stringify({ publicacionId, contenido }) }),
    enviarMensaje: (id, contenido) =>
        apiFetch(`/conversaciones/${id}/mensajes`, { method: 'POST', body: JSON.stringify({ contenido }) }),
    enviarOferta: (id, monto) =>
        apiFetch(`/conversaciones/${id}/ofertas`, { method: 'POST', body: JSON.stringify({ monto }) }),
    responderOferta: (id, mensajeId, aceptar) =>
        apiFetch(`/conversaciones/${id}/ofertas/${mensajeId}/${aceptar ? 'aceptar' : 'rechazar'}`, { method: 'POST' }),
    marcarVendido: id => apiFetch(`/conversaciones/${id}/venta`, { method: 'POST' }),
};
