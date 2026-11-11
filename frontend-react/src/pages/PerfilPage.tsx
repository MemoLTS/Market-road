import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Alert from '../components/common/Alert';
import Campo from '../components/common/Campo';
import PublicationList from '../components/publicaciones/PublicationList';
import { config } from '../config';
import { useAuth } from '../context/AuthContext';
import { formatoFechaCorta, mensajeDeError } from '../core/formato';
import { primerError, validarApodo, validarCorreo } from '../core/validaciones';
import { useAsync } from '../hooks/useAsync';
import { authService } from '../services/authService';
import type { Usuario } from '../types/api';
import { publicacionesService } from '../services/publicacionesService';

function DatosPerfil({ usuario }: { usuario: Usuario }) {
    const [apodo, setApodo] = useState(usuario.apodo ?? '');
    const [ciudad, setCiudad] = useState(usuario.ciudad ?? '');
    const [estado, setEstado] = useState({ mensaje: '', tipo: 'danger' });

    async function guardar(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        const cambios: { apodo?: string; ciudad?: string } = {};
        if (apodo.trim() !== (usuario.apodo ?? '')) cambios.apodo = apodo.trim();
        if (ciudad.trim() !== (usuario.ciudad ?? '')) cambios.ciudad = ciudad.trim();
        const invalido = primerError(validarApodo(apodo), ciudad.trim().length > 60 ? 'La ciudad puede tener como máximo 60 caracteres.' : null);
        if (invalido) { setEstado({ mensaje: invalido, tipo: 'danger' }); return; }
        if (!Object.keys(cambios).length) { setEstado({ mensaje: 'No hay cambios para guardar.', tipo: 'info' }); return; }
        try {
            await authService.actualizarPerfil(cambios);
            setEstado({ mensaje: 'Perfil actualizado correctamente.', tipo: 'success' });
        } catch (err) {
            setEstado({ mensaje: mensajeDeError(err, 'No se pudo guardar el perfil.'), tipo: 'danger' });
        }
    }

    return (
        <form onSubmit={guardar} noValidate aria-label="Datos del perfil">
            <Alert mensaje={estado.mensaje} tipo={estado.tipo} />
            <p className="mb-1"><strong>{usuario.nombre} {usuario.apellido}</strong></p>
            <p className="text-secondary">{usuario.correo}</p>
            <Campo id="perfilApodo" etiqueta="Apodo"><input id="perfilApodo" className="form-control" value={apodo} onChange={(e: ChangeEvent<HTMLInputElement>) => setApodo(e.target.value)} /></Campo>
            <Campo id="perfilCiudad" etiqueta="Ciudad"><input id="perfilCiudad" className="form-control" value={ciudad} onChange={(e: ChangeEvent<HTMLInputElement>) => setCiudad(e.target.value)} /></Campo>
            <button type="submit" className="btn btn-primary">Guardar cambios</button>
        </form>
    );
}

function CambiarCorreo({ usuario }: { usuario: Usuario }) {
    const [correo, setCorreo] = useState('');
    const [clave, setClave] = useState('');
    const [estado, setEstado] = useState({ mensaje: '', tipo: 'danger' });

    async function enviar(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        const invalido = primerError(validarCorreo(correo), !clave ? 'Ingresa tu contraseña actual.' : null,
            correo.trim().toLowerCase() === usuario.correo.toLowerCase() ? 'El nuevo correo es igual al correo actual.' : null);
        if (invalido) { setEstado({ mensaje: invalido, tipo: 'danger' }); return; }
        try {
            await authService.cambiarCorreo(correo.trim(), clave);
            setCorreo(''); setClave('');
            setEstado({ mensaje: 'Correo actualizado correctamente.', tipo: 'success' });
        } catch (err) {
            setEstado({ mensaje: mensajeDeError(err, 'No se pudo actualizar el correo.'), tipo: 'danger' });
        }
    }

    return (
        <form onSubmit={enviar} noValidate aria-label="Cambiar correo">
            <Alert mensaje={estado.mensaje} tipo={estado.tipo} />
            <Campo id="nuevoCorreo" etiqueta="Nuevo correo"><input id="nuevoCorreo" type="email" className="form-control" value={correo} onChange={(e: ChangeEvent<HTMLInputElement>) => setCorreo(e.target.value)} /></Campo>
            <Campo id="claveActual" etiqueta="Contraseña actual"><input id="claveActual" type="password" className="form-control" value={clave} onChange={(e: ChangeEvent<HTMLInputElement>) => setClave(e.target.value)} /></Campo>
            <button type="submit" className="btn btn-outline-primary">Cambiar correo</button>
        </form>
    );
}

function FotoPerfil() {
    const [estado, setEstado] = useState({ mensaje: '', tipo: 'danger' });
    async function subir(e: ChangeEvent<HTMLInputElement>): Promise<void> {
        const archivo = e.target.files?.[0];
        if (!archivo) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) { setEstado({ mensaje: 'Solo se permiten fotos JPG, PNG o WEBP.', tipo: 'danger' }); return; }
        if (archivo.size > 5 * 1024 * 1024) { setEstado({ mensaje: 'La foto puede pesar como máximo 5 MB.', tipo: 'danger' }); return; }
        try {
            await authService.subirFoto(archivo);
            setEstado({ mensaje: 'Foto guardada.', tipo: 'success' });
        } catch (err) {
            setEstado({ mensaje: mensajeDeError(err), tipo: 'danger' });
        }
    }
    return (
        <div>
            <Alert mensaje={estado.mensaje} tipo={estado.tipo} />
            <label htmlFor="fotoPerfil" className="form-label">Foto de perfil</label>
            <input id="fotoPerfil" type="file" accept="image/jpeg,image/png,image/webp" className="form-control" onChange={subir} />
        </div>
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
                    <section className="card card-body mb-3"><h2 className="h5">Mis datos</h2><DatosPerfil usuario={usuario as Usuario} /></section>
                    <section className="card card-body mb-3"><h2 className="h5">Foto</h2>{config.usarMock ? <p className="small text-secondary mb-0">La foto requiere el backend real.</p> : <FotoPerfil />}</section>
                    <section className="card card-body mb-3"><h2 className="h5">Correo</h2>{config.usarMock ? <p className="small text-secondary mb-0">El cambio de correo requiere el backend real.</p> : <CambiarCorreo usuario={usuario as Usuario} />}</section>
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
