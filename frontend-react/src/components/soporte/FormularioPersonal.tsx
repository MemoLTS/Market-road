import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Alert from '../common/Alert';
import Campo from '../common/Campo';
import { mensajeDeError } from '../../core/formato';
import { primerError, validarContrasenaNueva, validarCorreo } from '../../core/validaciones';
import type { Resultado } from '../../core/validaciones';
import type { PersonalSoporte, RolPersonal } from '../../types/soporte';

export interface ValoresPersonal {
    nombre: string;
    correo: string;
    contrasena: string;
    rol: RolPersonal;
    activo: boolean;
}

/** Datos que se envían al backend: al editar no viajan el correo (no se cambia) ni una contraseña vacía. */
export type DatosPersonal = Partial<ValoresPersonal>;

export interface PropsFormularioPersonal {
    /** Persona a editar; sin ella el formulario es de alta. */
    persona?: PersonalSoporte | null;
    onGuardar: (datos: DatosPersonal) => Promise<void>;
    onCancelar: () => void;
}

/** Reglas de validación del alta y la edición (funciones puras: se prueban sin renderizar). */
export function validarPersonal(v: ValoresPersonal, edicion: boolean): Record<'nombre' | 'correo' | 'contrasena', Resultado> {
    const nombre = v.nombre.trim();
    return {
        nombre: nombre.length < 2 || nombre.length > 80 ? 'El nombre debe tener entre 2 y 80 caracteres.' : null,
        correo: edicion ? null : validarCorreo(v.correo),
        contrasena: edicion && v.contrasena === '' ? null : validarContrasenaNueva(v.contrasena),
    };
}

/** Formulario de una persona del equipo de soporte (alta y edición). Una sola responsabilidad: validar y entregar los datos. */
export default function FormularioPersonal({ persona = null, onGuardar, onCancelar }: PropsFormularioPersonal) {
    const edicion = persona !== null;
    const [v, setV] = useState<ValoresPersonal>({
        nombre: persona?.nombre ?? '', correo: persona?.correo ?? '', contrasena: '', rol: persona?.rol ?? 'SOPORTE', activo: persona?.activo ?? true,
    });
    const [errores, setErrores] = useState<Record<'nombre' | 'correo' | 'contrasena', Resultado> | null>(null);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    const cambiar = (campo: 'nombre' | 'correo' | 'contrasena' | 'rol') => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
        setV(x => ({ ...x, [campo]: e.target.value }));
    };

    async function enviar(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        const resultado = validarPersonal(v, edicion);
        setErrores(resultado);
        if (primerError(...Object.values(resultado))) return;
        const datos: DatosPersonal = edicion
            ? { nombre: v.nombre.trim(), rol: v.rol, activo: v.activo, ...(v.contrasena ? { contrasena: v.contrasena } : {}) }
            : { nombre: v.nombre.trim(), correo: v.correo.trim(), contrasena: v.contrasena, rol: v.rol };
        setGuardando(true);
        setError('');
        try { await onGuardar(datos); }
        catch (err) { setError(mensajeDeError(err)); }
        finally { setGuardando(false); }
    }

    return (
        <form noValidate onSubmit={enviar} aria-label={edicion ? 'Editar persona del equipo' : 'Nueva persona del equipo'}>
            <Alert mensaje={error} />
            <Campo id="perNombre" etiqueta="Nombre" error={errores?.nombre}>
                <input id="perNombre" className="form-control" value={v.nombre} onChange={cambiar('nombre')} maxLength={80} />
            </Campo>
            <Campo id="perCorreo" etiqueta="Correo" error={errores?.correo} ayuda={edicion ? 'El correo no se puede cambiar.' : undefined}>
                <input id="perCorreo" type="email" className="form-control" value={v.correo} onChange={cambiar('correo')} disabled={edicion} />
            </Campo>
            <Campo id="perContrasena" etiqueta={edicion ? 'Nueva contraseña (opcional)' : 'Contraseña'} error={errores?.contrasena} ayuda="De 8 a 32 caracteres, con letras y números.">
                <input id="perContrasena" type="password" autoComplete="new-password" className="form-control" value={v.contrasena} onChange={cambiar('contrasena')} />
            </Campo>
            <Campo id="perRol" etiqueta="Rol">
                <select id="perRol" className="form-select" value={v.rol} onChange={cambiar('rol')}>
                    <option value="SOPORTE">Agente de soporte</option>
                    <option value="ADMIN">Administrador</option>
                </select>
            </Campo>
            {edicion && (
                <div className="form-check form-switch mb-3">
                    <input id="perActivo" type="checkbox" className="form-check-input" role="switch" checked={v.activo} onChange={e => setV(x => ({ ...x, activo: e.target.checked }))} />
                    <label htmlFor="perActivo" className="form-check-label">Cuenta activa</label>
                </div>
            )}
            <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="btn btn-outline-secondary" onClick={onCancelar}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : edicion ? 'Guardar cambios' : 'Crear persona'}</button>
            </div>
        </form>
    );
}
