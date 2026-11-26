import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Alert from '../components/common/Alert';
import ConfirmarModal from '../components/common/ConfirmarModal';
import Spinner from '../components/common/Spinner';
import ChatThread from '../components/chat/ChatThread';
import type { MensajeChat } from '../components/chat/ChatThread';
import { useAuth } from '../context/AuthContext';
import { formatoPrecio, mensajeDeError } from '../core/formato';
import { validarMonto } from '../core/validaciones';
import { Link, useNavigate, useParams } from '../core/router';
import { RESPUESTAS_RAPIDAS } from '../core/mensajesPredeterminados';
import { useAsync } from '../hooks/useAsync';
import { urlAbsoluta } from '../services/http';
import { mensajesService } from '../services/mensajesService';
import { soporteUsuarioService } from '../services/soporteService';
import type { ConversacionDetalle, ConversacionResumen, Mensaje, RespuestaVenta } from '../types/api';

const RAPIDAS = RESPUESTAS_RAPIDAS;

export function normalizarMensajes(mensajes: Mensaje[], miId: number): MensajeChat[] {
    return mensajes.map(m => ({
        id: m.id, mio: m.remitenteId === miId, tipo: m.tipo, contenido: m.contenido, fecha: m.fechaEnvio,
        monto: m.monto, estadoOferta: m.estadoOferta, leido: m.leido,
    }));
}

export type FiltroConversaciones = 'TODAS' | 'COMPRANDO' | 'VENDIENDO';

export function filtrarConversaciones(lista: ConversacionResumen[], filtro: FiltroConversaciones, busqueda: string): ConversacionResumen[] {
    const q = busqueda.trim().toLowerCase();
    return lista.filter(c => {
        if (filtro === 'COMPRANDO' && c.rol !== 'COMPRADOR') return false;
        if (filtro === 'VENDIENDO' && c.rol !== 'VENDEDOR') return false;
        if (q && !(c.publicacionTitulo.toLowerCase().includes(q) || c.interlocutorApodo.toLowerCase().includes(q))) return false;
        return true;
    });
}

