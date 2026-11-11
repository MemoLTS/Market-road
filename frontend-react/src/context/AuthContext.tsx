import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/authService';
import { CLAVE_SESION, EVENTO_SESION, EVENTO_SESION_EXPIRADA, esSuperusuario, obtenerSesion } from '../services/sesion';
import type { Sesion, Usuario } from '../types/api';
import type { DatosRegistro } from '../types/app';

export interface ValorAuth {
    sesion: Sesion | null;
    usuario: Usuario | null;
    autenticado: boolean;
    esAdmin: boolean;
    aviso: string;
    limpiarAviso: () => void;
    login: (correo: string, contrasena: string) => Promise<Usuario>;
    registrar: (datos: DatosRegistro) => Promise<{ sesionIniciada: boolean }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<ValorAuth | null>(null);

/**
 * Estado de sesión compartido. Se sincroniza con localStorage: si se inicia o cierra sesión en otra
 * pestaña (evento "storage") o expira el token (evento propio), todos los componentes se actualizan.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [sesion, setSesion] = useState<Sesion | null>(() => obtenerSesion());
    const [aviso, setAviso] = useState('');

    useEffect(() => {
        const sincronizar = (): void => setSesion(obtenerSesion());
        const alStorage = (e: StorageEvent): void => { if (e.key === null || e.key === CLAVE_SESION) sincronizar(); };
        const alExpirar = (): void => { sincronizar(); setAviso('Tu sesión expiró o no es válida. Por favor inicia sesión nuevamente.'); };
        window.addEventListener(EVENTO_SESION, sincronizar);
        window.addEventListener('storage', alStorage);
        window.addEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
        return () => {
            window.removeEventListener(EVENTO_SESION, sincronizar);
            window.removeEventListener('storage', alStorage);
            window.removeEventListener(EVENTO_SESION_EXPIRADA, alExpirar);
        };
    }, []);

    const login = useCallback((correo: string, contrasena: string) => authService.login(correo, contrasena), []);
    const registrar = useCallback((datos: DatosRegistro) => authService.registrar(datos), []);
    const logout = useCallback(() => authService.logout(), []);
    const limpiarAviso = useCallback(() => setAviso(''), []);

    const valor = useMemo<ValorAuth>(() => ({
        sesion, usuario: sesion?.usuario ?? null, autenticado: sesion !== null,
        esAdmin: esSuperusuario(sesion), aviso, limpiarAviso, login, registrar, logout,
    }), [sesion, aviso, limpiarAviso, login, registrar, logout]);

    return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): ValorAuth {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
    return ctx;
}
