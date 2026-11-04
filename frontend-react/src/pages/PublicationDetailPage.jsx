import { useState } from 'react';
import Alert from '../components/common/Alert.jsx';
import Modal from '../components/common/Modal.jsx';
import Spinner from '../components/common/Spinner.jsx';
import PublicationForm from '../components/publicaciones/PublicationForm.jsx';
import { config } from '../config.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useUi } from '../context/UiContext.jsx';
import { formatoFechaCorta, formatoPrecio, mensajeDeError } from '../core/formato.js';
import { validarMensaje } from '../core/validaciones.js';
import { Link, useNavigate, useParams } from '../core/router.jsx';
import { useCategorias } from '../hooks/usePublicaciones.js';
import { useAsync } from '../hooks/useAsync.js';
import { urlAbsoluta } from '../services/http.js';
import { mensajesService } from '../services/mensajesService.js';
import { publicacionesService } from '../services/publicacionesService.js';

/** Recuerda la conversación existente con el vendedor o crea una nueva con el primer mensaje. */
export async function contactarVendedor(publicacionId, contenido) {
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
    const [mensaje, setMensaje] = useState('');
    const [errorContacto, setErrorContacto] = useState('');
    const [editando, setEditando] = useState(false);
    const [errorAccion, setErrorAccion] = useState('');

    if (cargando && !p) return <div className="container py-5"><Spinner /></div>;
    if (error) return (
        <div className="container py-5">
            <Alert mensaje={error} />
            <Link to="/">← Volver al catálogo</Link>
        </div>
    );

    const esDueno = usuario?.id === p.usuarioId;
    const imagenes = (p.imagenUrls ?? []).map(urlAbsoluta);

    async function contactar(e) {
        e.preventDefault();
        const invalido = validarMensaje(mensaje.trim());
        if (invalido) { setErrorContacto(invalido); return; }
        setErrorContacto('');
        try {
            const conversacionId = await contactarVendedor(p.id, mensaje.trim());
            navegar(`/mensajes/${conversacionId}`);
        } catch (err) {
            setErrorContacto(mensajeDeError(err, 'No se pudo enviar el mensaje.'));
        }
    }

    async function eliminar() {
        if (!window.confirm('¿Eliminar esta publicación? No se puede deshacer.')) return;
        try {
            await publicacionesService.eliminar(p.id);
            navegar('/');
        } catch (err) {
            setErrorAccion(mensajeDeError(err));
        }
    }

    async function guardar(datos) {
        await publicacionesService.actualizar(p.id, { titulo: datos.titulo.trim(), precio: datos.precio, descripcion: datos.descripcion.trim(), ubicacion: datos.ubicacion.trim(), categoria: datos.categoria });
        setEditando(false);
        recargar();
    }

    return (
        <div className="container py-4">
            <nav aria-label="Ruta de navegación" className="mb-3"><Link to="/">← Volver al catálogo</Link></nav>
            <div className="row g-4">
                <div className="col-12 col-lg-7">
                    {imagenes.length > 0
                        ? <img src={imagenes[foto]} alt={`Foto ${foto + 1} de ${p.titulo}`} className="img-fluid rounded w-100 detail-img" />
                        : <div className="rounded bg-secondary-subtle p-5 text-center text-secondary">Sin fotos</div>}
                    {imagenes.length > 1 && (
                        <div className="d-flex flex-wrap gap-2 mt-2" role="group" aria-label="Fotos de la publicación">
                            {imagenes.map((src, i) => (
                                <button type="button" key={src + i} className={`btn p-0 border ${i === foto ? 'border-primary border-2' : ''}`} onClick={() => setFoto(i)} aria-label={`Ver foto ${i + 1}`}>
                                    <img src={src} alt="" width="72" height="54" className="rounded" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="col-12 col-lg-5">
                    <span className="badge text-bg-light border mb-2">{p.categoriaNombre}</span>
                    {p.estado === 'VENDIDA' && <span className="badge text-bg-secondary ms-2 mb-2">Vendida</span>}
                    <h1 className="h3">{p.titulo}</h1>
                    <p className="display-6 fw-bold text-primary">{formatoPrecio(p.precio)}</p>
                    <p className="text-secondary">{p.descripcion}</p>
                    <dl className="row small">
                        <dt className="col-4">Ubicación</dt><dd className="col-8">{p.ubicacion}</dd>
                        <dt className="col-4">Entrega</dt><dd className="col-8">{(p.modalidadesEntrega ?? []).map(m => m.nombre).join(', ') || 'A convenir'}</dd>
                        <dt className="col-4">Vendedor</dt><dd className="col-8">{p.vendedorApodo ?? 'Anónimo'}</dd>
                        <dt className="col-4">Publicada</dt><dd className="col-8">{formatoFechaCorta(p.fechaCreacion)}</dd>
                    </dl>

                    <Alert mensaje={errorAccion} />
                    {esDueno ? (
                        <div className="d-flex gap-2">
                            {config.usarMock && <button type="button" className="btn btn-outline-primary" onClick={() => setEditando(true)}>Editar</button>}
                            <button type="button" className="btn btn-outline-danger" onClick={eliminar}>Eliminar publicación</button>
                        </div>
                    ) : p.estado === 'ACTIVA' ? (
                        <form onSubmit={contactar} className="card card-body" aria-label="Contactar al vendedor" noValidate>
                            <h2 className="h6">Contactar al vendedor</h2>
                            {config.usarMock && <p className="small text-secondary">La mensajería requiere el backend real (modo demostración activo).</p>}
                            <Alert mensaje={errorContacto} />
                            <textarea className="form-control mb-2" rows={3} aria-label="Mensaje para el vendedor" placeholder="Hola, ¿sigue disponible?"
                                value={mensaje} onChange={e => setMensaje(e.target.value)} />
                            {autenticado
                                ? <button type="submit" className="btn btn-primary" disabled={config.usarMock}>Enviar mensaje</button>
                                : <button type="button" className="btn btn-primary" onClick={abrirLogin}>Inicia sesión para contactar</button>}
                        </form>
                    ) : <Alert tipo="secondary" mensaje="Esta publicación ya no está disponible." />}
                </div>
            </div>
            <Modal abierto={editando} titulo="Editar publicación" onCerrar={() => setEditando(false)} tamano="modal-lg">
                <PublicationForm modo="editar" inicial={p} categorias={categorias} onEnviar={guardar} onCancelar={() => setEditando(false)} />
            </Modal>
        </div>
    );
}
