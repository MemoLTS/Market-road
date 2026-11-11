import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

/**
 * Enrutador mínimo basado en hash (#/ruta), sin dependencias. Imita el subconjunto de la API de
 * react-router (Router, Routes/Route, Link, NavLink, Navigate, useNavigate, useParams) que usa la app,
 * así que cambiar a react-router-dom solo requiere cambiar los imports.
 */
export type Params = Record<string, string>;
export interface OpcionesNavegar { reemplazar?: boolean }
interface ValorRouter {
    ruta: string;
    navegar: (destino: string, opciones?: OpcionesNavegar) => void;
    params: Params;
}

const RouterContext = createContext<ValorRouter>({ ruta: '/', navegar: () => {}, params: {} });

export function rutaActual(): string {
    const hash = window.location.hash.replace(/^#/, '');
    return hash ? hash.split('?')[0] : '/';
}

export function Router({ children }: { children: ReactNode }) {
    const [ruta, setRuta] = useState(rutaActual);
    useEffect(() => {
        const alCambiar = () => setRuta(rutaActual());
        window.addEventListener('hashchange', alCambiar);
        return () => window.removeEventListener('hashchange', alCambiar);
    }, []);
    const navegar = useCallback((destino: string, { reemplazar = false }: OpcionesNavegar = {}) => {
        if (reemplazar) window.location.replace(`#${destino}`);
        else window.location.hash = destino;
        setRuta(destino.split('?')[0]);
    }, []);
    const valor = useMemo<ValorRouter>(() => ({ ruta, navegar, params: {} }), [ruta, navegar]);
    return <RouterContext.Provider value={valor}>{children}</RouterContext.Provider>;
}

/** Compara "/publicaciones/:id" con "/publicaciones/5" y devuelve {id: '5'} o null. */
export function coincidir(patron: string, ruta: string): Params | null {
    const a = patron.split('/').filter(Boolean);
    const b = ruta.split('/').filter(Boolean);
    if (patron === '*') return {};
    if (a.length !== b.length) return null;
    const params: Params = {};
    for (let i = 0; i < a.length; i++) {
        if (a[i].startsWith(':')) {
            try { params[a[i].slice(1)] = decodeURIComponent(b[i]); }
            catch { return null; }
        } else if (a[i] !== b[i]) return null;
    }
    return params;
}

export interface PropsRoute {
    path: string;
    element: ReactElement;
}

export function Route(_props: PropsRoute) {
    return null; // solo describe una ruta: Routes la lee
}

export function Routes({ children }: { children: ReactElement<PropsRoute> | ReactElement<PropsRoute>[] }) {
    const { ruta, navegar } = useContext(RouterContext);
    const rutas = Array.isArray(children) ? children : [children];
    for (const hijo of rutas) {
        const params = coincidir(hijo.props.path, ruta);
        if (params) {
            return (
                <RouterContext.Provider value={{ ruta, navegar, params }}>
                    {hijo.props.element}
                </RouterContext.Provider>
            );
        }
    }
    return null;
}

export const useNavigate = () => useContext(RouterContext).navegar;
export const useParams = () => useContext(RouterContext).params;
export const useRuta = () => useContext(RouterContext).ruta;

export function Navigate({ to, replace = true }: { to: string; replace?: boolean }) {
    const navegar = useNavigate();
    useEffect(() => { navegar(to, { reemplazar: replace }); }, [to, replace, navegar]);
    return null;
}

export function Link({ to, children, ...resto }: { to: string; children?: ReactNode; [atributo: string]: unknown }) {
    return <a href={`#${to}`} {...resto}>{children}</a>;
}

/** Como Link, pero agrega la clase "active" cuando la ruta actual coincide. */
export function NavLink({ to, end = false, className = '', children, ...resto }: { to: string; end?: boolean; className?: string; children?: ReactNode; [atributo: string]: unknown }) {
    const ruta = useRuta();
    const activa = end ? ruta === to : ruta === to || (to !== '/' && ruta.startsWith(`${to}/`));
    return (
        <a href={`#${to}`} className={`${className} ${activa ? 'active' : ''}`.trim()} aria-current={activa ? 'page' : undefined} {...resto}>
            {children}
        </a>
    );
}
