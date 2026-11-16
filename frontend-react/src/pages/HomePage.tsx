import { useState } from 'react';
import Alert from '../components/common/Alert';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import FiltersForm from '../components/publicaciones/FiltersForm';
import type { ValoresFiltros } from '../components/publicaciones/FiltersForm';
import PublicationForm from '../components/publicaciones/PublicationForm';
import PublicationList from '../components/publicaciones/PublicationList';
import { config } from '../config';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { useCategorias, usePublicaciones } from '../hooks/usePublicaciones';
import { publicacionesService } from '../services/publicacionesService';
import type { DatosPublicacion } from '../types/app';

export const FILTROS_INICIALES: ValoresFiltros = { q: '', categorias: [], precioMin: '', precioMax: '', ubicacion: null, radioKm: '', orden: 'RELEVANCIA' };
const TAMANO = 12;

export default function HomePage() {
    const { autenticado } = useAuth();
    const { abrirLogin } = useUi();
    const categorias = useCategorias();
    const [filtros, setFiltros] = useState<ValoresFiltros>(FILTROS_INICIALES);
    const [versionFiltros, setVersionFiltros] = useState(0);
    const [pagina, setPagina] = useState(0);
    const [publicando, setPublicando] = useState(false);
    const [busquedaAbierta, setBusquedaAbierta] = useState(false);
    const [aviso, setAviso] = useState('');
    const { publicaciones, total, totalPaginas, cargando, error, recargar } = usePublicaciones({ ...filtros, pagina, tamano: TAMANO });

    const hayFiltros = JSON.stringify(filtros) !== JSON.stringify(FILTROS_INICIALES);

    async function crear(datos: DatosPublicacion): Promise<void> {
        await publicacionesService.crear(datos);
        setPublicando(false);
        setAviso('Publicación creada correctamente.');
        setPagina(0);
        recargar();
    }

    return (
        <div className="container py-4">
            <section className="hero mb-4 mb-lg-5">
                <h1 className="mb-2">Compra y vende cerca de ti</h1>
                <p className="lead text-secondary mb-4">Market-Road conecta a quien vende con quien compra. Tú coordinas el pago y la entrega.</p>
                <div className="d-grid d-sm-flex gap-2">
                    <button type="button" className="btn btn-primary btn-lg btn-icono" onClick={() => (autenticado ? setPublicando(true) : abrirLogin())}>
                        <i className="bi bi-plus-lg" aria-hidden="true" />Publicar artículo
                    </button>
                    <button type="button" className="btn btn-outline-primary btn-lg btn-icono bg-body" onClick={() => setBusquedaAbierta(true)}>
                        <i className="bi bi-search" aria-hidden="true" />¿Qué buscas? · Búsqueda avanzada
                    </button>
                </div>
            </section>

            <Alert mensaje={aviso} tipo="success" onCerrar={() => setAviso('')} />
            <Modal abierto={busquedaAbierta} titulo="¿Qué buscas? · Búsqueda avanzada" onCerrar={() => setBusquedaAbierta(false)} tamano="modal-lg">
                <FiltersForm key={versionFiltros} categorias={categorias} valores={filtros}
                    onAplicar={f => { setFiltros(f); setPagina(0); setBusquedaAbierta(false); }}
                    onLimpiar={() => { setFiltros(FILTROS_INICIALES); setPagina(0); setVersionFiltros(v => v + 1); }} />
            </Modal>

            <p className="text-secondary fw-semibold mb-3" aria-live="polite" data-testid="resumen">
                {cargando ? 'Buscando...' : `${total} resultado${total === 1 ? '' : 's'}`}
            </p>
            <PublicationList publicaciones={publicaciones} cargando={cargando} error={error}
                vacio={hayFiltros ? 'No se encontraron publicaciones con esos criterios.' : 'Aún no hay publicaciones. ¡Sé la primera persona en publicar!'} />
            <div className="mt-4"><Pagination pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} /></div>

            <Modal abierto={publicando} titulo="Nueva publicación" onCerrar={() => setPublicando(false)} tamano="modal-lg">
                <PublicationForm categorias={categorias} exigirLugar={!config.usarMock} onEnviar={crear} onCancelar={() => setPublicando(false)} />
            </Modal>
        </div>
    );
}
