import { apiFetch, esSuperusuario } from './api.js';
import type { AdminPublicacion, EstadoPublicacion, Usuario } from './tipos.js';
import {
    escapeHtml, formatoFechaCorta, formatoPrecio, mensajeDeError, mostrarAlerta, ocultarAlerta, opcionalPorId, porId,
} from './util.js';

const FILAS_POR_PAGINA = 15;

interface Columna<T> {
    /** HTML de la celda; cada valor dinámico debe pasar por escapeHtml. */
    celda: (fila: T) => string;
}

/** Tabla con búsqueda y paginación en el cliente sobre la lista completa que entrega la API. */
class TablaAdmin<T> {
    private filas: T[] = [];
    private filtro: (fila: T) => boolean = () => true;
    private pagina = 0;

    constructor(
        private readonly cuerpoId: string,
        private readonly paginacionId: string,
        private readonly columnas: Columna<T>[],
        private readonly vacio: string,
    ) {}

    establecer(filas: T[]): void {
        this.filas = filas;
        this.pagina = 0;
        this.dibujar();
    }

    filtrar(filtro: (fila: T) => boolean): void {
        this.filtro = filtro;
        this.pagina = 0;
        this.dibujar();
    }

    private dibujar(): void {
        const visibles = this.filas.filter(this.filtro);
        const totalPaginas = Math.max(1, Math.ceil(visibles.length / FILAS_POR_PAGINA));
        this.pagina = Math.min(this.pagina, totalPaginas - 1);
        const desde = this.pagina * FILAS_POR_PAGINA;
        const pagina = visibles.slice(desde, desde + FILAS_POR_PAGINA);

        porId(this.cuerpoId).innerHTML = pagina.length === 0
            ? `<tr><td colspan="${this.columnas.length}" class="text-center text-muted py-4">${escapeHtml(this.vacio)}</td></tr>`
            : pagina.map(f => `<tr>${this.columnas.map(c => `<td>${c.celda(f)}</td>`).join('')}</tr>`).join('');

        const nav = porId(this.paginacionId);
        if (visibles.length <= FILAS_POR_PAGINA) {
            nav.innerHTML = `<span class="small text-muted">${visibles.length} registro(s)</span>`;
            return;
        }
        nav.innerHTML = `
            <button type="button" class="btn btn-outline-secondary btn-sm" data-dir="-1" ${this.pagina === 0 ? 'disabled' : ''}>
                <i class="bi bi-chevron-left" aria-hidden="true"></i> Anterior</button>
            <span class="small text-muted">Página ${this.pagina + 1} de ${totalPaginas} · ${visibles.length} registros</span>
            <button type="button" class="btn btn-outline-secondary btn-sm" data-dir="1" ${this.pagina >= totalPaginas - 1 ? 'disabled' : ''}>
                Siguiente <i class="bi bi-chevron-right" aria-hidden="true"></i></button>`;
        nav.querySelectorAll<HTMLButtonElement>('button[data-dir]').forEach(boton => {
            boton.addEventListener('click', () => {
                this.pagina += Number(boton.dataset['dir']);
                this.dibujar();
            });
        });
    }
}

const COLOR_ESTADO: Record<EstadoPublicacion, string> = { ACTIVA: 'success', VENDIDA: 'primary', ELIMINADA: 'secondary' };

const tablaUsuarios = new TablaAdmin<Usuario>('usuariosCuerpo', 'usuariosPaginacion', [
    { celda: u => String(u.id) },
    { celda: u => escapeHtml(`${u.nombre} ${u.apellido}`) },
    { celda: u => (u.apodo ? escapeHtml(u.apodo) : '<span class="text-muted">—</span>') },
    { celda: u => escapeHtml(u.correo) },
    { celda: u => (u.ciudad ? escapeHtml(u.ciudad) : '<span class="text-muted">—</span>') },
    {
        celda: u => (u.rol === 'SUPERUSUARIO'
            ? '<span class="badge text-bg-danger">Superusuario</span>'
            : '<span class="badge text-bg-light border">Usuario</span>'),
    },
], 'No hay usuarios que coincidan.');

const tablaPublicaciones = new TablaAdmin<AdminPublicacion>('publicacionesCuerpo', 'publicacionesPaginacion', [
    { celda: p => String(p.id) },
    { celda: p => `<span class="admin-truncar" title="${escapeHtml(p.titulo)}">${escapeHtml(p.titulo)}</span>` },
    { celda: p => escapeHtml(formatoPrecio(p.precio)) },
    { celda: p => escapeHtml(p.categoriaNombre) },
    { celda: p => `<span class="badge text-bg-${COLOR_ESTADO[p.estado] ?? 'secondary'}">${escapeHtml(p.estado)}</span>` },
    { celda: p => `${escapeHtml(p.vendedorApodo ?? 'Sin apodo')} <span class="text-muted small">#${p.usuarioId}</span>` },
    { celda: p => escapeHtml(p.ubicacion) },
    { celda: p => String(p.cantidadImagenes) },
    { celda: p => escapeHtml(formatoFechaCorta(p.fechaCreacion)) },
], 'No hay publicaciones que coincidan.');

