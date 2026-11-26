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
        ? Promise.resolve(bd.listarPublicacionesAdmin().map(p => ({
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
    /**
     * Deshabilita (activo=false) o vuelve a habilitar una cuenta: PATCH /admin/usuarios/{id}/estado. Una cuenta
     * deshabilitada solo puede usar el soporte. Sus publicaciones activas salen del catálogo (o vuelven) con
     * PATCH /admin/publicaciones/usuario/{id}/estado.
     */
    async cambiarEstadoUsuario(id: number, activo: boolean): Promise<Usuario> {
        if (config.usarMock) {
            const r = bd.cambiarEstadoUsuario(obtenerSesion()?.usuario.id ?? 0, id, activo);
            if (r === 'no-existe') throw new ApiError('El usuario no existe.', 404);
            if (r === 'superusuario') throw new ApiError('No se puede deshabilitar ni eliminar a un superusuario', 403);
            return r;
        }
        const usuario = await apiFetch<Usuario>(`/admin/usuarios/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) });
        await apiFetch(`/admin/publicaciones/usuario/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ habilitada: activo }) }).catch(() => null);
        return usuario;
    },
    /** Elimina la cuenta (DELETE /admin/usuarios/{id}) y retira sus publicaciones (DELETE /admin/publicaciones/usuario/{id}). */
    async eliminarUsuario(id: number): Promise<void> {
        if (config.usarMock) {
            const r = bd.eliminarUsuario(obtenerSesion()?.usuario.id ?? 0, id);
            if (r === 'no-existe') throw new ApiError('El usuario no existe.', 404);
            if (r === 'superusuario') throw new ApiError('No se puede deshabilitar ni eliminar a un superusuario', 403);
            return;
        }
        await apiFetch<void>(`/admin/usuarios/${id}`, { method: 'DELETE' });
        await apiFetch(`/admin/publicaciones/usuario/${id}`, { method: 'DELETE' }).catch(() => null);
    },
    /** Deshabilita (habilitada=false) o vuelve a habilitar una publicación: PATCH /admin/publicaciones/{id}/estado. */
    async cambiarEstadoPublicacion(id: number, habilitada: boolean): Promise<void> {
        if (config.usarMock) {
            const r = bd.cambiarEstadoPublicacion(id, habilitada);
            if (r === 'no-existe') throw new ApiError('La publicación no existe.', 404);
            if (r === 'no-permitido') throw new ApiError('Solo se puede cambiar el estado de publicaciones activas o deshabilitadas', 400);
            return;
        }
        await apiFetch(`/admin/publicaciones/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ habilitada }) });
    },
    tickets: (params: Record<string, string>) => apiFetch<PaginaSoporte<TicketPanelResumen>>(`/soporte/admin/tickets?${new URLSearchParams(params)}`),
    resumenTickets: () => apiFetch<ResumenSoporte>('/soporte/admin/tickets/resumen'),
    detalleTicket: (id: number) => apiFetch<TicketPanelDetalle>(`/soporte/admin/tickets/${id}`),
};
