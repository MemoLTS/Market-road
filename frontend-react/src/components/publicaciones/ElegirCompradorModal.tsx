import { useEffect, useState } from 'react';
import Alert from '../common/Alert';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import { formatoPrecio, mensajeDeError } from '../../core/formato';
import { mensajesService } from '../../services/mensajesService';
import type { ConversacionResumen } from '../../types/api';

export interface PropsElegirComprador {
    abierto: boolean;
    publicacionId: number;
    precio: number;
    onCerrar: () => void;
    /** Se llama con el id de la conversación con la persona elegida cuando la venta quedó marcada. */
    onVendida: (conversacionId: number) => void;
}

/**
 * Marcar como vendido exige elegir quién compró entre las personas que escribieron por la publicación.
 * Esa persona deberá confirmar la compra (o indicar otra cosa) desde su conversación.
 */
export default function ElegirCompradorModal({ abierto, publicacionId, precio, onCerrar, onVendida }: PropsElegirComprador) {
    const [candidatos, setCandidatos] = useState<ConversacionResumen[] | null>(null);
    const [elegido, setElegido] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (!abierto) return;
        setCandidatos(null); setElegido(null); setError('');
        mensajesService.deLaPublicacion(publicacionId)
            .then(lista => setCandidatos(lista.filter(c => c.rol === 'VENDEDOR')))
            .catch(e => { setCandidatos([]); setError(mensajeDeError(e, 'No se pudieron cargar las personas interesadas.')); });
    }, [abierto, publicacionId]);

    async function confirmar(): Promise<void> {
        if (elegido === null) { setError('Elige a la persona que compró.'); return; }
        setEnviando(true); setError('');
        try {
            await mensajesService.marcarVendido(elegido);
            onVendida(elegido);
        } catch (e) {
            setError(mensajeDeError(e, 'No se pudo marcar como vendido.'));
        } finally {
            setEnviando(false);
        }
    }

    return (
        <Modal abierto={abierto} titulo="Marcar como vendido" onCerrar={enviando ? () => undefined : onCerrar}>
            <p>¿Quién compró este artículo? La persona que elijas deberá confirmar la compra desde sus mensajes.</p>
            <Alert mensaje={error} />
            {candidatos === null ? <Spinner /> : !candidatos.length ? (
                <p className="text-secondary">Aún nadie te escribió por esta publicación, así que no hay a quién marcar como comprador.</p>
            ) : (
                <fieldset className="mb-3">
                    <legend className="visually-hidden">Persona que compró</legend>
                    {candidatos.map(c => (
                        <div className="form-check" key={c.id}>
                            <input className="form-check-input" type="radio" name="comprador" id={`comprador-${c.id}`} checked={elegido === c.id} onChange={() => setElegido(c.id)} />
                            <label className="form-check-label" htmlFor={`comprador-${c.id}`}>
                                {c.interlocutorApodo} · {formatoPrecio(c.montoAcordado ?? precio)}{c.montoAcordado ? ' (acordado)' : ''}
                            </label>
                        </div>
                    ))}
                </fieldset>
            )}
            <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={onCerrar} disabled={enviando}>Cancelar</button>
                <button type="button" className="btn btn-success" onClick={() => { void confirmar(); }} disabled={enviando || !candidatos?.length}>Marcar como vendido</button>
            </div>
        </Modal>
    );
}
