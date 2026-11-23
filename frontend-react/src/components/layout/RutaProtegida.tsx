import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUi } from '../../context/UiContext';
import { guardarDestino } from '../../core/destino';
import { Navigate, useRuta } from '../../core/router';

/** Protege una vista: exige sesión y, opcionalmente, rol de superusuario. Recuerda la dirección pedida para volver a ella tras iniciar sesión. */
export default function RutaProtegida({ admin = false, children }: { admin?: boolean; children: ReactElement }) {
    const { autenticado, esAdmin } = useAuth();
    const { abrirLogin } = useUi();
    // La ruta se toma al renderizar: el <Navigate> de abajo cambia la URL antes de que corra este efecto.
    const ruta = useRuta();
    useEffect(() => {
        if (!autenticado) { guardarDestino(ruta); abrirLogin(); }
    }, [autenticado, abrirLogin, ruta]);
    if (!autenticado || (admin && !esAdmin)) return <Navigate to="/" />;
    return children;
}
