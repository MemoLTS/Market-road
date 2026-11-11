import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { formatoFechaCorta, formatoPrecio } from '../../core/formato';
import { LIMITES, validarMensaje } from '../../core/validaciones';
import type { EstadoOferta, TipoMensaje } from '../../types/api';
import Alert from '../common/Alert';

export interface MensajeChat {
    id: number;
    mio: boolean;
    tipo: TipoMensaje;
    contenido?: string;
    fecha: string;
    monto?: number | null;
    estadoOferta?: EstadoOferta | null;
    leido?: boolean | null;
    autor?: string;
}

type ResponderOferta = (mensajeId: number, aceptar: boolean) => void;

const ETIQUETA_OFERTA: Record<string, string> = { PENDIENTE: 'Pendiente', ACEPTADA: 'Aceptada', RECHAZADA: 'Rechazada', REEMPLAZADA: 'Reemplazada' };

/** Una burbuja del chat. `mensaje` ya viene normalizado: {id, mio, tipo, contenido, fecha, monto, estadoOferta, leido}. */
export function MessageBubble({ mensaje, puedeResponder = false, onResponderOferta }: { mensaje: MensajeChat; puedeResponder?: boolean; onResponderOferta?: ResponderOferta }) {
    if (mensaje.tipo === 'SISTEMA') return <div className="chat-sistema text-center small text-secondary my-2">{mensaje.contenido}</div>;
    const esOferta = mensaje.tipo === 'OFERTA';
    return (
        <div className={`chat-burbuja ${mensaje.mio ? 'mia' : 'otra'}`} data-testid="burbuja">
            {mensaje.autor && !mensaje.mio && <strong className="d-block small">{mensaje.autor}</strong>}
            {esOferta ? (
                <div className="chat-oferta">
                    Oferta de <strong>{formatoPrecio(mensaje.monto ?? 0)}</strong>
                    <span className="badge text-bg-secondary ms-1">{(mensaje.estadoOferta && ETIQUETA_OFERTA[mensaje.estadoOferta]) ?? ''}</span>
                    {puedeResponder && mensaje.estadoOferta === 'PENDIENTE' && (
                        <div className="d-flex gap-2 mt-2">
                            <button type="button" className="btn btn-sm btn-success" onClick={() => onResponderOferta?.(mensaje.id, true)}>Aceptar</button>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onResponderOferta?.(mensaje.id, false)}>Rechazar</button>
                        </div>
                    )}
                </div>
            ) : mensaje.contenido}
            <small className="d-block chat-hora">{formatoFechaCorta(mensaje.fecha)} {mensaje.mio && mensaje.leido != null && (mensaje.leido ? '✓✓' : '✓')}</small>
        </div>
    );
}

/**
 * Hilo de mensajes + caja de texto. Lo reutilizan Mensajes (comprador/vendedor) y Soporte (tickets).
 * Enter envía; Shift+Enter agrega un salto de línea.
 */
export interface PropsChatThread {
    mensajes: MensajeChat[];
    onEnviar: (contenido: string) => void | Promise<unknown>;
    puedeEscribir?: boolean;
    puedeResponderOfertas?: boolean;
    onResponderOferta?: ResponderOferta;
    respuestasRapidas?: string[];
    error?: string;
}

export default function ChatThread({ mensajes, onEnviar, puedeEscribir = true, puedeResponderOfertas = false, onResponderOferta, respuestasRapidas = [], error = '' }: PropsChatThread) {
    const [texto, setTexto] = useState('');
    const [errorLocal, setErrorLocal] = useState('');
    const [enviando, setEnviando] = useState(false);
    const fin = useRef<HTMLDivElement>(null);

    useEffect(() => { fin.current?.scrollIntoView?.({ block: 'end' }); }, [mensajes.length]);

    async function enviar(e?: FormEvent<HTMLFormElement>): Promise<void> {
        e?.preventDefault();
        const contenido = texto.trim();
        const invalido = validarMensaje(contenido);
        if (invalido) { setErrorLocal(invalido); return; }
        setErrorLocal('');
        setEnviando(true);
        try {
            await onEnviar(contenido);
            setTexto('');
        } catch {
            /* el padre muestra el error de la API */
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className="chat d-flex flex-column h-100">
            <div className="chat-mensajes flex-grow-1 overflow-auto p-3" role="log" aria-live="polite">
                {mensajes.map(m => (
                    <MessageBubble key={m.id} mensaje={m} puedeResponder={puedeResponderOfertas && !m.mio} onResponderOferta={onResponderOferta} />
                ))}
                <div ref={fin} />
            </div>
            <Alert mensaje={error || errorLocal} className="mx-3 mb-2" />
            {puedeEscribir && (
                <form onSubmit={enviar} className="border-top p-2" aria-label="Enviar mensaje">
                    {respuestasRapidas.length > 0 && (
                        <div className="d-flex flex-wrap gap-1 mb-2">
                            {respuestasRapidas.map(r => <button key={r} type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTexto(r)}>{r}</button>)}
                        </div>
                    )}
                    <div className="input-group">
                        <textarea className="form-control" rows={1} maxLength={LIMITES.mensaje.max} placeholder="Escribe un mensaje" aria-label="Mensaje"
                            value={texto} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTexto(e.target.value)}
                            onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) { e.preventDefault(); enviar(); } }} />
                        <button type="submit" className="btn btn-primary" disabled={enviando}>Enviar</button>
                    </div>
                    <div className="form-text text-end">{texto.length}/{LIMITES.mensaje.max}</div>
                </form>
            )}
        </div>
    );
}
