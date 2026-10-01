export interface Usuario {
    id: number;
    nombre: string;
    apellido: string;
    apodo: string;
    correo: string;
}

export interface LoginRespuesta {
    token: string;
    expiraEnMs: number;
    usuario: Usuario;
}

export interface Sesion {
    token: string;
    usuario: Usuario;
    expiraEn: number;
}

export type EstadoPublicacion = 'ACTIVA' | 'VENDIDA' | 'ELIMINADA';

export interface Categoria {
    codigo: string;
    nombre: string;
}

export interface Publicacion {
    id: number;
    titulo: string;
    precio: number;
    descripcion: string;
    ubicacion: string;
    categoria: string;
    categoriaNombre: string;
    latitud: number | null;
    longitud: number | null;
    distanciaKm: number | null;
    usuarioId: number;
    vendedorApodo: string | null;
    estado: EstadoPublicacion;
    fechaCreacion: string;
    imagenUrls: string[];
}

export interface Pagina<T> {
    contenido: T[];
    pagina: number;
    tamano: number;
    total: number;
    totalPaginas: number;
}

export type Rol = 'COMPRADOR' | 'VENDEDOR';
export type TipoMensaje = 'TEXTO' | 'OFERTA' | 'SISTEMA';
export type EstadoOferta = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'REEMPLAZADA';

export interface ConversacionResumen {
    id: number;
    publicacionId: number;
    publicacionTitulo: string;
    publicacionPrecio: number;
    publicacionEstado: EstadoPublicacion;
    imagenUrl: string;
    rol: Rol;
    interlocutorId: number;
    interlocutorApodo: string;
    montoAcordado: number | null;
    ultimoMensaje: string | null;
    ultimaActividad: string;
    noLeidos: number;
}

export interface Mensaje {
    id: number;
    remitenteId: number;
    tipo: TipoMensaje;
    contenido: string;
    monto: number | null;
    estadoOferta: EstadoOferta | null;
    leido: boolean;
    fechaEnvio: string;
}

export interface ConversacionDetalle {
    conversacion: ConversacionResumen;
    mensajes: Mensaje[];
}

export type OrdenCatalogo = 'RELEVANCIA' | 'PRECIO_ASC' | 'PRECIO_DESC' | 'DISTANCIA' | 'RECIENTES';