let usuarios: Usuario[] = [];
let publicaciones: AdminPublicacion[] = [];

document.addEventListener('DOMContentLoaded', () => {
    opcionalPorId('btnRecargarAdmin')?.addEventListener('click', () => void cargarDatos());
    opcionalPorId<HTMLInputElement>('buscarUsuarios')?.addEventListener('input', aplicarFiltroUsuarios);
    opcionalPorId<HTMLInputElement>('buscarPublicaciones')?.addEventListener('input', aplicarFiltroPublicaciones);
    opcionalPorId<HTMLSelectElement>('filtroEstadoPublicaciones')?.addEventListener('change', aplicarFiltroPublicaciones);
    iniciar();
});

// Si la sesión cambia o expira con la ventana abierta, se vuelve a evaluar el acceso.
window.addEventListener('mr:sesion-cambiada', iniciar);
window.addEventListener('mr:sesion-expirada', iniciar);

function iniciar(): void {
    const permitido = esSuperusuario();
    opcionalPorId('adminSinAcceso')?.classList.toggle('d-none', permitido);
    opcionalPorId('adminContenido')?.classList.toggle('d-none', !permitido);
    if (permitido) void cargarDatos();
}

function normalizar(texto: string): string {
    return texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function aplicarFiltroUsuarios(): void {
    const q = normalizar(opcionalPorId<HTMLInputElement>('buscarUsuarios')?.value.trim() ?? '');
    tablaUsuarios.filtrar(u => q === ''
        || normalizar(`${u.nombre} ${u.apellido} ${u.apodo ?? ''} ${u.correo} ${u.ciudad ?? ''}`).includes(q));
}

function aplicarFiltroPublicaciones(): void {
    const q = normalizar(opcionalPorId<HTMLInputElement>('buscarPublicaciones')?.value.trim() ?? '');
    const estado = opcionalPorId<HTMLSelectElement>('filtroEstadoPublicaciones')?.value ?? '';
    tablaPublicaciones.filtrar(p => (estado === '' || p.estado === estado)
        && (q === '' || normalizar(`${p.titulo} ${p.vendedorApodo ?? ''} ${p.categoriaNombre} ${p.ubicacion}`).includes(q)));
}

async function cargarDatos(): Promise<void> {
    const alertaUsuarios = opcionalPorId('usuariosAlerta');
    const alertaPublicaciones = opcionalPorId('publicacionesAdminAlerta');
    ocultarAlerta(alertaUsuarios);
    ocultarAlerta(alertaPublicaciones);

    // Cada servicio tiene su propia base de datos: si uno falla, el otro igual se muestra.
    const [resUsuarios, resPublicaciones] = await Promise.allSettled([
        apiFetch<Usuario[]>('/admin/usuarios'),
        apiFetch<AdminPublicacion[]>('/admin/publicaciones'),
    ]);

    if (resUsuarios.status === 'fulfilled') {
        usuarios = resUsuarios.value;
        tablaUsuarios.establecer(usuarios);
        aplicarFiltroUsuarios();
    } else {
        mostrarAlerta(alertaUsuarios, mensajeDeError(resUsuarios.reason, 'No se pudieron cargar los usuarios.'));
    }
    if (resPublicaciones.status === 'fulfilled') {
        publicaciones = resPublicaciones.value;
        tablaPublicaciones.establecer(publicaciones);
        aplicarFiltroPublicaciones();
    } else {
        mostrarAlerta(alertaPublicaciones, mensajeDeError(resPublicaciones.reason, 'No se pudieron cargar las publicaciones.'));
    }
    dibujarResumen();
}

function tarjeta(titulo: string, valor: number): string {
    return `<div class="col-6 col-md-3"><div class="admin-tarjeta">
        <div class="admin-tarjeta-valor">${valor}</div><div class="admin-tarjeta-titulo">${escapeHtml(titulo)}</div>
    </div></div>`;
}

function dibujarResumen(): void {
    const contar = (estado: EstadoPublicacion): number => publicaciones.filter(p => p.estado === estado).length;
    porId('adminResumen').innerHTML = [
        tarjeta('Usuarios', usuarios.length),
        tarjeta('Publicaciones activas', contar('ACTIVA')),
        tarjeta('Vendidas', contar('VENDIDA')),
        tarjeta('Eliminadas', contar('ELIMINADA')),
    ].join('');
    porId('contadorUsuarios').textContent = String(usuarios.length);
    porId('contadorPublicaciones').textContent = String(publicaciones.length);
}
