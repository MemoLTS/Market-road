import { useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import Alert from '../components/common/Alert';
import Spinner from '../components/common/Spinner';
import { formatoFechaCorta, formatoPrecio } from '../core/formato';
import { useAsync } from '../hooks/useAsync';
import { adminService } from '../services/adminService';
import { config } from '../config';
import type { AdminPublicacion, Usuario } from '../types/api';
import type { ResumenSoporte, TicketPanelResumen } from '../types/soporte';

/** Ventanas de tiempo del apartado de actividad: [días, etiqueta]. */
export const PERIODOS: [number, string][] = [[1, 'Hoy'], [7, '7 días'], [30, '30 días']];

const PESTANAS = [['dashboard', 'Dashboard'], ['usuarios', 'Usuarios'], ['publicaciones', 'Publicaciones'], ['soporte', 'Soporte']];

export function filtrarPor<T extends object>(lista: T[], texto: string, campos: (keyof T)[]): T[] {
    const q = texto.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(item => campos.some(c => String(item[c] ?? '').toLowerCase().includes(q)));
}

interface Columna<T> {
    titulo: string;
    celda: (fila: T) => ReactNode;
}

function Tabla<T extends { id: number }>({ columnas, filas, vacio }: { columnas: Columna<T>[]; filas: T[]; vacio: string }) {
    return (
        <div className="table-responsive">
            <table className="table table-sm table-hover align-middle">
                <thead><tr>{columnas.map(c => <th key={c.titulo}>{c.titulo}</th>)}</tr></thead>
                <tbody>
                    {filas.map(f => <tr key={f.id}>{columnas.map(c => <td key={c.titulo}>{c.celda(f)}</td>)}</tr>)}
                    {!filas.length && <tr><td colSpan={columnas.length} className="text-center text-secondary">{vacio}</td></tr>}
                </tbody>
            </table>
        </div>
    );
}

/** Apartado del dashboard: publicaciones nuevas y publicaciones cerradas en ventas dentro del período elegido. */
export function ActividadPublicaciones() {
    const [dias, setDias] = useState(7);
    const actividad = useAsync(() => adminService.resumenPublicaciones(dias), [dias]);
    const r = actividad.datos;
    const etiqueta = PERIODOS.find(([d]) => d === dias)?.[1] ?? `${dias} días`;
    return (
        <section className="card card-body mt-3" aria-label="Actividad de publicaciones" data-testid="actividad-publicaciones">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h2 className="h5 mb-0">Actividad de publicaciones</h2>
                <div className="btn-group btn-group-sm" role="group" aria-label="Período">
                    {PERIODOS.map(([d, t]) => (
                        <button type="button" key={d} className={`btn ${d === dias ? 'btn-primary' : 'btn-outline-primary'}`} aria-pressed={d === dias} onClick={() => setDias(d)}>{t}</button>
                    ))}
                </div>
            </div>
            <Alert mensaje={actividad.error} />
            {actividad.cargando && !r ? <Spinner /> : (
                <div className="row g-3">
                    <div className="col-12 col-md-6"><div className="border rounded p-3 h-100 text-center">
                        <div className="display-6 fw-bold" data-testid="pub-nuevas">{r?.nuevas ?? '—'}</div>
                        <div>Publicaciones nuevas</div><div className="small text-secondary">{etiqueta === 'Hoy' ? 'en las últimas 24 horas' : `en los últimos ${etiqueta}`}</div>
                    </div></div>
                    <div className="col-12 col-md-6"><div className="border rounded p-3 h-100 text-center">
                        <div className="display-6 fw-bold" data-testid="pub-cerradas">{r?.cerradasVentas ?? '—'}</div>
                        <div>Cerradas en ventas</div><div className="small text-secondary">{etiqueta === 'Hoy' ? 'en las últimas 24 horas' : `en los últimos ${etiqueta}`}{r ? ` · ${r.totalVendidas} vendidas en total` : ''}</div>
                    </div></div>
                </div>
            )}
        </section>
    );
}

function Dashboard({ usuarios, publicaciones, resumen }: { usuarios: Usuario[]; publicaciones: AdminPublicacion[]; resumen: ResumenSoporte | null }) {
    const activas = publicaciones.filter(p => p.estado === 'ACTIVA').length;
    const vendidas = publicaciones.filter(p => p.estado === 'VENDIDA').length;
    const tarjetas = [
        ['Usuarios', usuarios.length, 'text-bg-primary'],
        ['Publicaciones activas', activas, 'text-bg-success'],
        ['Publicaciones vendidas', vendidas, 'text-bg-secondary'],
        ['Tickets de soporte', resumen?.total ?? '—', 'text-bg-warning'],
    ];
    return (
        <>
            <div className="row g-3">
                {tarjetas.map(([t, v, c]) => (
                    <div className="col-6 col-lg-3" key={t}><div className={`card ${c} h-100`}><div className="card-body text-center"><div className="display-6 fw-bold">{v}</div><div>{t}</div></div></div></div>
                ))}
            </div>
            <ActividadPublicaciones />
        </>
    );
}

export default function AdminPage() {
    const [pestana, setPestana] = useState('dashboard');
    const [filtro, setFiltro] = useState('');
    const usuarios = useAsync(() => adminService.usuarios(), []);
    const publicaciones = useAsync(() => adminService.publicaciones(), []);
    const tickets = useAsync(() => (config.usarMock ? Promise.resolve(null) : adminService.tickets({ pagina: '0', tamano: '20' })), []);
    const resumen = useAsync(() => (config.usarMock ? Promise.resolve(null) : adminService.resumenTickets()), []);

    const cargando = usuarios.cargando || publicaciones.cargando;
    const error = usuarios.error || publicaciones.error;

    return (
        <div className="container py-4">
            <h1 className="h2 mb-3">Administración</h1>
            <ul className="nav nav-tabs mb-3" role="tablist">
                {PESTANAS.map(([k, t]) => (
                    <li className="nav-item" key={k} role="presentation">
                        <button type="button" role="tab" aria-selected={pestana === k} className={`nav-link ${pestana === k ? 'active' : ''}`} onClick={() => { setPestana(k); setFiltro(''); }}>{t}</button>
                    </li>
                ))}
            </ul>
            <Alert mensaje={error} />
            {cargando ? <Spinner /> : (
                <>
                    {pestana === 'dashboard' && <Dashboard usuarios={usuarios.datos ?? []} publicaciones={publicaciones.datos ?? []} resumen={resumen.datos} />}
                    {pestana !== 'dashboard' && pestana !== 'soporte' && (
                        <input type="search" className="form-control mb-3" placeholder="Filtrar" aria-label="Filtrar" value={filtro} onChange={(e: ChangeEvent<HTMLInputElement>) => setFiltro(e.target.value)} />
                    )}
                    {pestana === 'usuarios' && (
                        <Tabla<Usuario> vacio="No hay usuarios." filas={filtrarPor(usuarios.datos ?? [], filtro, ['nombre', 'apellido', 'apodo', 'correo', 'ciudad'])}
                            columnas={[
                                { titulo: 'ID', celda: u => u.id }, { titulo: 'Nombre', celda: u => `${u.nombre} ${u.apellido}` },
                                { titulo: 'Apodo', celda: u => u.apodo ?? '—' }, { titulo: 'Correo', celda: u => u.correo },
                                { titulo: 'Ciudad', celda: u => u.ciudad ?? '—' }, { titulo: 'Rol', celda: u => u.rol ?? 'USUARIO' },
                            ]} />
                    )}
                    {pestana === 'publicaciones' && (
                        <Tabla<AdminPublicacion> vacio="No hay publicaciones." filas={filtrarPor(publicaciones.datos ?? [], filtro, ['titulo', 'categoriaNombre', 'ubicacion', 'vendedorApodo', 'estado'])}
                            columnas={[
                                { titulo: 'ID', celda: p => p.id }, { titulo: 'Título', celda: p => p.titulo }, { titulo: 'Precio', celda: p => formatoPrecio(p.precio) },
                                { titulo: 'Categoría', celda: p => p.categoriaNombre }, { titulo: 'Unidades', celda: p => p.unidades ?? 1 }, { titulo: 'Vendedor', celda: p => p.vendedorApodo ?? '—' },
                                { titulo: 'Estado', celda: p => <span className="badge text-bg-light border">{p.estado}</span> }, { titulo: 'Creada', celda: p => formatoFechaCorta(p.fechaCreacion) },
                            ]} />
                    )}
                    {pestana === 'soporte' && (config.usarMock
                        ? <p className="text-secondary">El soporte requiere el backend real (modo demostración activo).</p>
                        : (
                            <>
                                <Alert mensaje={tickets.error} />
                                <Tabla<TicketPanelResumen> vacio="No hay tickets." filas={tickets.datos?.contenido ?? []}
                                    columnas={[
                                        { titulo: 'ID', celda: t => t.id }, { titulo: 'Asunto', celda: t => t.asunto }, { titulo: 'Usuario', celda: t => t.usuarioApodo },
                                        { titulo: 'Estado', celda: t => t.estadoNombre }, { titulo: 'Prioridad', celda: t => t.prioridadNombre }, { titulo: 'Asignado', celda: t => t.asignadoNombre ?? 'Sin asignar' },
                                    ]} />
                            </>
                        ))}
                </>
            )}
        </div>
    );
}
