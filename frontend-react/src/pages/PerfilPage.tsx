import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Alert from '../components/common/Alert';
import Campo from '../components/common/Campo';
import SelectorLocalidad from '../components/common/SelectorLocalidad';
import type { ValorLocalidad } from '../components/common/SelectorLocalidad';
import PublicationList from '../components/publicaciones/PublicationList';
import { config } from '../config';
import { useAuth } from '../context/AuthContext';
import { formatoFechaCorta, mensajeDeError } from '../core/formato';
import { validarLocalidad } from '../core/localidad';
import { calcularRecorte, ZOOM_MIN, ZOOM_MAX } from '../core/recorte';
import { primerError, TIPOS_FOTO, validarApodo, validarCorreo } from '../core/validaciones';
import { useAsync } from '../hooks/useAsync';
import { authService } from '../services/authService';
import type { Usuario } from '../types/api';
import { publicacionesService } from '../services/publicacionesService';

/** Función que, al guardar, entrega la foto ya recortada (512 x 512 JPEG), o null si no hay foto elegida. */
export type GeneradorFoto = () => Promise<File | null>;

/**
 * Foto de perfil con recorte cuadrado: se elige el archivo y se ajusta el zoom y la posición viendo una vista previa
 * circular. NO tiene botón propio: el perfil tiene un único «Guardar cambios», que pide la imagen recortada a través
 * de `onPreparada`. La cuenta del recorte está en core/recorte.ts.
 */
