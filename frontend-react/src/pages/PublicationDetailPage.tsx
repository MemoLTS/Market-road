import { useState } from 'react';
import PrimerMensajeModal from '../components/chat/PrimerMensajeModal';
import Alert from '../components/common/Alert';
import ConfirmarModal from '../components/common/ConfirmarModal';
import Modal from '../components/common/Modal';
import Spinner from '../components/common/Spinner';
import PublicationForm from '../components/publicaciones/PublicationForm';
import { config } from '../config';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { formatoFechaCorta, formatoPrecio, mensajeDeError } from '../core/formato';
import { unidadesDe } from '../core/validaciones';
import { Link, useNavigate, useParams } from '../core/router';
import { useCategorias } from '../hooks/usePublicaciones';
import { useAsync } from '../hooks/useAsync';
import { urlAbsoluta } from '../services/http';
import { mensajesService } from '../services/mensajesService';
import { publicacionesService } from '../services/publicacionesService';
import type { Publicacion } from '../types/api';
import type { DatosPublicacion } from '../types/app';

/** Recuerda la conversación existente con el vendedor o crea una nueva con el primer mensaje. */
export async function contactarVendedor(publicacionId: number, contenido: string): Promise<number> {
    const existentes = await mensajesService.deLaPublicacion(publicacionId);
    if (existentes.length) return existentes[0].id;
    const detalle = await mensajesService.iniciar(publicacionId, contenido);
    return detalle.conversacion.id;
}

