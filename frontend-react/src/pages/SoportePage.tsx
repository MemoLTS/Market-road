import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';
import Spinner from '../components/common/Spinner';
import ChatThread from '../components/chat/ChatThread';
import type { MensajeChat } from '../components/chat/ChatThread';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { formatoFechaCorta, mensajeDeError } from '../core/formato';
import { useAsync } from '../hooks/useAsync';
import { soporteUsuarioService } from '../services/soporteService';
import type { Categoria } from '../types/api';
import type { EstadoTicket, MensajeTicket, TicketDetalle } from '../types/soporte';

export const COLOR_ESTADO: Record<EstadoTicket, string> = { ABIERTO: 'text-bg-warning', EN_PROGRESO: 'text-bg-primary', RESUELTO: 'text-bg-success', CERRADO: 'text-bg-secondary' };
const MIN_ASUNTO = 5;
const MAX_ASUNTO = 100;
const MAX_MENSAJE = 2000;

export function normalizarMensajesTicket(mensajes: MensajeTicket[], esMio: (m: MensajeTicket) => boolean): MensajeChat[] {
    return mensajes.map((m): MensajeChat => ({
        id: m.id, mio: esMio(m), tipo: m.autorTipo === 'SISTEMA' ? 'SISTEMA' : 'TEXTO',
        contenido: m.contenido, fecha: m.fecha, autor: m.autorNombre,
    }));
}

