export default function Spinner({ texto = 'Cargando...' }) {
    return (
        <div className="d-flex justify-content-center align-items-center gap-2 py-4 text-secondary" role="status">
            <div className="spinner-border spinner-border-sm" aria-hidden="true" />
            <span>{texto}</span>
        </div>
    );
}
