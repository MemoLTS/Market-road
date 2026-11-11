import { config } from '../config';
import * as bd from '../data/baseDatos';
import type { AdminPublicacion, ResumenPublicaciones, Usuario } from '../types/api';
import type { PaginaSoporte, ResumenSoporte, TicketPanelDetalle, TicketPanelResumen } from '../types/soporte';
import { apiFetch } from './http';

/** Datos del panel del superusuario (requiere token con rol SUPERUSUARIO). */
export const adminService = {
    usuarios: (): Promise<Usuario[]> => (config.usarMock ? Promise.resolve(bd.listarUsuarios()) : apiFetch<Usuario[]>('/admin/usuarios')),
    publicaciones: (): Promise<AdminPublicacion[]> => (config.usarMock
        ? Promise.resolve(bd.listarPublicaciones({ tamano: 1000 }).contenido.map(p => ({
            ...p, compradorId: null, precioVenta: null, fechaVenta: null, cantidadImagenes: p.imagenUrls.length,
        })))
        : apiFetch<AdminPublicacion[]>('/admin/publicaciones')),
    /** Publicaciones nuevas y ventas cerradas en los últimos `dias` días (dashboard). */
    resumenPublicaciones: (dias: number): Promise<ResumenPublicaciones> => (config.usarMock
        ? Promise.resolve(bd.resumenPublicaciones(dias))
        : apiFetch<ResumenPublicaciones>(`/admin/publicaciones/resumen?dias=${dias}`)),
    tickets: (params: Record<string, string>) => apiFetch<PaginaSoporte<TicketPanelResumen>>(`/soporte/admin/tickets?${new URLSearchParams(params)}`),
    resumenTickets: () => apiFetch<ResumenSoporte>('/soporte/admin/tickets/resumen'),
    detalleTicket: (id: number) => apiFetch<TicketPanelDetalle>(`/soporte/admin/tickets/${id}`),
};
