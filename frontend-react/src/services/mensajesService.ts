import type { ConversacionDetalle, ConversacionResumen } from '../types/api';
import { apiFetch } from './http';

const post = (cuerpo?: unknown): RequestInit => ({ method: 'POST', ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}) });

/** Conversaciones, mensajes y ofertas (Publication-Api). Las acciones devuelven el detalle actualizado. */
export const mensajesService = {
    listar: () => apiFetch<ConversacionResumen[]>('/conversaciones'),
    noLeidos: () => apiFetch<{ total: number }>('/conversaciones/no-leidos'),
    detalle: (id: number) => apiFetch<ConversacionDetalle>(`/conversaciones/${id}`),
    deLaPublicacion: (publicacionId: number) => apiFetch<ConversacionResumen[]>(`/conversaciones?publicacionId=${publicacionId}`),
    iniciar: (publicacionId: number, contenido: string) =>
        apiFetch<ConversacionDetalle>('/conversaciones', post({ publicacionId, contenido })),
    enviarMensaje: (id: number, contenido: string) =>
        apiFetch<ConversacionDetalle>(`/conversaciones/${id}/mensajes`, post({ contenido })),
    enviarOferta: (id: number, monto: number) =>
        apiFetch<ConversacionDetalle>(`/conversaciones/${id}/ofertas`, post({ monto })),
    responderOferta: (id: number, mensajeId: number, aceptar: boolean) =>
        apiFetch<ConversacionDetalle>(`/conversaciones/${id}/ofertas/${mensajeId}/${aceptar ? 'aceptar' : 'rechazar'}`, post()),
    marcarVendido: (id: number) => apiFetch<ConversacionDetalle>(`/conversaciones/${id}/venta`, post()),
};