export default function PublicationDetailPage() {
    const { id } = useParams();
    const { usuario, autenticado } = useAuth();
    const { abrirLogin } = useUi();
    const navegar = useNavigate();
    const categorias = useCategorias();
    const { datos: p, cargando, error, recargar } = useAsync(() => publicacionesService.obtener(id), [id]);
    const [foto, setFoto] = useState(0);
    const [escribiendo, setEscribiendo] = useState(false);
    // Conversación ya iniciada con el vendedor: si existe, la ventana del primer mensaje deja de ofrecerse.
    const { datos: conversaciones, recargar: recargarConversaciones } = useAsync(
        () => (autenticado && !config.usarMock ? mensajesService.deLaPublicacion(Number(id)) : Promise.resolve([])), [id, autenticado]);
    const [editando, setEditando] = useState(false);
    const [confirmarEliminar, setConfirmarEliminar] = useState(false);
    const [errorAccion, setErrorAccion] = useState('');

    if (cargando && !p) return <div className="container py-5"><Spinner /></div>;
    if (error || !p) return (
        <div className="container py-5">
            <Alert mensaje={error} />
            <Link to="/">← Volver al catálogo</Link>
        </div>
    );

    const publicacion: Publicacion = p; // `p` ya no es null aquí; las funciones de abajo usan esta constante
    const esDueno = usuario?.id === p.usuarioId;
    const imagenes = (p.imagenUrls ?? []).map(urlAbsoluta);

    const conversacionExistente = conversaciones?.[0] ?? null;

    /** Primer mensaje: crea la conversación, cierra la ventana (lo hace el modal) y lleva al chat. */
    async function enviarPrimerMensaje(contenido: string): Promise<void> {
        const conversacionId = await contactarVendedor(publicacion.id, contenido);
        void recargarConversaciones();
        navegar(`/mensajes/${conversacionId}`);
    }

    async function eliminar(): Promise<void> {
        setConfirmarEliminar(false);
        try {
            await publicacionesService.eliminar(publicacion.id);
            navegar('/');
        } catch (err) {
            setErrorAccion(mensajeDeError(err));
        }
    }

    async function guardar(datos: DatosPublicacion): Promise<void> {
        await publicacionesService.actualizar(publicacion.id, { titulo: datos.titulo.trim(), precio: datos.precio, descripcion: datos.descripcion.trim(), ubicacion: datos.ubicacion.trim(), categoria: datos.categoria, unidades: unidadesDe(datos.unidades),
            ...(datos.latitud !== null && datos.longitud !== null ? { latitud: datos.latitud, longitud: datos.longitud } : {}) });
        setEditando(false);
        recargar();
    }

    return (
        <div className="container py-4">
            <nav aria-label="Ruta de navegación" className="mb-3"><Link to="/">← Volver al catálogo</Link></nav>
            <div className="row g-4">
                <div className="col-12 col-lg-7">
                    <div className="card border-0 shadow-sm overflow-hidden p-2 p-md-3">
                    {imagenes.length > 0
                        ? <img src={imagenes[foto]} alt={`Foto ${foto + 1} de ${p.titulo}`} className="img-fluid rounded-3 w-100 detail-img" />
                        : <div className="rounded bg-secondary-subtle p-5 text-center text-secondary">Sin fotos</div>}
                    {imagenes.length > 1 && (
                        <div className="d-flex flex-wrap gap-2 mt-2" role="group" aria-label="Fotos de la publicación">
                            {imagenes.map((src, i) => (
                                <button type="button" key={src + i} className={`btn p-0 border detail-miniatura ${i === foto ? 'border-primary border-2' : ''}`} onClick={() => setFoto(i)} aria-label={`Ver foto ${i + 1}`}>
                                    <img src={src} alt="" width="72" height="54" className="rounded" />
                                </button>
                            ))}
                        </div>
                    )}
                    </div>
                </div>
                <div className="col-12 col-lg-5">
                    <div className="card border-0 shadow-sm"><div className="card-body p-3 p-md-4">
                    <span className="badge rounded-pill text-bg-light border mb-2">{p.categoriaNombre}</span>
                    {p.estado === 'VENDIDA' && <span className="badge text-bg-secondary ms-2 mb-2">Vendida</span>}
                    {p.estado === 'DESHABILITADA' && <span className="badge text-bg-warning ms-2 mb-2">Deshabilitada por la administración</span>}
                    <h1 className="h3 mb-2">{p.titulo}</h1>
                    <p className="display-6 fw-bold text-primary mb-2">{formatoPrecio(p.precio)}</p>
                    {(p.unidades ?? 1) > 1 && <p><span className="badge text-bg-info fs-6" data-testid="unidades">{p.unidades} unidades disponibles</span></p>}
                    <p className="text-secondary">{p.descripcion}</p>
                    <dl className="row small border-top pt-3 mb-3 gy-1">
                        <dt className="col-4">Ubicación</dt><dd className="col-8">{p.ubicacion}</dd>
                        <dt className="col-4">Entrega</dt><dd className="col-8">{(p.modalidadesEntrega ?? []).map(m => m.nombre).join(', ') || 'A convenir'}</dd>
                        <dt className="col-4">Unidades</dt><dd className="col-8">{p.unidades ?? 1}</dd>
                        <dt className="col-4">Vendedor</dt><dd className="col-8">{p.vendedorApodo ?? 'Anónimo'}</dd>
                        <dt className="col-4">Publicada</dt><dd className="col-8">{formatoFechaCorta(p.fechaCreacion)}</dd>
                    </dl>

                    <Alert mensaje={errorAccion} />
                    <ConfirmarModal abierto={confirmarEliminar} titulo="Eliminar publicación" mensaje="¿Eliminar esta publicación? No se puede deshacer."
                        textoConfirmar="Sí, eliminar" peligro onConfirmar={eliminar} onCancelar={() => setConfirmarEliminar(false)} />
                    {esDueno ? (
                        <div className="d-grid d-sm-flex gap-2">
                            {p.estado === 'ACTIVA' && <button type="button" className="btn btn-outline-primary btn-icono" onClick={() => setEditando(true)}>Editar</button>}
                            {p.estado !== 'VENDIDA' && <button type="button" className="btn btn-outline-danger btn-icono" onClick={() => setConfirmarEliminar(true)}>Eliminar publicación</button>}
                        </div>
                    ) : p.estado === 'ACTIVA' ? (
                        <div className="rounded-3 bg-body-tertiary p-3" aria-label="Contactar al vendedor">
                            <h2 className="h6">Contactar al vendedor</h2>
                            {config.usarMock && <p className="small text-secondary">La mensajería requiere el backend real (modo demostración activo).</p>}
                            {!autenticado
                                ? <button type="button" className="btn btn-primary w-100" onClick={abrirLogin}>Inicia sesión para contactar</button>
                                : conversacionExistente
                                    ? <Link to={`/mensajes/${conversacionExistente.id}`} className="btn btn-outline-primary w-100">Ya hablaste con el vendedor: ver conversación</Link>
                                    : <button type="button" className="btn btn-primary w-100" disabled={config.usarMock} onClick={() => setEscribiendo(true)}>Enviar mensaje</button>}
                        </div>
                    ) : <Alert tipo="secondary" mensaje="Esta publicación ya no está disponible." />}
                    </div></div>
                </div>
            </div>
            <PrimerMensajeModal abierto={escribiendo && !conversacionExistente} titulo="Primer mensaje al vendedor" vendedor={p.vendedorApodo ?? undefined}
                onCerrar={() => setEscribiendo(false)} onEnviar={enviarPrimerMensaje} />
            <Modal abierto={editando} titulo="Editar publicación" onCerrar={() => setEditando(false)} tamano="modal-lg">
                <PublicationForm modo="editar" inicial={p} categorias={categorias} onEnviar={guardar} onCancelar={() => setEditando(false)} />
            </Modal>
        </div>
    );
}