function NuevoTicket({ categorias, onCreado, onCancelar }: { categorias: Categoria[]; onCreado: (ticket: TicketDetalle) => void; onCancelar: () => void }) {
    const [v, setV] = useState({ categoria: '', asunto: '', mensaje: '' });
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);
    const cambiar = (campo: 'categoria' | 'asunto' | 'mensaje') => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => setV(x => ({ ...x, [campo]: e.target.value }));

    async function enviar(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        const asunto = v.asunto.trim();
        const mensaje = v.mensaje.trim();
        const invalido = !v.categoria ? 'Elige una categoría.'
            : asunto.length < MIN_ASUNTO ? `El asunto debe tener al menos ${MIN_ASUNTO} caracteres.`
                : asunto.length > MAX_ASUNTO ? `El asunto puede tener como máximo ${MAX_ASUNTO} caracteres.`
                    : !mensaje ? 'Cuéntanos qué necesitas.'
                        : mensaje.length > MAX_MENSAJE ? `El mensaje puede tener como máximo ${MAX_MENSAJE} caracteres.` : null;
        if (invalido) { setError(invalido); return; }
        setEnviando(true);
        try {
            onCreado(await soporteUsuarioService.crear(asunto, v.categoria, mensaje));
        } catch (err) {
            setError(mensajeDeError(err));
        } finally {
            setEnviando(false);
        }
    }

    return (
        <form onSubmit={enviar} noValidate aria-label="Nuevo ticket">
            <Alert mensaje={error} />
            <div className="mb-3"><label htmlFor="ticketCategoria" className="form-label">Categoría</label>
                <select id="ticketCategoria" className="form-select" value={v.categoria} onChange={cambiar('categoria')}>
                    <option value="" disabled>Elige una categoría</option>
                    {categorias.map(c => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
                </select></div>
            <div className="mb-3"><label htmlFor="ticketAsunto" className="form-label">Asunto</label>
                <input id="ticketAsunto" className="form-control" maxLength={MAX_ASUNTO} value={v.asunto} onChange={cambiar('asunto')} /></div>
            <div className="mb-3"><label htmlFor="ticketMensaje" className="form-label">¿Qué necesitas?</label>
                <textarea id="ticketMensaje" className="form-control" rows={4} maxLength={MAX_MENSAJE} value={v.mensaje} onChange={cambiar('mensaje')} /></div>
            <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={onCancelar}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar'}</button>
            </div>
        </form>
    );
}

export default function SoportePage() {
    const { autenticado } = useAuth();
    const { abrirLogin } = useUi();
    const { datos: tickets, cargando, error, recargar } = useAsync(() => (autenticado ? soporteUsuarioService.listar() : Promise.resolve([])), [autenticado]);
    const { datos: categorias } = useAsync(() => (autenticado ? soporteUsuarioService.categorias() : Promise.resolve([])), [autenticado]);
    const [activo, setActivo] = useState<TicketDetalle | null>(null);
    const [nuevo, setNuevo] = useState(false);
    const [errorAccion, setErrorAccion] = useState('');

    useEffect(() => {
        if (!autenticado) return undefined;
        const t = setInterval(() => {
            if (document.hidden) return;
            recargar();
            if (activo) soporteUsuarioService.detalle(activo.ticket.id).then(setActivo).catch(() => {});
        }, 10000);
        return () => clearInterval(t);
    }, [autenticado, activo, recargar]);

    if (!autenticado) {
        return (
            <div className="container py-5 text-center">
                <h1 className="h2">Centro de soporte</h1>
                <p className="text-secondary">Inicia sesión para abrir un ticket o revisar tus consultas.</p>
                <button type="button" className="btn btn-primary" onClick={abrirLogin}>Iniciar sesión</button>
            </div>
        );
    }

    async function abrir(id: number): Promise<void> {
        setErrorAccion('');
        try { setActivo(await soporteUsuarioService.detalle(id)); } catch (e) { setErrorAccion(mensajeDeError(e)); }
    }

    async function responder(contenido: string): Promise<void> {
        if (!activo) return;
        setErrorAccion('');
        try {
            setActivo(await soporteUsuarioService.responder(activo.ticket.id, contenido));
            recargar();
        } catch (e) { setErrorAccion(mensajeDeError(e)); throw e; }
    }

    async function cerrar(): Promise<void> {
        if (!activo) return;
        if (!window.confirm('¿Cerrar este ticket? Ya no podrás escribir en él, pero podrás abrir uno nuevo.')) return;
        try { setActivo(await soporteUsuarioService.cerrar(activo.ticket.id)); recargar(); } catch (e) { setErrorAccion(mensajeDeError(e)); }
    }

    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h1 className="h2 mb-0">Soporte</h1>
                <button type="button" className="btn btn-primary" onClick={() => setNuevo(true)}>Nuevo ticket</button>
            </div>
            <Alert mensaje={error} />
            <div className="row g-3">
                <div className={`col-12 col-md-4 ${activo ? 'd-none d-md-block' : ''}`}>
                    {cargando && !tickets ? <Spinner /> : (
                        <div className="list-group">
                            {(tickets ?? []).map(t => (
                                <button key={t.id} type="button" className={`list-group-item list-group-item-action ${activo?.ticket.id === t.id ? 'active' : ''}`} onClick={() => abrir(t.id)}>
                                    <div className="d-flex justify-content-between"><strong className="text-truncate">#{t.id} · {t.asunto}</strong>
                                        {t.noLeidos > 0 && <span className="badge text-bg-danger">{t.noLeidos}</span>}</div>
                                    <small><span className={`badge ${COLOR_ESTADO[t.estado]}`}>{t.estadoNombre}</span> {formatoFechaCorta(t.fechaActualizacion)}</small>
                                </button>
                            ))}
                            {!(tickets ?? []).length && <p className="text-secondary text-center small my-3">Aún no tienes tickets.</p>}
                        </div>
                    )}
                </div>
                <div className={`col-12 col-md-8 ${activo ? '' : 'd-none d-md-block'}`}>
                    {activo ? (
                        <div className="card h-100">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <div><button type="button" className="btn btn-sm btn-outline-secondary d-md-none me-2" onClick={() => setActivo(null)}>← Volver</button>
                                    <strong>#{activo.ticket.id} · {activo.ticket.asunto}</strong>
                                    <div className="small text-secondary">{activo.ticket.categoriaNombre}</div></div>
                                {activo.puedeEscribir && <button type="button" className="btn btn-sm btn-outline-danger" onClick={cerrar}>Cerrar ticket</button>}
                            </div>
                            <div className="chat-contenedor">
                                <ChatThread mensajes={normalizarMensajesTicket(activo.mensajes, m => m.autorTipo === 'USUARIO')} puedeEscribir={activo.puedeEscribir} onEnviar={responder} error={errorAccion} />
                            </div>
                        </div>
                    ) : <div className="text-secondary text-center py-5">Selecciona un ticket o abre uno nuevo.</div>}
                </div>
            </div>
            <Modal abierto={nuevo} titulo="Nuevo ticket" onCerrar={() => setNuevo(false)}>
                <NuevoTicket categorias={categorias ?? []} onCancelar={() => setNuevo(false)}
                    onCreado={d => { setNuevo(false); setActivo(d); recargar(); }} />
            </Modal>
        </div>
    );
}
