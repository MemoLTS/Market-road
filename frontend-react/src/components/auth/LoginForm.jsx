import { useState } from 'react';
import { mensajeDeError } from '../../core/formato.js';
import { LIMITES, primerError, validarCorreo } from '../../core/validaciones.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Alert from '../common/Alert.jsx';

/** Formulario de inicio de sesión. `onExito` se llama cuando la sesión quedó iniciada. */
export default function LoginForm({ onExito, onIrARegistro }) {
    const { login } = useAuth();
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    async function enviar(e) {
        e.preventDefault();
        const invalido = primerError(
            !correo.trim() || !contrasena ? 'Completa correo y contraseña.' : null,
            validarCorreo(correo),
            contrasena.length < LIMITES.contrasena.min ? `La contraseña debe tener al menos ${LIMITES.contrasena.min} caracteres.` : null,
            contrasena.length > LIMITES.contrasena.max ? `La contraseña puede tener como máximo ${LIMITES.contrasena.max} caracteres.` : null,
        );
        if (invalido) { setError(invalido); return; }
        setError('');
        setEnviando(true);
        try {
            await login(correo.trim(), contrasena);
            setContrasena('');
            onExito?.();
        } catch (err) {
            setError(mensajeDeError(err, 'No se pudo iniciar sesión.'));
        } finally {
            setEnviando(false);
        }
    }

    return (
        <form onSubmit={enviar} noValidate>
            <Alert mensaje={error} />
            <div className="mb-3">
                <label htmlFor="loginCorreo" className="form-label">Correo</label>
                <input id="loginCorreo" type="email" className="form-control" autoComplete="email" value={correo} onChange={e => setCorreo(e.target.value)} />
            </div>
            <div className="mb-3">
                <label htmlFor="loginContrasena" className="form-label">Contraseña</label>
                <input id="loginContrasena" type="password" className="form-control" autoComplete="current-password" value={contrasena} onChange={e => setContrasena(e.target.value)} />
            </div>
            <button id="btnLogin" type="submit" className="btn btn-primary w-100" disabled={enviando}>{enviando ? 'Entrando...' : 'Iniciar sesión'}</button>
            {onIrARegistro && (
                <p className="text-center small mt-3 mb-0">
                    ¿No tienes cuenta? <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={onIrARegistro}>Crear cuenta</button>
                </p>
            )}
        </form>
    );
}
