import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Alert from '../components/common/Alert';
import Pagination from '../components/common/Pagination';
import Spinner from '../components/common/Spinner';
import ChatThread from '../components/chat/ChatThread';
import { formatoFechaCorta, mensajeDeError } from '../core/formato';
import { useAsync } from '../hooks/useAsync';
import { EVENTO_SESION_SOPORTE, guardarSesionSoporte, limpiarSesionSoporte, obtenerSesionSoporte } from '../services/sesionSoporte';
import { soportePanelService } from '../services/soporteService';
import type { EstadoTicket, PersonalSoporte, PrioridadTicket, TicketPanelDetalle } from '../types/soporte';
import { COLOR_ESTADO, normalizarMensajesTicket } from './SoportePage';

const NOMBRE_ESTADO: Record<EstadoTicket, string> = { ABIERTO: 'Abierto', EN_PROGRESO: 'En progreso', RESUELTO: 'Resuelto', CERRADO: 'Cerrado' };
const NOMBRE_PRIORIDAD: Record<PrioridadTicket, string> = { BAJA: 'Baja', NORMAL: 'Normal', ALTA: 'Alta', URGENTE: 'Urgente' };
const TAMANO = 20;

function LoginPanel() {
    const [correo, setCorreo] = useState('');
    const [clave, setClave] = useState('');
    const [error, setError] = useState('');
    async function entrar(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        if (!correo.trim() || !clave) { setError('Ingresa tu correo y tu contraseña.'); return; }
        try {
            guardarSesionSoporte(await soportePanelService.login(correo.trim(), clave));
        } catch (err) { setError(mensajeDeError(err)); }
    }
    return (
        <div className="container py-5" style={{ maxWidth: 420 }}>
            <h1 className="h3 mb-3">Panel de soporte</h1>
            <form onSubmit={entrar} noValidate aria-label="Acceso del personal">
                <Alert mensaje={error} />
                <div className="mb-3"><label htmlFor="spCorreo" className="form-label">Correo</label><input id="spCorreo" type="email" className="form-control" value={correo} onChange={(e: ChangeEvent<HTMLInputElement>) => setCorreo(e.target.value)} /></div>
                <div className="mb-3"><label htmlFor="spClave" className="form-label">Contraseña</label><input id="spClave" type="password" className="form-control" value={clave} onChange={(e: ChangeEvent<HTMLInputElement>) => setClave(e.target.value)} /></div>
                <button type="submit" className="btn btn-primary w-100">Ingresar</button>
            </form>
        </div>
    );
}

