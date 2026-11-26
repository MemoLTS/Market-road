import type { ReactNode } from 'react';
import type { Publicacion } from '../../types/api';
import Alert from '../common/Alert';
import Spinner from '../common/Spinner';
import PublicationCard from './PublicationCard';

/**
 * Lista responsiva: 2 columnas en móvil, 3 en tablet y 4 en escritorio
 * (clases de grilla de Bootstrap). Maneja los estados cargando, error y vacío.
 */
export interface PropsPublicationList {
    publicaciones: Publicacion[];
    cargando?: boolean;
    error?: string;
    vacio?: string;
    /** Contenido opcional bajo cada tarjeta (por ejemplo un botón de acción). */
    accion?: (p: Publicacion) => ReactNode;
}

export default function PublicationList({ publicaciones, cargando = false, error = '', vacio = 'No se encontraron publicaciones con esos criterios.', accion }: PropsPublicationList) {
    if (cargando) return <Spinner texto="Cargando publicaciones..." />;
    if (error) return <Alert mensaje={error} />;
    if (!publicaciones.length) return <p className="text-center text-secondary py-5" data-testid="lista-vacia">{vacio}</p>;
    return (
        <div className="row g-3 g-lg-4" data-testid="publication-list">
            {publicaciones.map(p => (
                <div className="col-6 col-md-4 col-xl-3" key={p.id}>
                    <PublicationCard publicacion={p} />
                    {accion?.(p)}
                </div>
            ))}
        </div>
    );
}
