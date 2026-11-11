import { useState } from 'react';
import Pagination from '../components/common/Pagination';
import PublicationList from '../components/publicaciones/PublicationList';
import { Link, useParams } from '../core/router';
import { useCategorias, usePublicaciones } from '../hooks/usePublicaciones';

/** Índice de categorías: una tarjeta por categoría que lleva a su listado. */
export function CategoriasPage() {
    const categorias = useCategorias();
    return (
        <div className="container py-4">
            <h1 className="h2 mb-4">Categorías</h1>
            <div className="row g-3">
                {categorias.map(c => (
                    <div className="col-6 col-md-4 col-lg-3" key={c.codigo}>
                        <Link to={`/categorias/${c.codigo}`} className="card h-100 text-center text-decoration-none shadow-sm">
                            <div className="card-body d-flex align-items-center justify-content-center"><span className="fw-semibold">{c.nombre}</span></div>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Publicaciones de una categoría (ruta /categorias/:codigo). */
export function CategoriaPage() {
    const { codigo } = useParams();
    const categorias = useCategorias();
    const [pagina, setPagina] = useState(0);
    const { publicaciones, totalPaginas, cargando, error } = usePublicaciones({ categorias: [codigo], pagina, tamano: 12 });
    const nombre = categorias.find(c => c.codigo === codigo)?.nombre ?? codigo;
    return (
        <div className="container py-4">
            <nav aria-label="Ruta de navegación" className="mb-2"><Link to="/categorias">← Todas las categorías</Link></nav>
            <h1 className="h2 mb-4">{nombre}</h1>
            <PublicationList publicaciones={publicaciones} cargando={cargando} error={error} vacio="Todavía no hay publicaciones en esta categoría." />
            <div className="mt-4"><Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} /></div>
        </div>
    );
}
