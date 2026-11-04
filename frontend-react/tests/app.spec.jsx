import { config } from '../src/config.js';
import * as bd from '../src/data/baseDatos.js';
import Navbar from '../src/components/layout/Navbar.jsx';
import { Link, NavLink, Route, Router, Routes, coincidir } from '../src/core/router.jsx';
import HomePage from '../src/pages/HomePage.jsx';
import { filtrarConversaciones, normalizarMensajes } from '../src/pages/MensajesPage.jsx';
import { filtrarPor } from '../src/pages/AdminPage.jsx';
import { authService } from '../src/services/authService.js';
import { guardarSesion } from '../src/services/sesion.js';
import { clic, desmontarTodo, escribir, esperar, montar, montarConApp, enviarFormulario, texto } from './helpers.jsx';

describe('Enrutador', () => {
    beforeEach(() => { window.location.hash = '#/'; });
    afterEach(desmontarTodo);

    it('coincidir extrae parámetros de la ruta', () => {
        expect(coincidir('/publicaciones/:id', '/publicaciones/42')).toEqual({ id: '42' });
        expect(coincidir('/publicaciones/:id', '/otra/42')).toBeNull();
        expect(coincidir('/a', '/a/b')).toBeNull();
        expect(coincidir('*', '/lo-que-sea')).toEqual({});
    });

    it('muestra la vista que coincide con el hash y cambia al navegar', async () => {
        const c = await montar(
            <Router>
                <Link to="/dos">ir</Link>
                <Routes><Route path="/" element={<p>Uno</p>} /><Route path="/dos" element={<p>Dos</p>} /><Route path="*" element={<p>404</p>} /></Routes>
            </Router>);
        expect(texto(c)).toContain('Uno');
        await clic(c.querySelector('a'));
        await esperar(10);
        expect(texto(c)).toContain('Dos');
    });

    it('NavLink marca como activo el enlace de la ruta actual', async () => {
        window.location.hash = '#/categorias';
        const c = await montar(<Router><NavLink to="/categorias" className="nav-link">Cat</NavLink><NavLink to="/" end className="nav-link">Inicio</NavLink></Router>);
        const [cat, inicio] = c.querySelectorAll('a');
        expect(cat.classList.contains('active')).toBe(true);
        expect(inicio.classList.contains('active')).toBe(false);
    });
});

