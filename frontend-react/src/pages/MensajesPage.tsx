import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Alert from '../components/common/Alert';
import Spinner from '../components/common/Spinner';
import ChatThread from '../components/chat/ChatThread';
import type { MensajeChat } from '../components/chat/ChatThread';
import { useAuth } from '../context/AuthContext';
import { formatoPrecio, mensajeDeError } from '../core/formato';
import { validarMonto } from '../core/validaciones';
import { Link, useNavigate, useParams } from '../core/router';
import { useAsync } from '../hooks/useAsync';
import { urlAbsoluta } from '../services/http';
import { mensajesService } from '../services/mensajesService';
import type { ConversacionDetalle, ConversacionResumen, Mensaje, Rol } from '../types/api';

const RAPIDAS: Record<Rol, string[]> = {
    COMPRADOR: ['¿Sigue disponible?', '¿Aceptas una oferta?', '¿Dónde podríamos juntarnos?', 'Gracias'],
    VENDEDOR: ['Sí, sigue disponible', 'Podemos coordinar la entrega por aquí', '¿Cuándo podrías pasar?', 'Gracias'],
};

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

function Conversacion({ id }: { id: number }) {
    const { usuario } = useAuth();
    const navegar = useNavigate();
    const { datos, error, recargar } = useAsync(() => mensajesService.detalle(id), [id]);
    const [errorAccion, setErrorAccion] = useState('');
    const [detalle, setDetalle] = useState<ConversacionDetalle | null>(null);
    const [mostrarOferta, setMostrarOferta] = useState(false);
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
        const precio = formatoPrecio(c.montoAcordado ?? c.publicacionPrecio);
        if (!window.confirm(`¿Marcar como vendido a ${c.interlocutorApodo} por ${precio}? Esta acción cierra la publicación y no se puede deshacer.`)) return;
        try { await accion(mensajesService.marcarVendido(c.id)); } catch { /* ya se informó */ }
    }

    return (
        <div className="card h-100">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                    <button type="button" className="btn btn-sm btn-outline-secondary d-md-none me-2" onClick={() => navegar('/mensajes')}>← Volver</button>
                    <Link to={`/publicaciones/${c.publicacionId}`} className="fw-semibold">{c.publicacionTitulo}</Link>
                    <div className="small text-secondary">{c.interlocutorApodo} · {formatoPrecio(c.montoAcordado ?? c.publicacionPrecio)}{c.montoAcordado ? ' (acordado)' : ''}{cerrada ? ` · ${c.publicacionEstado === 'VENDIDA' ? 'Vendida' : 'Eliminada'}` : ''}</div>
                </div>
                {!cerrada && (
                    <div className="d-flex gap-2">
                        {c.rol === 'COMPRADOR' && <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setMostrarOferta(m => !m)}>Hacer oferta</button>}
                        {c.rol === 'VENDEDOR' && <button type="button" className="btn btn-sm btn-success" onClick={vender}>Marcar como vendido</button>}
                    </div>
                )}
            </div>
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
