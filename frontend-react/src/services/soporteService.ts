import type { Categoria } from '../types/api';
import type {
    Estadisticas, EstadoTicket, LoginSoporteRespuesta, PaginaSoporte, PersonalSoporte, PrioridadTicket,
    TicketDetalle, TicketPanelDetalle, TicketPanelResumen, TicketResumen,
} from '../types/soporte';
import { apiFetch } from './http';
import { soporteFetch } from './sesionSoporte';

const post = (cuerpo?: unknown): RequestInit => ({ method: 'POST', ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}) });

/** Tickets de la persona usuaria (sesión de la tienda). */
export const soporteUsuarioService = {
    categorias: () => apiFetch<Categoria[]>('/soporte/categorias'),
    listar: () => apiFetch<TicketResumen[]>('/soporte/tickets'),
    detalle: (id: number) => apiFetch<TicketDetalle>(`/soporte/tickets/${id}`),
    crear: (asunto: string, categoria: string, mensaje: string) => apiFetch<TicketDetalle>('/soporte/tickets', post({ asunto, categoria, mensaje })),
    responder: (id: number, contenido: string) => apiFetch<TicketDetalle>(`/soporte/tickets/${id}/mensajes`, post({ contenido })),
    cerrar: (id: number) => apiFetch<TicketDetalle>(`/soporte/tickets/${id}/cierre`, post()),
};

/** Panel del personal de soporte (sesión propia). */
export const soportePanelService = {
    login: (correo: string, contrasena: string) => soporteFetch<LoginSoporteRespuesta>('/soporte/panel/auth/login', post({ correo, contrasena })),
    yo: () => soporteFetch<PersonalSoporte>('/soporte/panel/auth/yo'),
    categorias: () => soporteFetch<Categoria[]>('/soporte/categorias'),
    tickets: (params: Record<string, string>) => soporteFetch<PaginaSoporte<TicketPanelResumen>>(`/soporte/panel/tickets?${new URLSearchParams(params)}`),
    detalle: (id: number) => soporteFetch<TicketPanelDetalle>(`/soporte/panel/tickets/${id}`),
    tomar: (id: number) => soporteFetch<TicketPanelDetalle>(`/soporte/panel/tickets/${id}/tomar`, post({})),
    cambiarEstado: (id: number, estado: EstadoTicket) => soporteFetch<TicketPanelDetalle>(`/soporte/panel/tickets/${id}/estado`, post({ estado })),
    cambiarPrioridad: (id: number, prioridad: PrioridadTicket) => soporteFetch<TicketPanelDetalle>(`/soporte/panel/tickets/${id}/prioridad`, post({ prioridad })),
    asignar: (id: number, personalId: number | null) => soporteFetch<TicketPanelDetalle>(`/soporte/panel/tickets/${id}/asignacion`, post({ personalId })),
    responder: (id: number, contenido: string) => soporteFetch<TicketPanelDetalle>(`/soporte/panel/tickets/${id}/mensajes`, post({ contenido })),
    personal: () => soporteFetch<PersonalSoporte[]>('/soporte/panel/personal'),
    estadisticas: () => soporteFetch<Estadisticas>('/soporte/panel/estadisticas'),
};
