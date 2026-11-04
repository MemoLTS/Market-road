import { apiFetch } from './http.js';
import { soporteFetch } from './sesionSoporte.js';

const post = (cuerpo) => ({ method: 'POST', ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}) });

/** Tickets de la persona usuaria (sesión de la tienda). */
export const soporteUsuarioService = {
    categorias: () => apiFetch('/soporte/categorias'),
    listar: () => apiFetch('/soporte/tickets'),
    detalle: id => apiFetch(`/soporte/tickets/${id}`),
    crear: (asunto, categoria, mensaje) => apiFetch('/soporte/tickets', post({ asunto, categoria, mensaje })),
    responder: (id, contenido) => apiFetch(`/soporte/tickets/${id}/mensajes`, post({ contenido })),
    cerrar: id => apiFetch(`/soporte/tickets/${id}/cierre`, post()),
};

/** Panel del personal de soporte (sesión propia). */
export const soportePanelService = {
    login: (correo, contrasena) => soporteFetch('/soporte/panel/auth/login', post({ correo, contrasena })),
    yo: () => soporteFetch('/soporte/panel/auth/yo'),
    categorias: () => soporteFetch('/soporte/categorias'),
    tickets: (params) => soporteFetch(`/soporte/panel/tickets?${new URLSearchParams(params)}`),
    detalle: id => soporteFetch(`/soporte/panel/tickets/${id}`),
    tomar: id => soporteFetch(`/soporte/panel/tickets/${id}/tomar`, post({})),
    cambiarEstado: (id, estado) => soporteFetch(`/soporte/panel/tickets/${id}/estado`, post({ estado })),
    cambiarPrioridad: (id, prioridad) => soporteFetch(`/soporte/panel/tickets/${id}/prioridad`, post({ prioridad })),
    asignar: (id, personalId) => soporteFetch(`/soporte/panel/tickets/${id}/asignacion`, post({ personalId })),
    responder: (id, contenido) => soporteFetch(`/soporte/panel/tickets/${id}/mensajes`, post({ contenido })),
    personal: () => soporteFetch('/soporte/panel/personal'),
    estadisticas: () => soporteFetch('/soporte/panel/estadisticas'),
};
