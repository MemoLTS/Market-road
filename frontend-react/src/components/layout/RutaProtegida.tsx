import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUi } from '../../context/UiContext';
import { Navigate } from '../../core/router';

/** Protege una vista: exige sesión y, opcionalmente, rol de superusuario. */
export default function RutaProtegida({ admin = false, children }: { admin?: boolean; children: ReactElement }) {
    const { autenticado, esAdmin } = useAuth();
    const { abrirLogin } = useUi();
    useEffect(() => { if (!autenticado) abrirLogin(); }, [autenticado, abrirLogin]);
    if (!autenticado || (admin && !esAdmin)) return <Navigate to="/" />;
    return children;
}