function ListaConversaciones({ conversaciones, activaId }: { conversaciones: ConversacionResumen[]; activaId: number | null }) {
    const [filtro, setFiltro] = useState<FiltroConversaciones>('TODAS');
    const [busqueda, setBusqueda] = useState('');
    const visibles = useMemo(() => filtrarConversaciones(conversaciones, filtro, busqueda), [conversaciones, filtro, busqueda]);
    return (
        <div className="d-flex flex-column gap-2">
            <input type="search" className="form-control" placeholder="Buscar conversación" aria-label="Buscar conversación" value={busqueda} onChange={(e: ChangeEvent<HTMLInputElement>) => setBusqueda(e.target.value)} />
            <div className="btn-group btn-group-sm" role="group" aria-label="Filtrar conversaciones">
                {([['TODAS', 'Todas'], ['COMPRANDO', 'Comprando'], ['VENDIENDO', 'Vendiendo']] as [FiltroConversaciones, string][]).map(([k, t]) => (
                    <button key={k} type="button" className={`btn btn-outline-secondary ${filtro === k ? 'active' : ''}`} onClick={() => setFiltro(k)}>{t}</button>
                ))}
            </div>
            {!visibles.length && <p className="text-secondary small text-center my-3">No hay conversaciones.</p>}
            <div className="list-group">
                {visibles.map(c => (
                    <Link key={c.id} to={`/mensajes/${c.id}`} className={`list-group-item list-group-item-action d-flex gap-2 ${c.id === activaId ? 'active' : ''}`}>
                        {c.imagenUrl && <img src={urlAbsoluta(c.imagenUrl)} alt="" width="48" height="48" className="rounded object-fit-cover" />}
                        <div className="flex-grow-1 text-truncate">
                            <div className="d-flex justify-content-between"><strong className="text-truncate">{c.publicacionTitulo}</strong>
                                {c.noLeidos > 0 && <span className="badge text-bg-danger">{c.noLeidos}</span>}</div>
                            <small className="d-block">{c.interlocutorApodo} · {c.rol === 'COMPRADOR' ? 'Comprando' : 'Vendiendo'}</small>
                            <small className="d-block text-truncate">{c.ultimoMensaje ?? 'Sin mensajes'}</small>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

const ETIQUETA_ESTADO: Record<string, string> = { VENDIDA: 'Vendida', ELIMINADA: 'Eliminada', OCULTA: 'Oculta', DESHABILITADA: 'Deshabilitada' };

/**
 * Seguimiento de una venta marcada por el vendedor. La persona señalada como compradora responde si compró,
 * si no compró, o describe otra situación (queda en revisión y se envía a soporte como ticket).
 */
export function SeguimientoVenta({ c, onResponder }: { c: ConversacionResumen; onResponder: (r: RespuestaVenta, detalle?: string) => Promise<void> }) {
    const [otra, setOtra] = useState(false);
    const [detalle, setDetalle] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);
    if (!c.ventaEstado) return null;

    async function responder(r: RespuestaVenta, texto?: string): Promise<void> {
        setError(''); setEnviando(true);
        try { await onResponder(r, texto); } catch (e) { setError(mensajeDeError(e, 'No se pudo enviar tu respuesta.')); } finally { setEnviando(false); }
    }
    function enviarOtra(e: FormEvent<HTMLFormElement>): void {
        e.preventDefault();
        const texto = detalle.trim();
        if (texto.length < 10) { setError('Describe lo que sucedió (mínimo 10 caracteres).'); return; }
        void responder('OTRO', texto);
    }

    if (c.ventaEstado === 'CONFIRMADA') return <div className="alert alert-success m-2 mb-0 py-2" role="status">Venta confirmada por ambas partes.</div>;
    if (c.ventaEstado === 'EN_REVISION') return (
        <div className="alert alert-warning m-2 mb-0 py-2" role="status">
            La venta está en revisión de soporte.{c.ventaDetalle && <div className="small mt-1">Detalle informado: {c.ventaDetalle}</div>}
        </div>
    );
    if (c.rol === 'VENDEDOR') return <div className="alert alert-info m-2 mb-0 py-2" role="status">Esperando que {c.interlocutorApodo} confirme la compra.</div>;
    return (
        <div className="alert alert-info m-2 mb-0" role="group" aria-label="Confirmar la compra">
            <p className="mb-2"><strong>{c.interlocutorApodo}</strong> te marcó como la persona que compró «{c.publicacionTitulo}» por {formatoPrecio(c.montoAcordado ?? c.publicacionPrecio)}. ¿Lo compraste?</p>
            <Alert mensaje={error} />
            {otra ? (
                <form onSubmit={enviarOtra} aria-label="Describir lo ocurrido">
                    <label className="form-label small" htmlFor="detalle-venta">Cuéntanos qué sucedió. Soporte revisará el caso.</label>
                    <textarea id="detalle-venta" className="form-control mb-2" rows={3} maxLength={900} value={detalle} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDetalle(e.target.value)} />
                    <div className="d-flex gap-2">
                        <button type="submit" className="btn btn-sm btn-primary" disabled={enviando}>Enviar a soporte</button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setOtra(false)} disabled={enviando}>Volver</button>
                    </div>
                </form>
            ) : (
                <div className="d-flex flex-wrap gap-2">
                    <button type="button" className="btn btn-sm btn-success" disabled={enviando} onClick={() => { void responder('COMPRADO'); }}>Sí, lo compré</button>
                    <button type="button" className="btn btn-sm btn-outline-danger" disabled={enviando} onClick={() => { void responder('NO_COMPRADO'); }}>No lo compré</button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" disabled={enviando} onClick={() => setOtra(true)}>Otra opción</button>
                </div>
            )}
        </div>
    );
}

function Conversacion({ id }: { id: number }) {
    const { usuario } = useAuth();
    const navegar = useNavigate();
    const { datos, error, recargar } = useAsync(() => mensajesService.detalle(id), [id]);
    const [errorAccion, setErrorAccion] = useState('');
    const [detalle, setDetalle] = useState<ConversacionDetalle | null>(null);
    const [mostrarOferta, setMostrarOferta] = useState(false);
    const [confirmarVenta, setConfirmarVenta] = useState(false);
    const [monto, setMonto] = useState('');

    useEffect(() => { setDetalle(datos); }, [datos]);
    useEffect(() => {
        const t = setInterval(() => { if (!document.hidden) mensajesService.detalle(id).then(setDetalle).catch(() => {}); }, 5000);
        return () => clearInterval(t);
    }, [id]);

    if (error) return <Alert mensaje={error} />;
    if (!detalle) return <Spinner />;
    const c = detalle.conversacion;
    const cerrada = c.publicacionEstado !== 'ACTIVA';

    async function accion(promesa: Promise<ConversacionDetalle>): Promise<boolean> {
        setErrorAccion('');
        try {
            setDetalle(await promesa);
            return true;
        } catch (e) {
            setErrorAccion(mensajeDeError(e, 'No se pudo completar la acción.'));
            recargar();
            throw e;
        }
    }

    async function enviarOferta(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        const valor = monto.trim().replace(/\./g, '').replace(',', '.');
        const invalido = validarMonto(valor, 'La oferta')
            ?? (Number(valor) > c.publicacionPrecio * 10 ? 'La oferta es demasiado alta respecto al precio publicado. Revisa el monto.' : null);
        if (invalido) { setErrorAccion(invalido); return; }
        try { await accion(mensajesService.enviarOferta(c.id, Number(valor))); setMostrarOferta(false); setMonto(''); } catch { /* ya se informó */ }
    }

    async function vender(): Promise<void> {
        setConfirmarVenta(false);
        try { await accion(mensajesService.marcarVendido(c.id)); } catch { /* ya se informó */ }
    }

    async function responderVenta(respuesta: RespuestaVenta, texto?: string): Promise<void> {
        setErrorAccion('');
        setDetalle(await mensajesService.responderVenta(c.id, respuesta, texto));
        if (respuesta === 'OTRO' && texto) {
            // Además de dejar la venta en revisión, se abre un ticket para que el equipo de soporte la atienda.
            const asunto = `Venta en revisión: ${c.publicacionTitulo}`.slice(0, 100);
            const mensaje = `Publicación #${c.publicacionId} «${c.publicacionTitulo}» (vendedor: ${c.interlocutorApodo}). Lo que informó la persona compradora: ${texto}`.slice(0, 1000);
            await soporteUsuarioService.crear(asunto, 'PUBLICACIONES', mensaje).catch(() => setErrorAccion('La venta quedó en revisión, pero no se pudo crear el ticket de soporte. Escríbenos desde Soporte.'));
        }
    }

    return (
        <div className="card h-100">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                    <button type="button" className="btn btn-sm btn-outline-secondary d-md-none me-2" onClick={() => navegar('/mensajes')}>← Volver</button>
                    <Link to={`/publicaciones/${c.publicacionId}`} className="fw-semibold">{c.publicacionTitulo}</Link>
                    <div className="small text-secondary">{c.interlocutorApodo} · {formatoPrecio(c.montoAcordado ?? c.publicacionPrecio)}{c.montoAcordado ? ' (acordado)' : ''}{cerrada ? ` · ${ETIQUETA_ESTADO[c.publicacionEstado] ?? 'No disponible'}` : ''}</div>
                </div>
                {!cerrada && (
                    <div className="d-flex gap-2">
                        {c.rol === 'COMPRADOR' && <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setMostrarOferta(m => !m)}>Hacer oferta</button>}
                        {c.rol === 'VENDEDOR' && <button type="button" className="btn btn-sm btn-success" onClick={() => setConfirmarVenta(true)}>Marcar como vendido</button>}
                    </div>
                )}
            </div>
            <ConfirmarModal abierto={confirmarVenta} titulo="Marcar como vendido"
                mensaje={`¿Marcar como vendido a ${c.interlocutorApodo} por ${formatoPrecio(c.montoAcordado ?? c.publicacionPrecio)}? Esta acción cierra la publicación y no se puede deshacer.`}
                textoConfirmar="Sí, marcar como vendido" onConfirmar={vender} onCancelar={() => setConfirmarVenta(false)} />
            <SeguimientoVenta c={c} onResponder={responderVenta} />
            {mostrarOferta && (
                <form onSubmit={enviarOferta} className="p-2 border-bottom d-flex gap-2" aria-label="Enviar oferta">
                    <input className="form-control form-control-sm" inputMode="decimal" placeholder="Monto (CLP)" aria-label="Monto de la oferta" value={monto} onChange={(e: ChangeEvent<HTMLInputElement>) => setMonto(e.target.value)} />
                    <button type="submit" className="btn btn-sm btn-primary">Enviar oferta</button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setMostrarOferta(false)}>Cancelar</button>
                </form>
            )}
            <div className="chat-contenedor">
                <ChatThread mensajes={normalizarMensajes(detalle.mensajes, usuario?.id ?? 0)} puedeEscribir={c.publicacionEstado !== 'ELIMINADA'}
                    puedeResponderOfertas={!cerrada} respuestasRapidas={RAPIDAS[c.rol]} error={errorAccion}
                    onEnviar={contenido => accion(mensajesService.enviarMensaje(c.id, contenido))}
                    onResponderOferta={(mid, aceptar) => accion(mensajesService.responderOferta(c.id, mid, aceptar)).catch(() => {})} />
            </div>
        </div>
    );
}

export default function MensajesPage() {
    const { id } = useParams();
    const { datos, cargando, error, recargar } = useAsync(() => mensajesService.listar(), [id]);
    useEffect(() => {
        const t = setInterval(() => { if (!document.hidden) recargar(); }, 10000);
        return () => clearInterval(t);
    }, [recargar]);
    const activaId = id ? Number(id) : null;
    return (
        <div className="container py-4">
            <h1 className="h2 mb-3">Mensajes</h1>
            <Alert mensaje={error} />
            <div className="row g-3">
                <div className={`col-12 col-md-4 ${activaId ? 'd-none d-md-block' : ''}`}>
                    {cargando && !datos ? <Spinner /> : <ListaConversaciones conversaciones={datos ?? []} activaId={activaId} />}
                </div>
                <div className={`col-12 col-md-8 ${activaId ? '' : 'd-none d-md-block'}`}>
                    {activaId ? <Conversacion id={activaId} key={activaId} /> : <div className="text-secondary text-center py-5">Selecciona una conversación.</div>}
                </div>
            </div>
        </div>
    );
}
