import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUi } from '../../context/UiContext';
import { config } from '../../config';
import { Link, NavLink, useNavigate } from '../../core/router';
import { mensajesService } from '../../services/mensajesService';
import ThemeToggle from './ThemeToggle';

const ENLACES = [
    { to: '/', texto: 'Inicio', end: true },
    { to: '/categorias', texto: 'Categorías' },

];

/** Barra de navegación responsiva: se colapsa en pantallas menores a "lg" (breakpoint de Bootstrap). */
export default function Navbar() {
    const { usuario, autenticado, esAdmin, logout } = useAuth();
    const { abrirLogin, abrirRegistro } = useUi();
    const navegar = useNavigate();
    const [abierto, setAbierto] = useState(false);
    const [menuUsuario, setMenuUsuario] = useState(false);
    const [noLeidos, setNoLeidos] = useState(0);

    useEffect(() => {
        if (!autenticado || config.usarMock) { setNoLeidos(0); return undefined; }
        let activo = true;
        const cargar = () => mensajesService.noLeidos().then(r => { if (activo) setNoLeidos(r.total); }).catch(() => {});
        cargar();
        const intervalo = setInterval(cargar, 30000);
        return () => { activo = false; clearInterval(intervalo); };
    }, [autenticado]);

    const cerrarMenus = () => { setAbierto(false); setMenuUsuario(false); };

    async function salir() {
        cerrarMenus();
        await logout();
        navegar('/');
    }

    return (
        <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom sticky-top" aria-label="Navegación principal">
            <div className="container">
                <Link to="/" className="navbar-brand d-flex align-items-center gap-2" onClick={cerrarMenus}>
                    <img src="logo.png" alt="" width="32" height="32" />
                    <span className="fw-bold">Market-Road</span>
                </Link>
                <button className="navbar-toggler" type="button" aria-label="Mostrar u ocultar el menú" aria-expanded={abierto}
                    onClick={() => setAbierto(a => !a)}>
                    <span className="navbar-toggler-icon" />
                </button>
                <div className={`collapse navbar-collapse ${abierto ? 'show' : ''}`}>
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        {ENLACES.map(e => (
                            <li className="nav-item" key={e.to}>
                                <NavLink to={e.to} end={e.end} className="nav-link" onClick={cerrarMenus}>{e.texto}</NavLink>
                            </li>
                        ))}
                    </ul>
                    <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-2">
                        <ThemeToggle />
                        {!autenticado && (
                            <>
                                <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => { cerrarMenus(); abrirLogin(); }}>Iniciar sesión</button>
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => { cerrarMenus(); abrirRegistro(); }}>Crear cuenta</button>
                            </>
                        )}
                        {autenticado && (
                            <div className="dropdown">
                                <button type="button" className="btn btn-outline-secondary btn-sm dropdown-toggle" aria-expanded={menuUsuario}
                                    onClick={() => setMenuUsuario(m => !m)}>
                                    {((usuario as any)?.fotoUrl || (usuario as any)?.fotoPerfilUrl) ? <img src={((usuario as any)?.fotoUrl || (usuario as any)?.fotoPerfilUrl)} alt="Foto de perfil" width="30" height="30" className="rounded-circle object-fit-cover me-1" /> : <span className="rounded-circle bg-secondary-subtle d-inline-flex align-items-center justify-content-center me-1" style={{width:30,height:30}} aria-label="Perfil">{(usuario?.apodo || usuario?.nombre || 'U').slice(0,1).toUpperCase()}</span>}
                                    {noLeidos > 0 && <span className="badge text-bg-danger ms-2" aria-label={`${noLeidos} mensajes sin leer`}>{noLeidos}</span>}
                                </button>
                                <ul className={`dropdown-menu dropdown-menu-end ${menuUsuario ? 'show' : ''}`}>
                                    <li><Link to="/perfil" className="dropdown-item" onClick={cerrarMenus}>Mi perfil</Link></li>
                                    <li><Link to="/mensajes" className="dropdown-item" onClick={cerrarMenus}>Mensajes{noLeidos > 0 ? ` (${noLeidos})` : ''}</Link></li>\n                                    {(['SOPORTE', 'ADMIN', 'SUPERUSUARIO'].includes(String((usuario as any)?.rol).toUpperCase()) || esAdmin) && <li><Link to="/soporte-panel" className="dropdown-item" onClick={cerrarMenus}>Tickets de soporte</Link></li>}
                                    {esAdmin && <li><Link to="/admin" className="dropdown-item" onClick={cerrarMenus}>Administración</Link></li>}
                                    <li><hr className="dropdown-divider" /></li>
                                    <li><button type="button" className="dropdown-item" onClick={salir}>Cerrar sesión</button></li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
