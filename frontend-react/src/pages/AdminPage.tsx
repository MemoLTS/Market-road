import { useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import Alert from '../components/common/Alert';
import Campo from '../components/common/Campo';
import SelectorLocalidad from '../components/common/SelectorLocalidad';
import type { ValorLocalidad } from '../components/common/SelectorLocalidad';
import Modal from '../components/common/Modal';
import Spinner from '../components/common/Spinner';
import { formatoFechaCorta, formatoPrecio, mensajeDeError } from '../core/formato';
import { validarLocalidad } from '../core/localidad';
import { primerError, validarApodo, validarContrasenaNueva, validarCorreo, validarNombre } from '../core/validaciones';
import { useAsync } from '../hooks/useAsync';
import { adminService } from '../services/adminService';
import { config } from '../config';
import type { CambiosAdminUsuario } from '../data/baseDatos';
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
        <section className="card card-body border-0 shadow-sm mt-4 p-3 p-md-4" aria-label="Actividad de publicaciones" data-testid="actividad-publicaciones">
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
                    <div className="col-12 col-md-6"><div className="rounded-3 bg-body-tertiary p-3 p-md-4 h-100 text-center">
                        <div className="display-6 fw-bold" data-testid="pub-nuevas">{r?.nuevas ?? '—'}</div>
                        <div>Publicaciones nuevas</div><div className="small text-secondary">{etiqueta === 'Hoy' ? 'en las últimas 24 horas' : `en los últimos ${etiqueta}`}</div>
                    </div></div>
                    <div className="col-12 col-md-6"><div className="rounded-3 bg-body-tertiary p-3 p-md-4 h-100 text-center">
                        <div className="display-6 fw-bold" data-testid="pub-cerradas">{r?.cerradasVentas ?? '—'}</div>
                        <div>Cerradas en ventas</div><div className="small text-secondary">{etiqueta === 'Hoy' ? 'en las últimas 24 horas' : `en los últimos ${etiqueta}`}{r ? ` · ${r.totalVendidas} vendidas en total` : ''}</div>
                    </div></div>
                </div>
            )}
        </section>
    );
}

function Dashboard({ usuarios, publicaciones, resumen, onIrUsuarios }: { usuarios: Usuario[]; publicaciones: AdminPublicacion[]; resumen: ResumenSoporte | null; onIrUsuarios: () => void }) {
    const activas = publicaciones.filter(p => p.estado === 'ACTIVA').length;
    const vendidas = publicaciones.filter(p => p.estado === 'VENDIDA').length;
    const tarjetas: [string, number | string, string, string][] = [
        ['Usuarios', usuarios.length, 'text-primary bg-primary-subtle', 'bi-people'],
        ['Publicaciones activas', activas, 'text-success bg-success-subtle', 'bi-bag-check'],
        ['Publicaciones vendidas', vendidas, 'text-secondary bg-secondary-subtle', 'bi-cash-coin'],
        ['Tickets de soporte', resumen?.total ?? '—', 'text-warning-emphasis bg-warning-subtle', 'bi-life-preserver'],
    ];
    return (
        <>
            <div className="row g-3">
                {tarjetas.map(([t, v, c, icono]) => (
                    <div className="col-12 col-sm-6 col-xl-3" key={t}>
                        <div className="card stat-card"><div className="card-body d-flex align-items-center gap-3">
                            <span className={`stat-icono ${c}`}><i className={`bi ${icono}`} aria-hidden="true" /></span>
                            <div><div className="stat-valor">{v}</div><div className="stat-etiqueta">{t}</div></div>
                        </div></div>
                    </div>
                ))}
            </div>
            <div className="d-flex justify-content-end mt-3">
                <button type="button" className="btn btn-outline-primary btn-sm" onClick={onIrUsuarios}>Editar usuarios</button>
            </div>
            <ActividadPublicaciones />
        </>
    );
}