describe('Navbar (sesión y menú responsivo)', () => {
    beforeEach(() => { localStorage.clear(); config.usarMock = true; });
    afterEach(async () => { await desmontarTodo(); config.usarMock = false; localStorage.clear(); });

    it('invitado: muestra "Iniciar sesión" y "Crear cuenta"', async () => {
        const c = await montarConApp(<Navbar />);
        expect(texto(c)).toContain('Iniciar sesión');
        expect(texto(c)).toContain('Crear cuenta');
        expect(texto(c)).not.toContain('Cerrar sesión');
    });

    it('autenticado: muestra el apodo y llama a logout al cerrar sesión', async () => {
        guardarSesion({ token: 't', expiraEnMs: 60000, usuario: { id: 1, nombre: 'Ana', apodo: 'ana', rol: 'USUARIO' } });
        const logout = spyOn(authService, 'logout').and.resolveTo();
        const c = await montarConApp(<Navbar />);
        expect(texto(c)).toContain('ana');
        expect(texto(c)).not.toContain('Administración');
        await clic(Array.from(c.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cerrar sesión'));
        expect(logout).toHaveBeenCalled();
    });

    it('muestra la opción de administración solo al superusuario', async () => {
        guardarSesion({ token: 't', expiraEnMs: 60000, usuario: { id: 2, nombre: 'Admin', apodo: 'admin', rol: 'SUPERUSUARIO' } });
        const c = await montarConApp(<Navbar />);
        expect(texto(c)).toContain('Administración');
    });

    it('el botón hamburguesa abre y cierra el menú colapsable', async () => {
        const c = await montarConApp(<Navbar />);
        const toggler = c.querySelector('.navbar-toggler');
        expect(c.querySelector('.navbar-collapse').classList.contains('show')).toBe(false);
        await clic(toggler);
        expect(c.querySelector('.navbar-collapse').classList.contains('show')).toBe(true);
        expect(toggler.getAttribute('aria-expanded')).toBe('true');
    });

    it('abre el modal de acceso al pulsar "Iniciar sesión"', async () => {
        const c = await montarConApp(<Navbar />);
        await clic(Array.from(c.querySelectorAll('button')).find(b => b.textContent === 'Iniciar sesión'));
        expect(document.querySelector('[role=dialog]')).not.toBeNull();
    });
});

describe('HomePage (integración con la base simulada)', () => {
    beforeEach(() => { localStorage.clear(); config.usarMock = true; bd.configurarPersistencia(false); bd.reiniciar(); });
    afterEach(async () => { await desmontarTodo(); config.usarMock = false; });

    it('carga y muestra las publicaciones y el total', async () => {
        const c = await montarConApp(<HomePage />);
        await esperar(20);
        expect(c.querySelectorAll('[data-testid=publication-card]').length).toBe(8);
        expect(c.querySelector('[data-testid=resumen]').textContent).toBe('8 resultados');
    });

    it('filtra al aplicar el texto de búsqueda', async () => {
        const c = await montarConApp(<HomePage />);
        await esperar(20);
        await escribir(c.querySelector('#filtroTexto'), 'sofá');
        await enviarFormulario(c.querySelector('form[aria-label="Filtros del catálogo"]'));
        await esperar(20);
        expect(c.querySelectorAll('[data-testid=publication-card]').length).toBe(1);
        expect(c.querySelector('[data-testid=resumen]').textContent).toBe('1 resultado');
    });

    it('un invitado que pulsa "Publicar" ve el modal de inicio de sesión', async () => {
        const c = await montarConApp(<HomePage />);
        await esperar(20);
        await clic(Array.from(c.querySelectorAll('button')).find(b => b.textContent.includes('Publicar artículo')));
        expect(document.querySelector('[role=dialog]').getAttribute('aria-label')).toBe('Iniciar sesión');
    });
});

describe('Funciones puras de páginas', () => {
    it('normalizarMensajes marca los propios y conserva el tipo de oferta', () => {
        const r = normalizarMensajes([
            { id: 1, remitenteId: 5, tipo: 'TEXTO', contenido: 'Hola', fechaEnvio: 'x', leido: true },
            { id: 2, remitenteId: 9, tipo: 'OFERTA', monto: 100, estadoOferta: 'PENDIENTE', fechaEnvio: 'y' },
        ], 5);
        expect(r[0].mio).toBe(true);
        expect(r[1].mio).toBe(false);
        expect(r[1].monto).toBe(100);
    });

    it('filtrarConversaciones filtra por rol y por texto', () => {
        const lista = [
            { id: 1, rol: 'COMPRADOR', publicacionTitulo: 'Bicicleta', interlocutorApodo: 'ana' },
            { id: 2, rol: 'VENDEDOR', publicacionTitulo: 'Mesa', interlocutorApodo: 'luis' },
        ];
        expect(filtrarConversaciones(lista, 'COMPRANDO', '').map(c => c.id)).toEqual([1]);
        expect(filtrarConversaciones(lista, 'TODAS', 'LUIS').map(c => c.id)).toEqual([2]);
    });

    it('filtrarPor busca sin distinguir mayúsculas en los campos indicados', () => {
        const filas = [{ nombre: 'Ana', correo: 'a@x.cl' }, { nombre: 'Luis', correo: 'l@x.cl' }];
        expect(filtrarPor(filas, 'ANA', ['nombre']).length).toBe(1);
        expect(filtrarPor(filas, '', ['nombre']).length).toBe(2);
    });
});
