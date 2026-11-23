import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Alert from '../common/Alert';
import Campo from '../common/Campo';
import { mensajeDeError } from '../../core/formato';
import { primerError, validarContrasenaNueva } from '../../core/validaciones';

export interface PropsCambiarContrasena {
    /** Envía la contraseña actual y la nueva al servidor (POST /soporte/panel/auth/contrasena). */
    onCambiar: (actual: string, nueva: string) => Promise<void>;
}

/** Formulario para que el personal de soporte cambie su propia contraseña. Una sola responsabilidad: validar y entregar los datos. */
export default function CambiarContrasena({ onCambiar }: PropsCambiarContrasena) {
    const [v, setV] = useState({ actual: '', nueva: '', repetir: '' });
    const [errores, setErrores] = useState<{ actual: string | null; nueva: string | null; repetir: string | null } | null>(null);
    const [estado, setEstado] = useState({ mensaje: '', tipo: 'danger' });
    const [guardando, setGuardando] = useState(false);

    const cambiar = (campo: 'actual' | 'nueva' | 'repetir') => (e: ChangeEvent<HTMLInputElement>): void => {
        setV(x => ({ ...x, [campo]: e.target.value }));
    };

    async function enviar(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        const resultado = {
            actual: v.actual ? null : 'Ingresa tu contraseña actual.',
            nueva: validarContrasenaNueva(v.nueva),
            repetir: v.nueva === v.repetir ? null : 'Las contraseñas nuevas no coinciden.',
        };
        setErrores(resultado);
        if (primerError(resultado.actual, resultado.nueva, resultado.repetir)) return;
        setGuardando(true);
        setEstado({ mensaje: '', tipo: 'danger' });
        try {
            await onCambiar(v.actual, v.nueva);
            setV({ actual: '', nueva: '', repetir: '' });
            setErrores(null);
            setEstado({ mensaje: 'Contraseña actualizada.', tipo: 'success' });
        } catch (err) {
            setEstado({ mensaje: mensajeDeError(err), tipo: 'danger' });
        } finally {
            setGuardando(false);
        }
    }

    return (
        <form noValidate onSubmit={enviar} aria-label="Cambiar contraseña" className="card card-body border-0 shadow-sm p-3 p-md-4" style={{ maxWidth: 480 }}>
            <h2 className="h5 mb-3">Cambiar mi contraseña</h2>
            <Alert mensaje={estado.mensaje} tipo={estado.tipo} />
            <Campo id="cpActual" etiqueta="Contraseña actual" error={errores?.actual}>
                <input id="cpActual" type="password" autoComplete="current-password" className="form-control" value={v.actual} onChange={cambiar('actual')} />
            </Campo>
            <Campo id="cpNueva" etiqueta="Contraseña nueva" error={errores?.nueva} ayuda="De 8 a 32 caracteres, con letras y números.">
                <input id="cpNueva" type="password" autoComplete="new-password" className="form-control" value={v.nueva} onChange={cambiar('nueva')} />
            </Campo>
            <Campo id="cpRepetir" etiqueta="Repite la contraseña nueva" error={errores?.repetir}>
                <input id="cpRepetir" type="password" autoComplete="new-password" className="form-control" value={v.repetir} onChange={cambiar('repetir')} />
            </Campo>
            <div className="d-grid d-sm-flex justify-content-sm-end">
                <button type="submit" className="btn btn-primary px-4" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar contraseña'}</button>
            </div>
        </form>
    );
}
