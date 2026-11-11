import type { CambiosPublicacion, DatosPublicacion, DatosRegistro, FiltrosCatalogo } from '../types/app';
import type { Categoria, EstadoPublicacion, ModalidadEntrega, Pagina, Publicacion, ResumenPublicaciones, Usuario } from '../types/api';
import { unidadesDe } from '../core/validaciones';

type UsuarioBd = Usuario & { contrasena: string };

interface BaseDatos {
    siguienteIdPublicacion: number;
    siguienteIdUsuario: number;
    usuarios: UsuarioBd[];
    publicaciones: Publicacion[];
}

/**
 * Fuente de datos simulada (equivale a una "base de datos" en memoria) con operaciones CRUD.
 * Cumple el requisito de la evaluación: archivo JS con datos + funciones Crear/Leer/Actualizar/Eliminar.
 * Se persiste en localStorage para sobrevivir a recargas; en pruebas se desactiva con configurarPersistencia(false).
 */
export const CATEGORIAS: Categoria[] = [
    { codigo: 'ELECTRONICA', nombre: 'Electrónica' },
    { codigo: 'HOGAR', nombre: 'Hogar y jardín' },
    { codigo: 'MODA', nombre: 'Moda y accesorios' },
    { codigo: 'DEPORTES', nombre: 'Deportes y ocio' },
    { codigo: 'VEHICULOS', nombre: 'Vehículos y repuestos' },
    { codigo: 'JUGUETES', nombre: 'Juguetes y bebés' },
    { codigo: 'LIBROS', nombre: 'Libros y música' },
    { codigo: 'HERRAMIENTAS', nombre: 'Herramientas' },
    { codigo: 'MASCOTAS', nombre: 'Mascotas' },
    { codigo: 'OTROS', nombre: 'Otros' },
];

export const MODALIDADES: ModalidadEntrega[] = [
    { codigo: 'ENTREGA_PERSONAL', nombre: 'Entrega en persona' },
    { codigo: 'ENVIO', nombre: 'Envío' },
    { codigo: 'ENCUENTRO_PUBLICO', nombre: 'Encuentro en lugar público' },
];

const CLAVE_BD = 'mr_mock_db';
let persistir = true;

export function configurarPersistencia(valor: boolean): void {
    persistir = Boolean(valor);
}

