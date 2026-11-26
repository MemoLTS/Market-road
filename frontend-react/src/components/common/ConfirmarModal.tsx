import { useState } from 'react';
import type { ReactNode } from 'react';
import Modal from './Modal';

export interface PropsConfirmarModal {
    abierto: boolean;
    titulo: string;
    /** Texto o contenido que explica qué pasará al confirmar. */
    mensaje: ReactNode;
    textoConfirmar?: string;
    /** Pinta el botón de confirmar en rojo (acciones que no se pueden deshacer). */
    peligro?: boolean;
    onConfirmar: () => void | Promise<void>;
    onCancelar: () => void;
}

/**
 * Confirmación dentro de la página. Reemplaza a window.confirm, que bloquea todo el navegador
 * (la página queda "pausada" hasta que se responde el cuadro nativo).
 */
export default function ConfirmarModal({ abierto, titulo, mensaje, textoConfirmar = 'Confirmar', peligro = false, onConfirmar, onCancelar }: PropsConfirmarModal) {
    const [procesando, setProcesando] = useState(false);
    async function confirmar(): Promise<void> {
        setProcesando(true);
        try { await onConfirmar(); } finally { setProcesando(false); }
    }
    return (
        <Modal abierto={abierto} titulo={titulo} onCerrar={procesando ? () => undefined : onCancelar}>
            <div className="mb-3">{mensaje}</div>
            <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={onCancelar} disabled={procesando}>Cancelar</button>
                <button type="button" className={`btn ${peligro ? 'btn-danger' : 'btn-primary'}`} onClick={confirmar} disabled={procesando}>{textoConfirmar}</button>
            </div>
        </Modal>
    );
}
