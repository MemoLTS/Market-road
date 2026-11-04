import { useState } from 'react';
import Alert from '../components/common/Alert.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { formatoFechaCorta, formatoPrecio } from '../core/formato.js';
import { useAsync } from '../hooks/useAsync.js';
import { adminService } from '../services/adminService.js';
import { config } from '../config.js';

const PESTANAS = [['dashboard', 'Dashboard'], ['usuarios', 'Usuarios'], ['publicaciones', 'Publicaciones'], ['soporte', 'Soporte']];

export function filtrarPor(lista, texto, campos) {
    const q = texto.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(item => campos.some(c => String(item[c] ?? '').toLowerCase().includes(q)));
}

function Tabla({ columnas, filas, vacio }) {
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

function Dashboard({ usuarios, publicaciones, resumen }) {
    const activas = publicaciones.filter(p => p.estado === 'ACTIVA').length;
    const vendidas = publicaciones.filter(p => p.estado === 'VENDIDA').length;
    const tarjetas = [
        ['Usuarios', usuarios.length, 'text-bg-primary'],
        ['Publicaciones activas', activas, 'text-bg-success'],
        ['Publicaciones vendidas', vendidas, 'text-bg-secondary'],
        ['Tickets de soporte', resumen?.total ?? '—', 'text-bg-warning'],
    ];
    return (
        <div className="row g-3">
            {tarjetas.map(([t, v, c]) => (
                <div className="col-6 col-lg-3" key={t}><div className={`card ${c} h-100`}><div className="card-body text-center"><div className="display-6 fw-bold">{v}</div><div>{t}</div></div></div></div>
            ))}
        </div>
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
                        <input type="search" className="form-control mb-3" placeholder="Filtrar" aria-label="Filtrar" value={filtro} onChange={e => setFiltro(e.target.value)} />
                    )}
                    {pestana === 'usuarios' && (
                        <Tabla vacio="No hay usuarios." filas={filtrarPor(usuarios.datos ?? [], filtro, ['nombre', 'apellido', 'apodo', 'correo', 'ciudad'])}
                            columnas={[
                                { titulo: 'ID', celda: u => u.id }, { titulo: 'Nombre', celda: u => `${u.nombre} ${u.apellido}` },
                                { titulo: 'Apodo', celda: u => u.apodo ?? '—' }, { titulo: 'Correo', celda: u => u.correo },
                                { titulo: 'Ciudad', celda: u => u.ciudad ?? '—' }, { titulo: 'Rol', celda: u => u.rol ?? 'USUARIO' },
                            ]} />
                    )}
                    {pestana === 'publicaciones' && (
                        <Tabla vacio="No hay publicaciones." filas={filtrarPor(publicaciones.datos ?? [], filtro, ['titulo', 'categoriaNombre', 'ubicacion', 'vendedorApodo', 'estado'])}
                            columnas={[
                                { titulo: 'ID', celda: p => p.id }, { titulo: 'Título', celda: p => p.titulo }, { titulo: 'Precio', celda: p => formatoPrecio(p.precio) },
                                { titulo: 'Categoría', celda: p => p.categoriaNombre }, { titulo: 'Vendedor', celda: p => p.vendedorApodo ?? '—' },
                                { titulo: 'Estado', celda: p => <span className="badge text-bg-light border">{p.estado}</span> }, { titulo: 'Creada', celda: p => formatoFechaCorta(p.fechaCreacion) },
                            ]} />
                    )}
                    {pestana === 'soporte' && (config.usarMock
                        ? <p className="text-secondary">El soporte requiere el backend real (modo demostración activo).</p>
                        : (
                            <>
                                <Alert mensaje={tickets.error} />
                                <Tabla vacio="No hay tickets." filas={tickets.datos?.contenido ?? []}
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
