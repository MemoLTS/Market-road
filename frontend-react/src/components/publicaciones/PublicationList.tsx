import type { Publicacion } from '../../types/api';
import Alert from '../common/Alert';
import Spinner from '../common/Spinner';
import PublicationCard from './PublicationCard';

/**
 * Lista responsiva: 1 columna en móvil, 2 en tablet pequeña, 3 en escritorio y 4 en pantallas grandes
 * (clases de grilla de Bootstrap). Maneja los estados cargando, error y vacío.
 */
export interface PropsPublicationList {
    publicaciones: Publicacion[];
    cargando?: boolean;
    error?: string;
    vacio?: string;
}

export default function PublicationList({ publicaciones, cargando = false, error = '', vacio = 'No se encontraron publicaciones con esos criterios.' }: PropsPublicationList) {
    if (cargando) return <Spinner texto="Cargando publicaciones..." />;
    if (error) return <Alert mensaje={error} />;
    if (!publicaciones.length) return <p className="text-center text-secondary py-5" data-testid="lista-vacia">{vacio}</p>;
    return (
        <div className="row g-3" data-testid="publication-list">
            {publicaciones.map(p => (
                <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={p.id}>
                    <PublicationCard publicacion={p} />
                </div>
            ))}
        </div>
    );
}
