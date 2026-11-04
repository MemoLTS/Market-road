import { useEffect } from 'react';

/** Modal con las clases de Bootstrap, controlado por la prop `abierto` (sin depender del JS de Bootstrap). */
export default function Modal({ abierto, titulo, onCerrar, children, tamano = '' }) {
    useEffect(() => {
        if (!abierto) return undefined;
        const alTeclear = e => { if (e.key === 'Escape') onCerrar(); };
        document.addEventListener('keydown', alTeclear);
        document.body.classList.add('modal-open');
        return () => {
            document.removeEventListener('keydown', alTeclear);
            document.body.classList.remove('modal-open');
        };
    }, [abierto, onCerrar]);

    if (!abierto) return null;
    return (
        <>
            <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo}
                onMouseDown={e => { if (e.target === e.currentTarget) onCerrar(); }}>
                <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${tamano}`.trim()}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2 className="modal-title fs-5">{titulo}</h2>
                            <button type="button" className="btn-close" aria-label="Cerrar" onClick={onCerrar} />
                        </div>
                        <div className="modal-body">{children}</div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show" />
        </>
    );
}