export function FotoPerfil({ onPreparada }: { onPreparada: (generar: GeneradorFoto | null) => void }) {
    const [error, setError] = useState('');
    const [vista, setVista] = useState('');
    const [zoom, setZoom] = useState(ZOOM_MIN);
    const [x, setX] = useState(50);
    const [y, setY] = useState(50);
    const imagenRef = useRef<HTMLImageElement>(null);
    const ajuste = useRef({ zoom: ZOOM_MIN, x: 50, y: 50 });
    ajuste.current = { zoom, x, y };

    async function recortar(): Promise<File | null> {
        const img = imagenRef.current;
        if (!img) return null;
        const a = ajuste.current;
        const { origenX, origenY, lado } = calcularRecorte(img.naturalWidth, img.naturalHeight, a.zoom, a.x, a.y);
        const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No se pudo preparar la imagen.');
        ctx.drawImage(img, origenX, origenY, lado, lado, 0, 0, 512, 512);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', .92));
        if (!blob) throw new Error('No se pudo generar la imagen recortada.');
        return new File([blob], 'perfil.jpg', { type: 'image/jpeg' });
    }

    async function seleccionar(e: ChangeEvent<HTMLInputElement>): Promise<void> {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!TIPOS_FOTO.includes(file.type)) { setError('Solo se permiten fotos JPG, PNG o WEBP.'); setVista(''); onPreparada(null); return; }
        if (file.size > 5 * 1024 * 1024) { setError('La foto puede pesar como máximo 5 MB.'); setVista(''); onPreparada(null); return; }
        setZoom(ZOOM_MIN); setX(50); setY(50); setError('');
        setVista(await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }));
        onPreparada(recortar);
    }

    return (
        <div>
            <Alert mensaje={error} />
            <label htmlFor="fotoPerfil" className="form-label">Foto de perfil</label>
            <input id="fotoPerfil" type="file" accept="image/jpeg,image/png,image/webp" className="form-control" onChange={seleccionar} />
            {vista && <div className="mt-3">
                <p className="small text-secondary mb-2">Ajusta el zoom y la posición del recorte cuadrado; se guardará con «Guardar cambios».</p>
                <div className="rounded-circle overflow-hidden border mx-auto" style={{ width: 180, height: 180 }}>
                    <img ref={imagenRef} src={vista} alt="Vista previa de recorte"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%` }} />
                </div>
                <label className="form-label mt-3 mb-0" htmlFor="zoomFoto">Zoom</label>
                <input id="zoomFoto" type="range" min={ZOOM_MIN} max={ZOOM_MAX} step=".05" className="form-range" value={zoom} onChange={e => setZoom(Number(e.target.value))} />
                <label className="form-label mb-0" htmlFor="posXFoto">Posición horizontal</label>
                <input id="posXFoto" type="range" min="0" max="100" className="form-range" value={x} onChange={e => setX(Number(e.target.value))} />
                <label className="form-label mb-0" htmlFor="posYFoto">Posición vertical</label>
                <input id="posYFoto" type="range" min="0" max="100" className="form-range" value={y} onChange={e => setY(Number(e.target.value))} />
            </div>}
        </div>
    );
}

/**
 * Formulario ÚNICO del perfil con UN solo botón «Guardar cambios». Guarda, solo lo que cambió:
 * apodo y ciudad (PATCH /usuarios/{id}), correo (PATCH /usuarios/{id}/correo) y foto (PUT /usuarios/{id}/foto).
 */
function FormularioPerfil({ usuario }: { usuario: Usuario }) {
    const [apodo, setApodo] = useState(usuario.apodo ?? '');
    const [ciudad, setCiudad] = useState<ValorLocalidad>({ ubicacion: usuario.ciudad ?? '', lugar: null });
    const [correo, setCorreo] = useState('');
    const [clave, setClave] = useState('');
    const [generarFoto, setGenerarFoto] = useState<GeneradorFoto | null>(null);
    const [errorCiudad, setErrorCiudad] = useState<string | null>(null);
    const [estado, setEstado] = useState({ mensaje: '', tipo: 'danger' });
    const [guardando, setGuardando] = useState(false);

    async function guardar(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        const errLocalidad = validarLocalidad(ciudad.ubicacion, ciudad.lugar, { obligatoria: false, original: usuario.ciudad ?? '', de: 'de tu perfil' });
        setErrorCiudad(errLocalidad);
        const quiereCorreo = !config.usarMock && (correo.trim() !== '' || clave !== '');
        const invalido = primerError(
            validarApodo(apodo),
            errLocalidad,
            quiereCorreo ? primerError(validarCorreo(correo), !clave ? 'Ingresa tu contraseña actual para cambiar el correo.' : null,
                correo.trim().toLowerCase() === usuario.correo.toLowerCase() ? 'El nuevo correo es igual al correo actual.' : null) : null,
        );
        if (invalido) { setEstado({ mensaje: invalido, tipo: 'danger' }); return; }

        const cambios: { apodo?: string; ciudad?: string } = {};
        if (apodo.trim() !== (usuario.apodo ?? '')) cambios.apodo = apodo.trim();
        if (ciudad.ubicacion.trim() !== (usuario.ciudad ?? '')) cambios.ciudad = ciudad.ubicacion.trim();
        if (!Object.keys(cambios).length && !quiereCorreo && !generarFoto) { setEstado({ mensaje: 'No hay cambios para guardar.', tipo: 'info' }); return; }

        setGuardando(true);
        try {
            if (Object.keys(cambios).length) await authService.actualizarPerfil(cambios);
            if (quiereCorreo) { await authService.cambiarCorreo(correo.trim(), clave); setCorreo(''); setClave(''); }
            if (generarFoto) {
                const foto = await generarFoto();
                if (foto) await authService.subirFoto(foto);
            }
            setEstado({ mensaje: 'Perfil actualizado correctamente.', tipo: 'success' });
        } catch (err) {
            setEstado({ mensaje: mensajeDeError(err, 'No se pudo guardar el perfil.'), tipo: 'danger' });
        } finally {
            setGuardando(false);
        }
    }

    return (
        <form onSubmit={guardar} noValidate aria-label="Datos del perfil">
            <Alert mensaje={estado.mensaje} tipo={estado.tipo} />
            <p className="mb-1"><strong>{usuario.nombre} {usuario.apellido}</strong></p>
            <p className="text-secondary">{usuario.correo}</p>
            <Campo id="perfilApodo" etiqueta="Apodo"><input id="perfilApodo" className="form-control" value={apodo} onChange={(e: ChangeEvent<HTMLInputElement>) => setApodo(e.target.value)} /></Campo>
            <Campo id="perfilCiudad" etiqueta="Ciudad" ayuda="Busca tu ciudad o pueblo y elígelo de la lista o del mapa (igual que en las publicaciones).">
                <SelectorLocalidad id="perfilCiudad" valor={ciudad} original={usuario.ciudad ?? ''} error={errorCiudad}
                    onCambiar={v => { setCiudad(v); setErrorCiudad(null); }} />
            </Campo>
            {config.usarMock
                ? <p className="small text-secondary">La foto y el cambio de correo requieren el backend real.</p>
                : (
                    <>
                        <div className="mb-3"><FotoPerfil onPreparada={setGenerarFoto} /></div>
                        <fieldset className="mb-3">
                            <legend className="form-label fs-6">Cambiar correo (opcional)</legend>
                            <Campo id="nuevoCorreo" etiqueta="Nuevo correo"><input id="nuevoCorreo" type="email" className="form-control" value={correo} onChange={(e: ChangeEvent<HTMLInputElement>) => setCorreo(e.target.value)} /></Campo>
                            <Campo id="claveActual" etiqueta="Contraseña actual" className="mb-0"><input id="claveActual" type="password" autoComplete="current-password" className="form-control" value={clave} onChange={(e: ChangeEvent<HTMLInputElement>) => setClave(e.target.value)} /></Campo>
                        </fieldset>
                    </>
                )}
            <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</button>
        </form>
    );
}

function Dispositivos() {
    const { datos, error } = useAsync(() => authService.dispositivos(), []);
    if (error) return <Alert mensaje={error} />;
    if (!datos?.length) return <p className="text-secondary small mb-0">No hay dispositivos registrados.</p>;
    return (
        <ul className="list-group">
            {datos.map(d => (
                <li key={d.id ?? d.dispositivoId} className="list-group-item small">
                    {d.navegador ?? d.dispositivo ?? 'Dispositivo'} · último acceso {formatoFechaCorta(d.ultimoAcceso ?? d.fecha ?? '')}
                </li>
            ))}
        </ul>
    );
}

export default function PerfilPage() {
    const { usuario } = useAuth();
    const { datos, cargando, error } = useAsync(() => publicacionesService.mias(), []);
    return (
        <div className="container py-4">
            <h1 className="h2 mb-4">Mi perfil</h1>
            <div className="row g-4">
                <div className="col-12 col-lg-5">
                    <section className="card card-body mb-3"><h2 className="h5">Mis datos</h2><FormularioPerfil usuario={usuario as Usuario} /></section>
                    <section className="card card-body"><h2 className="h5">Dispositivos</h2><Dispositivos /></section>
                </div>
                <div className="col-12 col-lg-7">
                    <h2 className="h5">Mis publicaciones</h2>
                    <PublicationList publicaciones={datos ?? []} cargando={cargando} error={error} vacio="Aún no has publicado nada." />
                </div>
            </div>
        </div>
    );
}
