/** Campo de formulario: etiqueta + control + mensaje de error. El control se pasa como `children`. */
export default function Campo({ id, etiqueta, error, ayuda, children, className = 'mb-3' }) {
    return (
        <div className={className}>
            {etiqueta && <label htmlFor={id} className="form-label">{etiqueta}</label>}
            {children}
            {error && <div className="invalid-feedback d-block" id={`${id}-error`}>{error}</div>}
            {!error && ayuda && <div className="form-text">{ayuda}</div>}
        </div>
    );
}
