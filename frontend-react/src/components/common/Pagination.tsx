/** Paginación de Bootstrap. `pagina` es base 0 (igual que la API). */
export interface PropsPagination {
    pagina: number;
    totalPaginas: number;
    onCambiar: (pagina: number) => void;
}

export default function Pagination({ pagina, totalPaginas, onCambiar }: PropsPagination) {
    if (totalPaginas <= 1) return null;
    const inicio = Math.max(0, Math.min(pagina - 2, totalPaginas - 5));
    const fin = Math.min(totalPaginas, inicio + 5);
    const numeros = Array.from({ length: fin - inicio }, (_, i) => inicio + i);
    return (
        <nav aria-label="Paginación del catálogo">
            <ul className="pagination justify-content-center flex-wrap mb-0">
                <li className={`page-item ${pagina === 0 ? 'disabled' : ''}`}>
                    <button type="button" className="page-link" disabled={pagina === 0} onClick={() => onCambiar(pagina - 1)}>Anterior</button>
                </li>
                {numeros.map(n => (
                    <li key={n} className={`page-item ${n === pagina ? 'active' : ''}`}>
                        <button type="button" className="page-link" aria-current={n === pagina ? 'page' : undefined} onClick={() => onCambiar(n)}>{n + 1}</button>
                    </li>
                ))}
                <li className={`page-item ${pagina >= totalPaginas - 1 ? 'disabled' : ''}`}>
                    <button type="button" className="page-link" disabled={pagina >= totalPaginas - 1} onClick={() => onCambiar(pagina + 1)}>Siguiente</button>
                </li>
            </ul>
        </nav>
    );
}
