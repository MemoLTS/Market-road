import { config } from '../config.js';
import * as bd from '../data/baseDatos.js';
import { apiFetch } from './http.js';

/** Datos del panel del superusuario (requiere token con rol SUPERUSUARIO). */
export const adminService = {
    usuarios: () => (config.usarMock ? Promise.resolve(bd.listarUsuarios()) : apiFetch('/admin/usuarios')),
    publicaciones: () => (config.usarMock
        ? Promise.resolve(bd.listarPublicaciones({ tamano: 1000 }).contenido.map(p => ({ ...p, cantidadImagenes: p.imagenUrls.length })))
        : apiFetch('/admin/publicaciones')),
    tickets: (params) => apiFetch(`/soporte/admin/tickets?${new URLSearchParams(params)}`),
    resumenTickets: () => apiFetch('/soporte/admin/tickets/resumen'),
    detalleTicket: id => apiFetch(`/soporte/admin/tickets/${id}`),
};
