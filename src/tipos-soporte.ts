export type EstadoTicket = 'ABIERTO' | 'EN_PROGRESO' | 'RESUELTO' | 'CERRADO';
export type PrioridadTicket = 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';
export type RolPersonal = 'SOPORTE' | 'ADMIN';
export type AutorTipo = 'USUARIO' | 'PERSONAL' | 'SISTEMA';

export interface Categoria {
    codigo: string;
    nombre: string;
}

export interface MensajeTicket {
    id: number;
    autorTipo: AutorTipo;
    autorNombre: string;
    contenido: string;
    fecha: string;
}

/** Vista del ticket para la persona usuaria. */
export interface TicketResumen {
    id: number;
    asunto: string;
    categoria: string;
    categoriaNombre: string;
    estado: EstadoTicket;
    estadoNombre: string;
    ultimoMensaje: string | null;
    noLeidos: number;
    fechaCreacion: string;
    fechaActualizacion: string;
}

export interface TicketDetalle {
    ticket: TicketResumen;
    mensajes: MensajeTicket[];
    puedeEscribir: boolean;
}

/** Vista del ticket para el personal de soporte. */
export interface TicketPanelResumen {
    id: number;
    asunto: string;
    categoria: string;
    categoriaNombre: string;
    estado: EstadoTicket;
    estadoNombre: string;
    prioridad: PrioridadTicket;
    prioridadNombre: string;
    usuarioApodo: string;
    asignadoId: number | null;
    asignadoNombre: string | null;
    sinLeer: number;
    ultimoMensaje: string | null;
    fechaCreacion: string;
    fechaActualizacion: string;
}

/** id y correo solo llegan con rol ADMIN. */
export interface UsuarioTicket {
    id: number | null;
    apodo: string;
    correo: string | null;
}

export interface TicketPanelDetalle {
    ticket: TicketPanelResumen;
    usuario: UsuarioTicket;
    mensajes: MensajeTicket[];
    puedeResponder: boolean;
    estadosPermitidos: EstadoTicket[];
    puedeTomar: boolean;
}

export interface Pagina<T> {
    contenido: T[];
    pagina: number;
    tamano: number;
    totalElementos: number;
    totalPaginas: number;
}

export interface PersonalSoporte {
    id: number;
    nombre: string;
    correo: string;
    rol: RolPersonal;
    rolNombre: string;
    activo: boolean;
    fechaCreacion: string;
    ultimoAcceso: string | null;
    ticketsEnCurso: number;
}

export interface LoginSoporteRespuesta {
    token: string;
    expiraEnMs: number;
    personal: PersonalSoporte;
}

export interface CargaPersonal {
    personalId: number;
    nombre: string;
    ticketsEnCurso: number;
}

export interface Estadisticas {
    totalTickets: number;
    sinAsignar: number;
    creadosUltimos7Dias: number;
    personalActivo: number;
    porEstado: Record<string, number>;
    porCategoria: Record<string, number>;
    porPrioridad: Record<string, number>;
    carga: CargaPersonal[];
}
