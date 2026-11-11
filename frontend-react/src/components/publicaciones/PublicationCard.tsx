import type { Publicacion } from '../../types/api';
import { formatoPrecio } from '../../core/formato';
import { Link } from '../../core/router';
import { urlAbsoluta } from '../../services/http';

/** Tarjeta de una publicación. Recibe los datos por props y no tiene estado propio. */
export default function PublicationCard({ publicacion }: { publicacion: Publicacion }) {
    const { id, titulo, precio, ubicacion, categoriaNombre, vendedorApodo, imagenUrls, estado, distanciaKm } = publicacion;
    const unidades = publicacion.unidades ?? 1;
    const imagen = imagenUrls?.[0] ? urlAbsoluta(imagenUrls[0]) : null;
    return (
        <article className="card h-100 shadow-sm publication-card" data-testid="publication-card">
            {imagen
                ? <img src={imagen} className="card-img-top publication-img" alt={`Foto de ${titulo}`} loading="lazy" />
                : <div className="card-img-top publication-img bg-secondary-subtle d-flex align-items-center justify-content-center text-secondary">Sin foto</div>}
            <div className="card-body d-flex flex-column">
                <span className="badge text-bg-light border align-self-start mb-2">{categoriaNombre}</span>
                <h3 className="card-title h6 mb-1">
                    <Link to={`/publicaciones/${id}`} className="stretched-link text-decoration-none">{titulo}</Link>
                </h3>
                <p className="fs-5 fw-bold text-primary mb-1">{formatoPrecio(precio)}</p>
                {unidades > 1 && <span className="badge text-bg-info align-self-start mb-1" data-testid="unidades">{unidades} unidades disponibles</span>}
                <p className="small text-secondary mb-0 mt-auto">
                    {ubicacion}
                    {distanciaKm != null && <> · a {Number(distanciaKm).toFixed(1)} km</>}
                </p>
                {vendedorApodo && <p className="small text-secondary mb-0">Vende {vendedorApodo}</p>}
                {estado === 'VENDIDA' && <span className="badge text-bg-secondary mt-2 align-self-start">Vendida</span>}
            </div>
        </article>
    );
}
