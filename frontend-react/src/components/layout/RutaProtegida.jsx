import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { Navigate } from '../../core/router.jsx';

/** Protege una vista: exige sesión y, opcionalmente, rol de superusuario. */
export default function RutaProtegida({ admin = false, children }) {
    const { autenticado, esAdmin } = useAuth();
    const { abrirLogin } = useUi();
    useEffect(() => { if (!autenticado) abrirLogin(); }, [autenticado, abrirLogin]);
    if (!autenticado || (admin && !esAdmin)) return <Navigate to="/" />;
    return children;
}
