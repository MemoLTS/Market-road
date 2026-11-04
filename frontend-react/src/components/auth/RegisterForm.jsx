import { useState } from 'react';
import { mensajeDeError } from '../../core/formato.js';
import {
    primerError, validarApodo, validarContrasenaNueva, validarCorreo, validarNombre,
} from '../../core/validaciones.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Alert from '../common/Alert.jsx';
import Campo from '../common/Campo.jsx';

const REGLAS = {
    nombre: v => validarNombre(v, 'El nombre'),
    apellido: v => validarNombre(v, 'El apellido'),
    apodo: validarApodo,
    correo: validarCorreo,
    contrasena: validarContrasenaNueva,
};
const VACIO = { nombre: '', apellido: '', apodo: '', correo: '', contrasena: '' };

/** Registro con validación en vivo: cada campo se valida al perder el foco y todo otra vez al enviar. */
export default function RegisterForm({ onExito }) {
    const { registrar } = useAuth();
    const [valores, setValores] = useState(VACIO);
    const [errores, setErrores] = useState({});
    const [alerta, setAlerta] = useState({ mensaje: '', tipo: 'danger' });
    const [enviando, setEnviando] = useState(false);

    const cambiar = campo => e => setValores(v => ({ ...v, [campo]: e.target.value }));
    const validarCampo = campo => () => {
        if (valores[campo] === '') return;
        setErrores(prev => ({ ...prev, [campo]: REGLAS[campo](valores[campo]) }));
    };
    const clase = campo => `form-control ${errores[campo] ? 'is-invalid' : (campo in errores ? 'is-valid' : '')}`.trim();

    async function enviar(e) {
        e.preventDefault();
        const datos = {
            nombre: valores.nombre.trim(), apellido: valores.apellido.trim(), apodo: valores.apodo.trim(),
            correo: valores.correo.trim(), contrasena: valores.contrasena,
        };
        const invalido = primerError(
            !datos.nombre || !datos.apellido || !datos.correo || !datos.contrasena ? 'Completa nombre, apellido, correo y contraseña.' : null,
            ...Object.keys(REGLAS).map(c => REGLAS[c](datos[c])),
        );
        if (invalido) { setAlerta({ mensaje: invalido, tipo: 'danger' }); return; }
        setAlerta({ mensaje: '', tipo: 'danger' });
        setEnviando(true);
        try {
            const { sesionIniciada } = await registrar(datos);
            setValores(VACIO);
            setErrores({});
            if (sesionIniciada) onExito?.();
            else setAlerta({ mensaje: '¡Usuario registrado con éxito! Ya puedes iniciar sesión.', tipo: 'success' });
        } catch (err) {
            // El backend responde 409 si el correo o el apodo ya están en uso; se muestra tal cual.
            setAlerta({ mensaje: mensajeDeError(err, 'Error al registrar. Verifica tu conexión.'), tipo: 'danger' });
        } finally {
            setEnviando(false);
        }
    }

    return (
        <form onSubmit={enviar} noValidate>
            <Alert mensaje={alerta.mensaje} tipo={alerta.tipo} />
            <div className="row">
                <Campo id="regNombre" etiqueta="Nombre" error={errores.nombre} className="col-12 col-sm-6 mb-3">
                    <input id="regNombre" className={clase('nombre')} value={valores.nombre} onChange={cambiar('nombre')} onBlur={validarCampo('nombre')} autoComplete="given-name" />
                </Campo>
                <Campo id="regApellido" etiqueta="Apellido" error={errores.apellido} className="col-12 col-sm-6 mb-3">
                    <input id="regApellido" className={clase('apellido')} value={valores.apellido} onChange={cambiar('apellido')} onBlur={validarCampo('apellido')} autoComplete="family-name" />
                </Campo>
            </div>
            <Campo id="regApodo" etiqueta="Apodo (opcional)" error={errores.apodo}>
                <input id="regApodo" className={clase('apodo')} value={valores.apodo} onChange={cambiar('apodo')} onBlur={validarCampo('apodo')} />
            </Campo>
            <Campo id="regCorreo" etiqueta="Correo" error={errores.correo}>
                <input id="regCorreo" type="email" className={clase('correo')} value={valores.correo} onChange={cambiar('correo')} onBlur={validarCampo('correo')} autoComplete="email" />
            </Campo>
            <Campo id="regContrasena" etiqueta="Contraseña" error={errores.contrasena} ayuda="De 8 a 32 caracteres, con al menos una letra y un número.">
                <input id="regContrasena" type="password" className={clase('contrasena')} value={valores.contrasena} onChange={cambiar('contrasena')} onBlur={validarCampo('contrasena')} autoComplete="new-password" />
            </Campo>
            <button id="btnRegistrar" type="submit" className="btn btn-primary w-100" disabled={enviando}>{enviando ? 'Creando...' : 'Crear cuenta'}</button>
        </form>
    );
}