/** Imagen de relleno (SVG en data-URI) para no depender de archivos ni de red. */
export function imagenDeRelleno(texto: string): string {
    const t = String(texto).replace(/[<>&"]/g, '').slice(0, 18);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#d1d5db"/>`
        + `<text x="50%" y="50%" fill="#6b7280" font-family="sans-serif" font-size="22" text-anchor="middle">${t}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function semilla(): BaseDatos {
    const mod = (...c: string[]): ModalidadEntrega[] => MODALIDADES.filter(m => c.includes(m.codigo));
    const pub = (id: number, titulo: string, precio: number, categoria: string, ubicacion: string, usuarioId: number, vendedorApodo: string, dias: number, descripcion: string): Publicacion => ({
        id, titulo, precio, descripcion, ubicacion, categoria,
        categoriaNombre: CATEGORIAS.find(c => c.codigo === categoria)?.nombre ?? categoria,
        modalidadesEntrega: mod('ENTREGA_PERSONAL', 'ENCUENTRO_PUBLICO'),
        latitud: null, longitud: null, distanciaKm: null, usuarioId, vendedorApodo,
        estado: 'ACTIVA', fechaCreacion: new Date(Date.UTC(2026, 9, 30 - dias)).toISOString(),
        imagenUrls: [imagenDeRelleno(titulo)], unidades: 1,
    });
    return {
        siguienteIdPublicacion: 9,
        siguienteIdUsuario: 3,
        usuarios: [
            { id: 1, nombre: 'Demo', apellido: 'Usuario', apodo: 'demo', correo: 'demo@marketroad.cl', contrasena: 'demo1234', ciudad: 'Concepción', rol: 'USUARIO' },
            { id: 2, nombre: 'Admin', apellido: 'Market', apodo: 'admin', correo: 'admin@marketroad.cl', contrasena: 'admin1234', ciudad: 'Santiago', rol: 'SUPERUSUARIO' },
        ],
        publicaciones: [
            pub(1, 'Notebook Lenovo 14"', 289990, 'ELECTRONICA', 'Concepción, Biobío', 1, 'demo', 1, 'Notebook en excelente estado, con cargador y funda incluidos.'),
            pub(2, 'Bicicleta aro 29', 150000, 'DEPORTES', 'Talcahuano, Biobío', 1, 'demo', 2, 'Bicicleta de montaña con cambios Shimano, poco uso.'),
            pub(3, 'Sofá de tres cuerpos', 95000, 'HOGAR', 'Chiguayante, Biobío', 2, 'admin', 3, 'Sofá gris cómodo, sin manchas, retiro en domicilio.'),
            pub(4, 'Chaqueta de cuero', 45000, 'MODA', 'Concepción, Biobío', 2, 'admin', 4, 'Talla M, usada pocas veces, color negro.'),
            pub(5, 'Taladro percutor Bosch', 38000, 'HERRAMIENTAS', 'San Pedro de la Paz, Biobío', 1, 'demo', 5, 'Incluye maletín y set de brocas.'),
            pub(6, 'Colección de libros de ciencia ficción', 20000, 'LIBROS', 'Hualpén, Biobío', 2, 'admin', 6, 'Quince títulos clásicos en buen estado.'),
            pub(7, 'Silla de bebé para auto', 60000, 'JUGUETES', 'Concepción, Biobío', 1, 'demo', 7, 'Homologada, con poco uso y todos sus accesorios.'),
            pub(8, 'Transportín para mascotas', 18000, 'MASCOTAS', 'Coronel, Biobío', 2, 'admin', 8, 'Tamaño mediano, ideal para gatos y perros pequeños.'),
        ],
    };
}

let bd: BaseDatos | null = null;

function cargar(): BaseDatos {
    if (bd) return bd;
    if (persistir) {
        try {
            const crudo = localStorage.getItem(CLAVE_BD);
            if (crudo) {
                bd = JSON.parse(crudo) as BaseDatos;
                return bd;
            }
        } catch { /* si el almacenamiento falla se usa la semilla */ }
    }
    bd = semilla();
    return bd;
}

function guardar(): void {
    if (!persistir) return;
    try { localStorage.setItem(CLAVE_BD, JSON.stringify(bd)); } catch { /* almacenamiento lleno o bloqueado */ }
}

/** Restaura los datos iniciales (útil en pruebas y para el botón "restablecer demo"). */
export function reiniciar(): BaseDatos {
    bd = semilla();
    if (persistir) {
        try { localStorage.removeItem(CLAVE_BD); } catch { /* nada que limpiar */ }
    }
    return bd;
}

const sinContrasena = ({ contrasena: _omitida, ...usuario }: UsuarioBd): Usuario => usuario;

// ---------------------------------------------------------------- Publicaciones (CRUD)

export function listarCategorias(): Categoria[] {
    return CATEGORIAS.map(c => ({ ...c }));
}

/** READ (lista): filtra, ordena y pagina igual que el endpoint GET /publicaciones. */
export function listarPublicaciones({ q = '', categorias = [], precioMin = '', precioMax = '', orden = 'RELEVANCIA', pagina = 0, tamano = 12 }: FiltrosCatalogo = {}): Pagina<Publicacion> {
    const texto = q.trim().toLowerCase();
    let lista = cargar().publicaciones.filter(p => p.estado === 'ACTIVA');
    if (texto) lista = lista.filter(p => `${p.titulo} ${p.descripcion}`.toLowerCase().includes(texto));
    if (categorias.length) lista = lista.filter(p => categorias.includes(p.categoria));
    if (precioMin !== '') lista = lista.filter(p => p.precio >= Number(precioMin));
    if (precioMax !== '') lista = lista.filter(p => p.precio <= Number(precioMax));

    const comparadores: Record<string, (a: Publicacion, b: Publicacion) => number> = {
        PRECIO_ASC: (a, b) => a.precio - b.precio,
        PRECIO_DESC: (a, b) => b.precio - a.precio,
        RECIENTES: (a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion),
        RELEVANCIA: (a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion),
    };
    lista = [...lista].sort(comparadores[orden] ?? comparadores.RELEVANCIA);

    const total = lista.length;
    const totalPaginas = Math.max(1, Math.ceil(total / tamano));
    const inicio = pagina * tamano;
    return { contenido: lista.slice(inicio, inicio + tamano).map(p => ({ ...p })), pagina, tamano, total, totalPaginas };
}

/** READ (uno). Devuelve null si no existe. */
export function obtenerPublicacion(id: number | string): Publicacion | null {
    const p = cargar().publicaciones.find(x => x.id === Number(id) && x.estado !== 'ELIMINADA');
    return p ? { ...p } : null;
}

export function listarPublicacionesDeUsuario(usuarioId: number): Publicacion[] {
    return cargar().publicaciones.filter(p => p.usuarioId === usuarioId && p.estado !== 'ELIMINADA').map(p => ({ ...p }));
}

/** CREATE. `datos` trae los campos del formulario; `usuario` es la persona autenticada. */
export function crearPublicacion(datos: DatosPublicacion, usuario: Usuario): Publicacion {
    const base = cargar();
    const nueva: Publicacion = {
        id: base.siguienteIdPublicacion++,
        titulo: datos.titulo.trim(),
        precio: Number(String(datos.precio).replace(',', '.')),
        descripcion: datos.descripcion.trim(),
        ubicacion: datos.ubicacion.trim(),
        categoria: datos.categoria,
        categoriaNombre: CATEGORIAS.find(c => c.codigo === datos.categoria)?.nombre ?? datos.categoria,
        modalidadesEntrega: MODALIDADES.filter(m => (datos.modalidadesEntrega ?? []).includes(m.codigo)),
        latitud: datos.latitud ?? null, longitud: datos.longitud ?? null, distanciaKm: null,
        usuarioId: usuario.id, vendedorApodo: usuario.apodo ?? usuario.nombre,
        estado: 'ACTIVA', fechaCreacion: new Date().toISOString(),
        imagenUrls: datos.imagenUrls?.length ? datos.imagenUrls : [imagenDeRelleno(datos.titulo)],
        unidades: unidadesDe(datos.unidades),
    };
    base.publicaciones.unshift(nueva);
    guardar();
    return { ...nueva };
}

/** UPDATE parcial. Devuelve la publicación actualizada o null si no existe. */
export function actualizarPublicacion(id: number | string, cambios: CambiosPublicacion): Publicacion | null {
    const p = cargar().publicaciones.find(x => x.id === Number(id) && x.estado !== 'ELIMINADA');
    if (!p) return null;
    if (cambios.titulo !== undefined) p.titulo = cambios.titulo;
    if (cambios.precio !== undefined) p.precio = Number(cambios.precio);
    if (cambios.descripcion !== undefined) p.descripcion = cambios.descripcion;
    if (cambios.ubicacion !== undefined) p.ubicacion = cambios.ubicacion;
    if (cambios.categoria !== undefined) p.categoria = cambios.categoria;
    if (cambios.unidades !== undefined) p.unidades = unidadesDe(cambios.unidades);
    if (cambios.estado !== undefined) p.estado = cambios.estado as EstadoPublicacion;
    if (cambios.categoria) p.categoriaNombre = CATEGORIAS.find(c => c.codigo === cambios.categoria)?.nombre ?? p.categoriaNombre;
    guardar();
    return { ...p };
}

/**
 * Resumen del dashboard en modo demostración (el backend real lo calcula en GET /admin/publicaciones/resumen).
 * Aquí no se guarda la fecha de venta: se usa la de creación como aproximación.
 */
export function resumenPublicaciones(dias: number, ahora: number = Date.now()): ResumenPublicaciones {
    const desdeMs = ahora - dias * 86_400_000;
    const todas = cargar().publicaciones.filter(p => p.estado !== 'ELIMINADA');
    const reciente = (p: Publicacion): boolean => new Date(p.fechaCreacion).getTime() >= desdeMs;
    return {
        dias,
        desde: new Date(desdeMs).toISOString(),
        nuevas: todas.filter(reciente).length,
        cerradasVentas: todas.filter(p => p.estado === 'VENDIDA' && reciente(p)).length,
        activas: todas.filter(p => p.estado === 'ACTIVA').length,
        totalVendidas: todas.filter(p => p.estado === 'VENDIDA').length,
    };
}

/** DELETE lógico (igual que el backend: estado ELIMINADA). Devuelve true si existía. */
export function eliminarPublicacion(id: number | string): boolean {
    const p = cargar().publicaciones.find(x => x.id === Number(id) && x.estado !== 'ELIMINADA');
    if (!p) return false;
    p.estado = 'ELIMINADA';
    guardar();
    return true;
}

// ---------------------------------------------------------------- Usuarios (CRUD básico + login)

export function registrarUsuario({ nombre, apellido, apodo, correo, contrasena }: DatosRegistro): Usuario {
    const base = cargar();
    const correoNormalizado = correo.trim().toLowerCase();
    if (base.usuarios.some(u => u.correo.toLowerCase() === correoNormalizado)) {
        throw Object.assign(new Error('El correo ya está registrado.'), { status: 409 });
    }
    if (apodo && base.usuarios.some(u => (u.apodo ?? '').toLowerCase() === apodo.toLowerCase())) {
        throw Object.assign(new Error('El apodo ya está en uso.'), { status: 409 });
    }
    const usuario: UsuarioBd = {
        id: base.siguienteIdUsuario++, nombre, apellido, apodo: apodo || null,
        correo: correoNormalizado, contrasena, ciudad: null, rol: 'USUARIO',
    };
    base.usuarios.push(usuario);
    guardar();
    return sinContrasena(usuario);
}

export function autenticar(correo: string, contrasena: string): { token: string; expiraEnMs: number; usuario: Usuario } {
    const usuario = cargar().usuarios.find(u => u.correo.toLowerCase() === correo.trim().toLowerCase());
    if (!usuario || usuario.contrasena !== contrasena) {
        throw Object.assign(new Error('Correo o contraseña incorrectos.'), { status: 401 });
    }
    return { token: `mock-token-${usuario.id}`, expiraEnMs: 60 * 60 * 1000, usuario: sinContrasena(usuario) };
}

export function listarUsuarios(): Usuario[] {
    return cargar().usuarios.map(sinContrasena);
}

export function actualizarUsuario(id: number, cambios: { apodo?: string; ciudad?: string }): Usuario | null {
    const u = cargar().usuarios.find(x => x.id === Number(id));
    if (!u) return null;
    if (cambios.apodo !== undefined) u.apodo = cambios.apodo;
    if (cambios.ciudad !== undefined) u.ciudad = cambios.ciudad;
    guardar();
    return sinContrasena(u);
}