function Tickets({ yo }: { yo: PersonalSoporte }) {
    const [filtros, setFiltros] = useState<{ estado: string; asignacion: string; prioridad: string; q: string }>({ estado: 'ACTIVOS', asignacion: 'TODOS', prioridad: '', q: '' });
    const [pagina, setPagina] = useState(0);
    const [activo, setActivo] = useState<TicketPanelDetalle | null>(null);
    const [error, setError] = useState('');
    const { datos: personal } = useAsync(() => (yo.rol === 'ADMIN' ? soportePanelService.personal() : Promise.resolve([])), []);

    const parametros = useCallback(() => {
        const p: Record<string, string> = { pagina: String(pagina), tamano: String(TAMANO) };
        if (filtros.estado) p.estado = filtros.estado;
        if (filtros.asignacion !== 'TODOS') p.asignacion = filtros.asignacion;
        if (filtros.prioridad) p.prioridad = filtros.prioridad;
        if (filtros.q.trim()) p.q = filtros.q.trim();
        return p;
    }, [filtros, pagina]);

    const { datos, cargando, error: errorLista, recargar } = useAsync(() => soportePanelService.tickets(parametros()), [JSON.stringify(parametros())]);

    useEffect(() => {
        const t = setInterval(() => {
            if (document.hidden) return;
            recargar();
            if (activo) soportePanelService.detalle(activo.ticket.id).then(setActivo).catch(() => {});
        }, 10000);
        return () => clearInterval(t);
    }, [activo, recargar]);

    const cambiarFiltro = (campo: 'estado' | 'asignacion' | 'prioridad' | 'q') => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => { setFiltros(f => ({ ...f, [campo]: e.target.value })); setPagina(0); };

    async function ejecutar(promesa: Promise<TicketPanelDetalle>): Promise<void> {
        setError('');
        try { setActivo(await promesa); recargar(); } catch (e) { setError(mensajeDeError(e)); throw e; }
    }

    const d = activo;
    return (
        <div className="row g-3">
            <div className={`col-12 col-lg-5 ${d ? 'd-none d-lg-block' : ''}`}>
                <div className="row g-2 mb-2">
                    <div className="col-6"><select aria-label="Estado" className="form-select form-select-sm" value={filtros.estado} onChange={cambiarFiltro('estado')}>
                        <option value="ACTIVOS">Pendientes</option><option value="">Todos</option>
                        {Object.entries(NOMBRE_ESTADO).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></div>
                    <div className="col-6"><select aria-label="Asignación" className="form-select form-select-sm" value={filtros.asignacion} onChange={cambiarFiltro('asignacion')}>
                        <option value="TODOS">Todos</option><option value="MIOS">Míos</option><option value="SIN_ASIGNAR">Sin asignar</option></select></div>
                    <div className="col-6"><select aria-label="Prioridad" className="form-select form-select-sm" value={filtros.prioridad} onChange={cambiarFiltro('prioridad')}>
                        <option value="">Toda prioridad</option>{Object.entries(NOMBRE_PRIORIDAD).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></div>
                    <div className="col-6"><input type="search" aria-label="Buscar" placeholder="Buscar" className="form-control form-control-sm" value={filtros.q} onChange={cambiarFiltro('q')} /></div>
                </div>
                <Alert mensaje={errorLista} />
                {cargando && !datos ? <Spinner /> : (
                    <div className="list-group mb-2">
                        {(datos?.contenido ?? []).map(t => (
                            <button key={t.id} type="button" className={`list-group-item list-group-item-action ${d?.ticket.id === t.id ? 'active' : ''}`}
                                onClick={() => soportePanelService.detalle(t.id).then(setActivo).catch(e => setError(mensajeDeError(e)))}>
                                <div className="d-flex justify-content-between"><strong className="text-truncate">#{t.id} · {t.asunto}</strong>{t.sinLeer > 0 && <span className="badge text-bg-danger">{t.sinLeer}</span>}</div>
                                <small><span className={`badge ${COLOR_ESTADO[t.estado]}`}>{t.estadoNombre}</span> {t.prioridadNombre} · {t.usuarioApodo} · {t.asignadoNombre ?? 'Sin asignar'}</small>
                            </button>
                        ))}
                        {!(datos?.contenido ?? []).length && <p className="text-secondary small text-center my-3">No hay tickets con esos filtros.</p>}
                    </div>
                )}
                <Pagination pagina={pagina} totalPaginas={datos?.totalPaginas ?? 1} onCambiar={setPagina} />
            </div>
            <div className={`col-12 col-lg-7 ${d ? '' : 'd-none d-lg-block'}`}>
                {!d ? <div className="text-secondary text-center py-5">Selecciona un ticket.</div> : (
                    <div className="card h-100">
                        <div className="card-header">
                            <button type="button" className="btn btn-sm btn-outline-secondary d-lg-none me-2" onClick={() => setActivo(null)}>← Volver</button>
                            <strong>#{d.ticket.id} · {d.ticket.asunto}</strong>
                            <div className="small text-secondary">{d.ticket.categoriaNombre} · {d.usuario.apodo}{d.usuario.correo ? ` (${d.usuario.correo})` : ''} · abierto {formatoFechaCorta(d.ticket.fechaCreacion)}</div>
                            <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                                <span className={`badge ${COLOR_ESTADO[d.ticket.estado]}`}>{d.ticket.estadoNombre}</span>
                                {d.puedeTomar && <button type="button" className="btn btn-sm btn-primary" onClick={() => ejecutar(soportePanelService.tomar(d.ticket.id)).catch(() => {})}>{d.ticket.asignadoId ? 'Reasignarme' : 'Tomar ticket'}</button>}
                                {!d.puedeTomar && d.ticket.asignadoNombre && <span className="small text-secondary">Lo lleva <strong>{d.ticket.asignadoNombre}</strong></span>}
                                {d.estadosPermitidos.length > 0 && (
                                    <select aria-label="Cambiar estado" className="form-select form-select-sm w-auto" defaultValue="" onChange={(e: ChangeEvent<HTMLSelectElement>) => ejecutar(soportePanelService.cambiarEstado(d.ticket.id, e.target.value as EstadoTicket)).catch(() => {})}>
                                        <option value="" disabled>Cambiar estado…</option>{d.estadosPermitidos.map(e => <option key={e} value={e}>{NOMBRE_ESTADO[e]}</option>)}
                                    </select>
                                )}
                                <select aria-label="Prioridad del ticket" className="form-select form-select-sm w-auto" value={d.ticket.prioridad} onChange={(e: ChangeEvent<HTMLSelectElement>) => ejecutar(soportePanelService.cambiarPrioridad(d.ticket.id, e.target.value as PrioridadTicket)).catch(() => {})}>
                                    {Object.entries(NOMBRE_PRIORIDAD).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                                </select>
                                {yo.rol === 'ADMIN' && d.ticket.estado !== 'CERRADO' && (
                                    <select aria-label="Asignar a" className="form-select form-select-sm w-auto" value={d.ticket.asignadoId ?? ''}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => ejecutar(soportePanelService.asignar(d.ticket.id, e.target.value ? Number(e.target.value) : null)).catch(() => {})}>
                                        <option value="">Sin asignar</option>
                                        {(personal ?? []).filter(p => p.activo || p.id === d.ticket.asignadoId).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>
                        <div className="chat-contenedor">
                            <ChatThread mensajes={normalizarMensajesTicket(d.mensajes, m => m.autorTipo === 'PERSONAL')} puedeEscribir={d.puedeResponder} error={error}
                                onEnviar={c => ejecutar(soportePanelService.responder(d.ticket.id, c))} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Equipo() {
    const { datos, error, cargando } = useAsync(() => soportePanelService.personal(), []);
    const { datos: est } = useAsync(() => soportePanelService.estadisticas(), []);
    if (cargando) return <Spinner />;
    return (
        <div>
            <Alert mensaje={error} />
            {est && (
                <div className="row g-3 mb-4">
                    {[['Tickets', est.totalTickets], ['Sin asignar', est.sinAsignar], ['Últimos 7 días', est.creadosUltimos7Dias], ['Personal activo', est.personalActivo]].map(([t, v]) => (
                        <div className="col-6 col-md-3" key={t}><div className="card card-body text-center"><div className="fs-3 fw-bold">{v}</div><div className="small text-secondary">{t}</div></div></div>
                    ))}
                </div>
            )}
            <div className="table-responsive">
                <table className="table table-sm align-middle">
                    <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Activo</th><th>En curso</th><th>Último acceso</th></tr></thead>
                    <tbody>{(datos ?? []).map(p => (
                        <tr key={p.id}><td>{p.nombre}</td><td>{p.correo}</td><td>{p.rolNombre}</td><td>{p.activo ? 'Sí' : 'No'}</td><td>{p.ticketsEnCurso}</td><td>{p.ultimoAcceso ? formatoFechaCorta(p.ultimoAcceso) : '—'}</td></tr>
                    ))}</tbody>
                </table>
            </div>
            <p className="small text-secondary">La creación y edición del equipo sigue disponible en el panel original (soporte-panel.html).</p>
        </div>
    );
}

export default function SoportePanelPage() {
    const [sesion, setSesion] = useState(obtenerSesionSoporte);
    const [pestana, setPestana] = useState('tickets');
    useEffect(() => {
        const sync = () => setSesion(obtenerSesionSoporte());
        window.addEventListener(EVENTO_SESION_SOPORTE, sync);
        return () => window.removeEventListener(EVENTO_SESION_SOPORTE, sync);
    }, []);
    if (!sesion) return <LoginPanel />;
    const yo = sesion.personal;
    return (
        <div className="container py-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h1 className="h3 mb-0">Panel de soporte <small className="text-secondary fs-6">{yo.nombre} · {yo.rolNombre}</small></h1>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={limpiarSesionSoporte}>Cerrar sesión</button>
            </div>
            {yo.rol === 'ADMIN' && (
                <ul className="nav nav-tabs mb-3">
                    <li className="nav-item"><button type="button" className={`nav-link ${pestana === 'tickets' ? 'active' : ''}`} onClick={() => setPestana('tickets')}>Tickets</button></li>
                    <li className="nav-item"><button type="button" className={`nav-link ${pestana === 'equipo' ? 'active' : ''}`} onClick={() => setPestana('equipo')}>Equipo y estadísticas</button></li>
                </ul>
            )}
            {pestana === 'tickets' ? <Tickets yo={yo} /> : <Equipo />}
        </div>
    );
}
