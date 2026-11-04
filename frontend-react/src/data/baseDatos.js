/**
 * Fuente de datos simulada (equivale a una "base de datos" en memoria) con operaciones CRUD.
 * Cumple el requisito de la evaluación: archivo JS con datos + funciones Crear/Leer/Actualizar/Eliminar.
 * Se persiste en localStorage para sobrevivir a recargas; en pruebas se desactiva con configurarPersistencia(false).
 */
export const CATEGORIAS = [
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

export const MODALIDADES = [
    { codigo: 'ENTREGA_PERSONAL', nombre: 'Entrega en persona' },
    { codigo: 'ENVIO', nombre: 'Envío' },
    { codigo: 'ENCUENTRO_PUBLICO', nombre: 'Encuentro en lugar público' },
];

const CLAVE_BD = 'mr_mock_db';
let persistir = true;

export function configurarPersistencia(valor) {
    persistir = Boolean(valor);
}

/** Imagen de relleno (SVG en data-URI) para no depender de archivos ni de red. */
export function imagenDeRelleno(texto) {
    const t = String(texto).replace(/[<>&"]/g, '').slice(0, 18);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#d1d5db"/>`
        + `<text x="50%" y="50%" fill="#6b7280" font-family="sans-serif" font-size="22" text-anchor="middle">${t}</text></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function semilla() {
    const mod = (...c) => MODALIDADES.filter(m => c.includes(m.codigo));
    const pub = (id, titulo, precio, categoria, ubicacion, usuarioId, vendedorApodo, dias, descripcion) => ({
        id, titulo, precio, descripcion, ubicacion, categoria,
        categoriaNombre: CATEGORIAS.find(c => c.codigo === categoria).nombre,
        modalidadesEntrega: mod('ENTREGA_PERSONAL', 'ENCUENTRO_PUBLICO'),
        latitud: null, longitud: null, distanciaKm: null, usuarioId, vendedorApodo,
        estado: 'ACTIVA', fechaCreacion: new Date(Date.UTC(2026, 9, 30 - dias)).toISOString(),
        imagenUrls: [imagenDeRelleno(titulo)],
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

let bd = null;

function cargar() {
    if (bd) return bd;
    if (persistir) {
        try {
            const crudo = localStorage.getItem(CLAVE_BD);
            if (crudo) {
                bd = JSON.parse(crudo);
                return bd;
            }
        } catch { /* si el almacenamiento falla se usa la semilla */ }
    }
    bd = semilla();
    return bd;
}

function guardar() {
    if (!persistir) return;
    try { localStorage.setItem(CLAVE_BD, JSON.stringify(bd)); } catch { /* almacenamiento lleno o bloqueado */ }
}

/** Restaura los datos iniciales (útil en pruebas y para el botón "restablecer demo"). */
export function reiniciar() {
    bd = semilla();
    if (persistir) {
        try { localStorage.removeItem(CLAVE_BD); } catch { /* nada que limpiar */ }
    }
    return bd;
}

const sinContrasena = ({ contrasena, ...usuario }) => usuario;

// ---------------------------------------------------------------- Publicaciones (CRUD)

export function listarCategorias() {
    return CATEGORIAS.map(c => ({ ...c }));
}

/** READ (lista): filtra, ordena y pagina igual que el endpoint GET /publicaciones. */
export function listarPublicaciones({ q = '', categorias = [], precioMin = '', precioMax = '', orden = 'RELEVANCIA', pagina = 0, tamano = 12 } = {}) {
    const texto = q.trim().toLowerCase();
    let lista = cargar().publicaciones.filter(p => p.estado === 'ACTIVA');
    if (texto) lista = lista.filter(p => `${p.titulo} ${p.descripcion}`.toLowerCase().includes(texto));
    if (categorias.length) lista = lista.filter(p => categorias.includes(p.categoria));
    if (precioMin !== '' && precioMin != null) lista = lista.filter(p => p.precio >= Number(precioMin));
    if (precioMax !== '' && precioMax != null) lista = lista.filter(p => p.precio <= Number(precioMax));

    const comparadores = {
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
export function obtenerPublicacion(id) {
    const p = cargar().publicaciones.find(x => x.id === Number(id) && x.estado !== 'ELIMINADA');
    return p ? { ...p } : null;
}

export function listarPublicacionesDeUsuario(usuarioId) {
    return cargar().publicaciones.filter(p => p.usuarioId === usuarioId && p.estado !== 'ELIMINADA').map(p => ({ ...p }));
}

/** CREATE. `datos` trae los campos del formulario; `usuario` es la persona autenticada. */
export function crearPublicacion(datos, usuario) {
    const base = cargar();
    const nueva = {
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
    };
    base.publicaciones.unshift(nueva);
    guardar();
    return { ...nueva };
}

/** UPDATE parcial. Devuelve la publicación actualizada o null si no existe. */
export function actualizarPublicacion(id, cambios) {
    const p = cargar().publicaciones.find(x => x.id === Number(id) && x.estado !== 'ELIMINADA');
    if (!p) return null;
    const permitidos = ['titulo', 'precio', 'descripcion', 'ubicacion', 'categoria', 'estado'];
    for (const campo of permitidos) {
        if (cambios[campo] !== undefined) p[campo] = campo === 'precio' ? Number(cambios[campo]) : cambios[campo];
    }
    if (cambios.categoria) p.categoriaNombre = CATEGORIAS.find(c => c.codigo === cambios.categoria)?.nombre ?? p.categoriaNombre;
    guardar();
    return { ...p };
}

/** DELETE lógico (igual que el backend: estado ELIMINADA). Devuelve true si existía. */
export function eliminarPublicacion(id) {
    const p = cargar().publicaciones.find(x => x.id === Number(id) && x.estado !== 'ELIMINADA');
    if (!p) return false;
    p.estado = 'ELIMINADA';
    guardar();
    return true;
}

// ---------------------------------------------------------------- Usuarios (CRUD básico + login)

export function registrarUsuario({ nombre, apellido, apodo, correo, contrasena }) {
    const base = cargar();
    const correoNormalizado = correo.trim().toLowerCase();
    if (base.usuarios.some(u => u.correo.toLowerCase() === correoNormalizado)) {
        throw Object.assign(new Error('El correo ya está registrado.'), { status: 409 });
    }
    if (apodo && base.usuarios.some(u => (u.apodo ?? '').toLowerCase() === apodo.toLowerCase())) {
        throw Object.assign(new Error('El apodo ya está en uso.'), { status: 409 });
    }
    const usuario = {
        id: base.siguienteIdUsuario++, nombre, apellido, apodo: apodo || null,
        correo: correoNormalizado, contrasena, ciudad: null, rol: 'USUARIO',
    };
    base.usuarios.push(usuario);
    guardar();
    return sinContrasena(usuario);
}

export function autenticar(correo, contrasena) {
    const usuario = cargar().usuarios.find(u => u.correo.toLowerCase() === correo.trim().toLowerCase());
    if (!usuario || usuario.contrasena !== contrasena) {
        throw Object.assign(new Error('Correo o contraseña incorrectos.'), { status: 401 });
    }
    return { token: `mock-token-${usuario.id}`, expiraEnMs: 60 * 60 * 1000, usuario: sinContrasena(usuario) };
}

export function listarUsuarios() {
    return cargar().usuarios.map(sinContrasena);
}

export function actualizarUsuario(id, cambios) {
    const u = cargar().usuarios.find(x => x.id === Number(id));
    if (!u) return null;
    if (cambios.apodo !== undefined) u.apodo = cambios.apodo;
    if (cambios.ciudad !== undefined) u.ciudad = cambios.ciudad;
    guardar();
    return sinContrasena(u);
}
