import { useState } from 'react';
import type { FormEvent } from 'react';
import { mensajeDeError } from '../../core/formato';
import { PRIMER_MENSAJE } from '../../core/mensajesPredeterminados';
import { validarMensaje } from '../../core/validaciones';
import Alert from '../common/Alert';
import Modal from '../common/Modal';
import CampoMensaje from './CampoMensaje';

export interface PropsPrimerMensajeModal {
    abierto: boolean;
    vendedor?: string;
    titulo: string;
    onCerrar: () => void;
    /** Envía el primer mensaje (crea la conversación). Si termina bien, la ventana se cierra sola. */
    onEnviar: (contenido: string) => Promise<void>;
}

/**
 * Ventana emergente para escribir el PRIMER mensaje al vendedor: autocompleta con mensajes predeterminados y
 * ofrece chips para elegir uno con un clic. Cuando el mensaje se envía, la ventana desaparece (y la publicación
 * deja de ofrecerla porque la conversación ya existe).
 */
export default function PrimerMensajeModal({ abierto, vendedor, titulo, onCerrar, onEnviar }: PropsPrimerMensajeModal) {
    const [texto, setTexto] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    async function enviar(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        const invalido = validarMensaje(texto.trim());
        if (invalido) { setError(invalido); return; }
        setError('');
        setEnviando(true);
        try {
            await onEnviar(texto.trim());
            setTexto('');
            onCerrar();
        } catch (err) {
            setError(mensajeDeError(err, 'No se pudo enviar el mensaje.'));
        } finally {
            setEnviando(false);
        }
    }

    return (
        <Modal abierto={abierto} titulo={titulo} onCerrar={onCerrar}>
            <form onSubmit={enviar} noValidate aria-label="Primer mensaje al vendedor">
                <p className="small text-secondary">Escribe tu primer mensaje{vendedor ? ` para ${vendedor}` : ''} o elige uno de los mensajes sugeridos.</p>
                <Alert mensaje={error} />
                <div className="d-flex flex-wrap gap-1 mb-2" role="group" aria-label="Mensajes predeterminados">
                    {PRIMER_MENSAJE.map(m => <button key={m} type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTexto(m)}>{m}</button>)}
                </div>
                <div className="d-flex mb-3">
                    <CampoMensaje id="primerMensaje" etiqueta="Primer mensaje" valor={texto} onCambiar={setTexto} sugerencias={PRIMER_MENSAJE} placeholder="Hola, ¿sigue disponible?" />
                </div>
                <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar mensaje'}</button>
                </div>
            </form>
        </Modal>
    );
}