/** Ventana con el detalle de un ticket de soporte (solo lectura para el superusuario). */
export function TicketAdminModal({ id, onCerrar }: { id: number | null; onCerrar: () => void }) {
    const detalle = useAsync(() => (id === null ? Promise.resolve(null) : adminService.detalleTicket(id)), [id]);
    const d = detalle.datos;
    return (
        <Modal abierto={id !== null} titulo={d ? `Ticket #${d.ticket.id} · ${d.ticket.asunto}` : 'Detalle del ticket'} onCerrar={onCerrar} tamano="modal-lg">
            <Alert mensaje={detalle.error} />
            {detalle.cargando && !d ? <Spinner /> : d && (
                <>
                    <p className="small text-secondary mb-3" data-testid="ticket-datos">
                        {d.ticket.estadoNombre} · prioridad {d.ticket.prioridadNombre.toLowerCase()} · {d.ticket.categoriaNombre} · de {d.ticket.usuarioApodo} · {d.ticket.asignadoNombre ? `atiende ${d.ticket.asignadoNombre}` : 'sin asignar'}
                    </p>
                    <ul className="list-unstyled mb-0" data-testid="ticket-mensajes">
                        {d.mensajes.map(m => (
                            <li key={m.id} className="rounded-3 bg-body-tertiary p-3 mb-2">
                                <div className="small text-secondary mb-1"><strong>{m.autorNombre}</strong> ({m.autorTipo.toLowerCase()}) · {formatoFechaCorta(m.fecha)}</div>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{m.contenido}</div>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </Modal>
    );
}

/**
 * Ventana (modal) con TODOS los datos editables de un usuario: nombre, apellido, apodo, correo, ciudad y, si se quiere,
 * una contraseña nueva. Un único botón «Guardar cambios»; solo se envía lo que cambió (PATCH /admin/usuarios/{id}).
 * La ciudad sigue la misma regla que en publicaciones y perfil (elegida de la lista o del mapa).
 */
export function EditarUsuarioModal({ usuario, onCerrar, onGuardado }: { usuario: Usuario | null; onCerrar: () => void; onGuardado?: (u: Usuario) => void }) {
    const [v, setV] = useState({ nombre: '', apellido: '', apodo: '', correo: '', contrasena: '', repetir: '' });
    const [ciudad, setCiudad] = useState<ValorLocalidad>({ ubicacion: '', lugar: null });
    const [errorCiudad, setErrorCiudad] = useState<string | null>(null);
    const [estado, setEstado] = useState({ mensaje: '', tipo: 'danger' });
    const [guardando, setGuardando] = useState(false);
    const [cargadoId, setCargadoId] = useState<number | null>(null);

    // Al abrir la ventana para otra persona se cargan sus datos actuales (y al cerrarla se olvida la anterior).
    if (usuario && cargadoId !== usuario.id) {
        setCargadoId(usuario.id);
        setV({ nombre: usuario.nombre, apellido: usuario.apellido, apodo: usuario.apodo ?? '', correo: usuario.correo, contrasena: '', repetir: '' });
        setCiudad({ ubicacion: usuario.ciudad ?? '', lugar: null });
        setErrorCiudad(null);
        setEstado({ mensaje: '', tipo: 'danger' });
    }
    if (!usuario && cargadoId !== null) setCargadoId(null);

    const cambiar = (campo: keyof typeof v) => (e: ChangeEvent<HTMLInputElement>): void => setV(x => ({ ...x, [campo]: e.target.value }));

    async function guardar(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        if (!usuario) return;
        const errLocalidad = validarLocalidad(ciudad.ubicacion, ciudad.lugar, { obligatoria: false, original: usuario.ciudad ?? '', de: 'del usuario' });
        setErrorCiudad(errLocalidad);
        const quiereClave = v.contrasena !== '' || v.repetir !== '';
        const invalido = primerError(
            validarNombre(v.nombre, 'El nombre'), validarNombre(v.apellido, 'El apellido'), validarApodo(v.apodo), validarCorreo(v.correo), errLocalidad,
            quiereClave ? primerError(validarContrasenaNueva(v.contrasena), v.contrasena !== v.repetir ? 'Las contraseñas no coinciden.' : null) : null,
        );
        if (invalido) { setEstado({ mensaje: invalido, tipo: 'danger' }); return; }

        const cambios: CambiosAdminUsuario = {};
        if (v.nombre.trim() !== usuario.nombre) cambios.nombre = v.nombre.trim();
        if (v.apellido.trim() !== usuario.apellido) cambios.apellido = v.apellido.trim();
        if (v.apodo.trim() !== (usuario.apodo ?? '')) cambios.apodo = v.apodo.trim();
        if (v.correo.trim() !== usuario.correo) cambios.correo = v.correo.trim();
        if (ciudad.ubicacion.trim() !== (usuario.ciudad ?? '')) cambios.ciudad = ciudad.ubicacion.trim();
        if (quiereClave) cambios.contrasena = v.contrasena;
        if (!Object.keys(cambios).length) { setEstado({ mensaje: 'No hay cambios para guardar.', tipo: 'info' }); return; }

        setGuardando(true);
        try {
            const actualizado = await adminService.actualizarUsuario(usuario.id, cambios);
            setV(x => ({ ...x, contrasena: '', repetir: '' }));
            setEstado({ mensaje: `Datos de ${actualizado.apodo ?? actualizado.correo} actualizados.`, tipo: 'success' });
            onGuardado?.(actualizado);
        } catch (err) {
            setEstado({ mensaje: mensajeDeError(err, 'No se pudieron guardar los cambios.'), tipo: 'danger' });
        } finally {
            setGuardando(false);
        }
    }

    return (
        <Modal abierto={usuario !== null} titulo={usuario ? `Editar usuario #${usuario.id}` : 'Editar usuario'} onCerrar={onCerrar} tamano="modal-lg">
            <form onSubmit={guardar} noValidate aria-label="Editar usuario">
                <Alert mensaje={estado.mensaje} tipo={estado.tipo} />
                <div className="row">
                    <Campo id="adminNombre" etiqueta="Nombre" className="col-12 col-md-6 mb-3"><input id="adminNombre" className="form-control" value={v.nombre} onChange={cambiar('nombre')} /></Campo>
                    <Campo id="adminApellido" etiqueta="Apellido" className="col-12 col-md-6 mb-3"><input id="adminApellido" className="form-control" value={v.apellido} onChange={cambiar('apellido')} /></Campo>
                    <Campo id="adminApodo" etiqueta="Apodo" className="col-12 col-md-6 mb-3"><input id="adminApodo" className="form-control" value={v.apodo} onChange={cambiar('apodo')} /></Campo>
                    <Campo id="adminCorreo" etiqueta="Correo" className="col-12 col-md-6 mb-3"><input id="adminCorreo" type="email" className="form-control" value={v.correo} onChange={cambiar('correo')} /></Campo>
                </div>
                <Campo id="adminCiudad" etiqueta="Ciudad" ayuda="Búscala y elígela de la lista o del mapa (igual que en publicaciones).">
                    <SelectorLocalidad id="adminCiudad" valor={ciudad} original={usuario?.ciudad ?? ''} error={errorCiudad} onCambiar={n => { setCiudad(n); setErrorCiudad(null); }} />
                </Campo>
                <fieldset className="mb-3">
                    <legend className="form-label fs-6">Cambiar contraseña (opcional)</legend>
                    <div className="row">
                        <Campo id="adminClaveNueva" etiqueta="Nueva contraseña" ayuda="Entre 8 y 32 caracteres, con letras y números, sin espacios." className="col-12 col-md-6 mb-2">
                            <input id="adminClaveNueva" type="password" autoComplete="new-password" className="form-control" value={v.contrasena} onChange={cambiar('contrasena')} />
                        </Campo>
                        <Campo id="adminClaveRepetir" etiqueta="Repite la contraseña" className="col-12 col-md-6 mb-2">
                            <input id="adminClaveRepetir" type="password" autoComplete="new-password" className="form-control" value={v.repetir} onChange={cambiar('repetir')} />
                        </Campo>
                    </div>
                </fieldset>
                <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cerrar</button>
                    <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</button>
                </div>
            </form>
        </Modal>
    );
}

export default function AdminPage() {
    const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
    const [ticketAbierto, setTicketAbierto] = useState<number | null>(null);
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
            <h1 className="h2 mb-4">Administración</h1>
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
                    {pestana === 'dashboard' && <Dashboard usuarios={usuarios.datos ?? []} publicaciones={publicaciones.datos ?? []} resumen={resumen.datos} onIrUsuarios={() => { setPestana('usuarios'); setFiltro(''); }} />}
                    {pestana !== 'dashboard' && pestana !== 'soporte' && (
                        <input type="search" className="form-control mb-3" placeholder="Filtrar" aria-label="Filtrar" value={filtro} onChange={(e: ChangeEvent<HTMLInputElement>) => setFiltro(e.target.value)} />
                    )}
                    {pestana === 'usuarios' && (
                        <Tabla<Usuario> vacio="No hay usuarios." filas={filtrarPor(usuarios.datos ?? [], filtro, ['nombre', 'apellido', 'apodo', 'correo', 'ciudad'])}
                            columnas={[
                                { titulo: 'ID', celda: u => u.id }, { titulo: 'Nombre', celda: u => `${u.nombre} ${u.apellido}` },
                                { titulo: 'Apodo', celda: u => u.apodo ?? '—' }, { titulo: 'Correo', celda: u => u.correo },
                                { titulo: 'Ciudad', celda: u => u.ciudad ?? '—' }, { titulo: 'Rol', celda: u => u.rol ?? 'USUARIO' },
                                { titulo: 'Acciones', celda: u => <button type="button" className="btn btn-sm btn-outline-primary" aria-label={`Editar a ${u.apodo ?? u.correo}`} onClick={() => setUsuarioEditando(u)}>Editar</button> },
                            ]} />
                    )}
                    {pestana === 'publicaciones' && (
                        <Tabla<AdminPublicacion> vacio="No hay publicaciones." filas={filtrarPor(publicaciones.datos ?? [], filtro, ['titulo', 'categoriaNombre', 'ubicacion', 'vendedorApodo', 'estado'])}
                            columnas={[
                                { titulo: 'ID', celda: p => p.id }, { titulo: 'Título', celda: p => p.titulo }, { titulo: 'Precio', celda: p => formatoPrecio(p.precio) },
                                { titulo: 'Categoría', celda: p => p.categoriaNombre }, { titulo: 'Unidades', celda: p => p.unidades ?? 1 }, { titulo: 'Vendedor', celda: p => p.vendedorApodo ?? '—' },
                                { titulo: 'Estado', celda: p => <span className="badge text-bg-light border">{p.estado}</span> }, { titulo: 'Venta cerrada', celda: p => p.estado === 'VENDIDA' ? `${formatoPrecio(p.precioVenta ?? p.precio)}${p.fechaVenta ? ' · ' + formatoFechaCorta(p.fechaVenta) : ''}` : '—' }, { titulo: 'Creada', celda: p => formatoFechaCorta(p.fechaCreacion) },
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
                                        { titulo: '', celda: t => <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setTicketAbierto(t.id)}>Ver</button> },
                                    ]} />
                            </>
                        ))}
                </>
            )}
            <EditarUsuarioModal usuario={usuarioEditando} onCerrar={() => setUsuarioEditando(null)} onGuardado={u => { setUsuarioEditando(u); void usuarios.recargar(); }} />
            <TicketAdminModal id={ticketAbierto} onCerrar={() => setTicketAbierto(null)} />
        </div>
    );
}
