import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';
import { CLAVE_SESION, EVENTO_SESION, EVENTO_SESION_EXPIRADA, esSuperusuario, obtenerSesion } from '../services/sesion.js';

const AuthContext = createContext(null);

/**
 * Estado de sesión compartido. Se sincroniza con localStorage: si se inicia o cierra sesión en otra
 * pestaña (evento "storage") o expira el token (evento propio), todos los componentes se actualizan.
 */
export function AuthProvider({ children }) {
    const [sesion, setSesion] = useState(() => obtenerSesion());
    const [aviso, setAviso] = useState('');

    useEffect(() => {
        const sincronizar = () => setSesion(obtenerSesion());
        const alStorage = e => { if (e.key === null || e.key === CLAVE_SESION) sincronizar(); };
        const alExpirar = () => { sincronizar(); setAviso('Tu sesión expiró o no es válida. Por favor inicia sesión nuevamente.'); };
        window.addEventListener(EVENTO_SESION, sincronizar);
        window.addEventListener('storage', alStorage);
        window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
        return () => {
            window.removeEventListener(EVENTO_SESION, sincronizar);
            window.removeEventListener('storage', alStorage);
            window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
        };
    }, []);

    const login = useCallback((correo, contrasena) => authService.login(correo, contrasena), []);
    const registrar = useCallback(datos => authService.registrar(datos), []);
    const logout = useCallback(() => authService.logout(), []);
    const limpiarAviso = useCallback(() => setAviso(''), []);

    const valor = useMemo(() => ({
        sesion, usuario: sesion?.usuario ?? null, autenticado: sesion !== null,
        esAdmin: esSuperusuario(sesion), aviso, limpiarAviso, login, registrar, logout,
    }), [sesion, aviso, limpiarAviso, login, registrar, logout]);

    return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
    return ctx;
}
