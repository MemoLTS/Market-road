import { config } from '../config';
import * as bd from '../data/baseDatos';
import type { CambiosAdminUsuario } from '../data/baseDatos';
import type { AdminPublicacion, ResumenPublicaciones, Usuario } from '../types/api';
import type { PaginaSoporte, ResumenSoporte, TicketPanelDetalle, TicketPanelResumen } from '../types/soporte';
import { apiFetch, ApiError } from './http';
import { obtenerSesion } from './sesion';

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
    /**
     * El superusuario edita los datos de otro usuario: PATCH /admin/usuarios/{id}. Solo se envían los campos que cambian;
     * la contraseña es opcional. Devuelve el usuario actualizado.
     */
    async actualizarUsuario(id: number, cambios: CambiosAdminUsuario): Promise<Usuario> {
        if (config.usarMock) {
            const r = bd.actualizarUsuarioAdmin(obtenerSesion()?.usuario.id ?? 0, id, cambios);
            if (r === 'no-existe') throw new ApiError('El usuario no existe.', 404);
            if (r === 'superusuario') throw new ApiError('No se puede modificar a otro superusuario', 403);
            if (r === 'correo') throw new ApiError('Ya existe un usuario registrado con ese correo', 409);
            if (r === 'apodo') throw new ApiError('Ya existe un usuario registrado con ese apodo', 409);
            return r;
        }
        return apiFetch<Usuario>(`/admin/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(cambios) });
    },
    tickets: (params: Record<string, string>) => apiFetch<PaginaSoporte<TicketPanelResumen>>(`/soporte/admin/tickets?${new URLSearchParams(params)}`),
    resumenTickets: () => apiFetch<ResumenSoporte>('/soporte/admin/tickets/resumen'),
    detalleTicket: (id: number) => apiFetch<TicketPanelDetalle>(`/soporte/admin/tickets/${id}`),
};
