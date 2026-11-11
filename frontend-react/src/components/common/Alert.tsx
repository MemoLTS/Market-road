/** Mensaje de estado accesible. No renderiza nada si no hay mensaje. */
export interface PropsAlert {
    mensaje?: string | null;
    tipo?: string;
    onCerrar?: () => void;
    className?: string;
}

export default function Alert({ mensaje, tipo = 'danger', onCerrar, className = '' }: PropsAlert) {
    if (!mensaje) return null;
    return (
        <div className={`alert alert-${tipo} ${onCerrar ? 'alert-dismissible' : ''} ${className}`.trim()} role="alert">
            {mensaje}
            {onCerrar && <button type="button" className="btn-close" aria-label="Cerrar aviso" onClick={onCerrar} />}
        </div>
    );
}
