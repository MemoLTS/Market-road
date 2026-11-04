import App from '../src/App.jsx';
import RutaProtegida from '../src/components/layout/RutaProtegida.jsx';
import { config } from '../src/config.js';
import * as bd from '../src/data/baseDatos.js';
import { Route, Routes } from '../src/core/router.jsx';
import AdminPage from '../src/pages/AdminPage.jsx';
import { CategoriaPage, CategoriasPage } from '../src/pages/CategoriasPage.jsx';
import MensajesPage from '../src/pages/MensajesPage.jsx';
import PerfilPage from '../src/pages/PerfilPage.jsx';
import PublicationDetailPage, { contactarVendedor } from '../src/pages/PublicationDetailPage.jsx';
import SoportePage from '../src/pages/SoportePage.jsx';
import SoportePanelPage from '../src/pages/SoportePanelPage.jsx';
import { ContactoPage, NoEncontradaPage, NosotrosPage } from '../src/pages/StaticPages.jsx';
import { authService } from '../src/services/authService.js';
import { mensajesService } from '../src/services/mensajesService.js';
import { guardarSesion } from '../src/services/sesion.js';
import { soportePanelService, soporteUsuarioService } from '../src/services/soporteService.js';
import { botonPorTexto, clic, desmontarTodo, enviarFormulario, escribir, esperar, montar, montarConApp, texto } from './helpers.jsx';

const demo = { id: 1, nombre: 'Demo', apellido: 'Usuario', apodo: 'demo', correo: 'demo@marketroad.cl', ciudad: 'Concepción', rol: 'USUARIO' };
const admin = { id: 2, nombre: 'Admin', apellido: 'Market', apodo: 'admin', correo: 'admin@marketroad.cl', rol: 'SUPERUSUARIO' };
const sesion = usuario => guardarSesion({ token: 't', expiraEnMs: 600000, usuario });

function preparar() {
    localStorage.clear(); sessionStorage.clear();
    config.usarMock = true;
    bd.configurarPersistencia(false);
    bd.reiniciar();
    window.location.hash = '#/';
}
async function limpiar() {
    await desmontarTodo();
    config.usarMock = false;
    localStorage.clear(); sessionStorage.clear();
    window.location.hash = '#/';
}

describe('PublicationDetailPage', () => {
    beforeEach(preparar);
    afterEach(limpiar);
    const ruta = id => { window.location.hash = `#/publicaciones/${id}`; return montarConApp(<Routes><Route path="/publicaciones/:id" element={<PublicationDetailPage />} /></Routes>); };

    it('muestra título, precio y datos de la publicación según el id de la ruta', async () => {
        const c = await ruta(2);
        await esperar(30);
        expect(texto(c)).toContain('Bicicleta aro 29');
        expect(texto(c)).toContain('$150.000');
        expect(texto(c)).toContain('Talcahuano, Biobío');
    });

    it('informa cuando la publicación no existe', async () => {
        const c = await ruta(999);
        await esperar(30);
        expect(c.querySelector('[role=alert]').textContent).toBe('La publicación no existe.');
    });

    it('un invitado debe iniciar sesión para contactar al vendedor', async () => {
        const c = await ruta(3);
        await esperar(30);
        expect(botonPorTexto(c, 'Inicia sesión para contactar')).toBeDefined();
    });

    it('la persona dueña ve las acciones Editar y Eliminar, y no el formulario de contacto', async () => {
        sesion(demo);
        const c = await ruta(1);
        await esperar(30);
        expect(botonPorTexto(c, 'Editar')).toBeDefined();
        expect(botonPorTexto(c, 'Eliminar publicación')).toBeDefined();
        expect(c.querySelector('form[aria-label="Contactar al vendedor"]')).toBeNull();
    });

    it('eliminar pide confirmación y borra la publicación (DELETE)', async () => {
        sesion(demo);
        spyOn(window, 'confirm').and.returnValue(true);
        const c = await ruta(1);
        await esperar(30);
        await clic(botonPorTexto(c, 'Eliminar publicación'));
        await esperar(30);
        expect(bd.obtenerPublicacion(1)).toBeNull();
    });

    it('no elimina si se cancela la confirmación', async () => {
        sesion(demo);
        spyOn(window, 'confirm').and.returnValue(false);
        const c = await ruta(1);
        await esperar(30);
        await clic(botonPorTexto(c, 'Eliminar publicación'));
        expect(bd.obtenerPublicacion(1)).not.toBeNull();
    });

    it('editar (UPDATE) guarda los cambios del formulario', async () => {
        sesion(demo);
        const c = await ruta(1);
        await esperar(30);
        await clic(botonPorTexto(c, 'Editar'));
        await escribir(document.querySelector('#pubTitulo'), 'Notebook Lenovo 15');
        await enviarFormulario(document.querySelector('form[aria-label="Editar publicación"]'));
        await esperar(30);
        expect(bd.obtenerPublicacion(1).titulo).toBe('Notebook Lenovo 15');
    });

    it('contactarVendedor reutiliza la conversación existente o crea una nueva (mocks)', async () => {
        spyOn(mensajesService, 'deLaPublicacion').and.resolveTo([{ id: 5 }]);
        const iniciar = spyOn(mensajesService, 'iniciar');
        expect(await contactarVendedor(1, 'Hola')).toBe(5);
        expect(iniciar).not.toHaveBeenCalled();
        mensajesService.deLaPublicacion.and.resolveTo([]);
        iniciar.and.resolveTo({ conversacion: { id: 11 } });
        expect(await contactarVendedor(1, 'Hola')).toBe(11);
        expect(iniciar).toHaveBeenCalledWith(1, 'Hola');
    });
});

describe('Categorías y páginas estáticas', () => {
    beforeEach(preparar);
    afterEach(limpiar);

    it('el índice muestra una tarjeta por categoría con enlace a su listado', async () => {
        const c = await montarConApp(<CategoriasPage />);
        await esperar(30);
        const enlaces = c.querySelectorAll('a.card');
        expect(enlaces.length).toBe(10);
        expect(enlaces[0].getAttribute('href')).toBe('#/categorias/ELECTRONICA');
    });

    it('la vista de una categoría lista solo sus publicaciones', async () => {
        window.location.hash = '#/categorias/HOGAR';
        const c = await montarConApp(<Routes><Route path="/categorias/:codigo" element={<CategoriaPage />} /></Routes>);
        await esperar(50);
        expect(c.querySelectorAll('[data-testid=publication-card]').length).toBe(1);
        expect(texto(c)).toContain('Hogar y jardín');
        expect(texto(c)).toContain('Sofá de tres cuerpos');
    });

    it('Contacto valida los campos y confirma el envío', async () => {
        const c = await montarConApp(<ContactoPage />);
        await enviarFormulario(c.querySelector('form'));
        expect(c.querySelector('.alert-danger')).not.toBeNull();
        await escribir(c.querySelector('#ctNombre'), 'Luis Soto');
        await escribir(c.querySelector('#ctCorreo'), 'luis@correo.cl');
        await escribir(c.querySelector('#ctMensaje'), 'Quisiera más información');
        await enviarFormulario(c.querySelector('form'));
        expect(c.querySelector('.alert-success').textContent).toContain('Gracias');
        expect(c.querySelector('#ctNombre').value).toBe('');
    });

    it('Nosotros y la página 404 muestran su contenido', async () => {
        expect(texto(await montarConApp(<NosotrosPage />))).toContain('Sobre Market-Road');
        expect(texto(await montarConApp(<NoEncontradaPage />))).toContain('La página que buscas no existe.');
    });
});

describe('RutaProtegida', () => {
    beforeEach(preparar);
    afterEach(limpiar);

    it('sin sesión oculta el contenido y abre el modal de acceso', async () => {
        const c = await montarConApp(<RutaProtegida><p>secreto</p></RutaProtegida>);
        await esperar(30);
        expect(texto(c)).not.toContain('secreto');
        expect(document.querySelector('[role=dialog]')).not.toBeNull();
    });

    it('con sesión muestra el contenido', async () => {
        sesion(demo);
        const c = await montarConApp(<RutaProtegida><p>secreto</p></RutaProtegida>);
        expect(texto(c)).toContain('secreto');
    });

    it('la variante admin rechaza a una persona sin el rol de superusuario', async () => {
        sesion(demo);
        const c = await montarConApp(<RutaProtegida admin><p>solo admin</p></RutaProtegida>);
        expect(texto(c)).not.toContain('solo admin');
    });

    it('la variante admin deja pasar al superusuario', async () => {
        sesion(admin);
        const c = await montarConApp(<RutaProtegida admin><p>solo admin</p></RutaProtegida>);
        expect(texto(c)).toContain('solo admin');
    });
});

describe('MensajesPage (con servicios simulados)', () => {
    const conversacion = { id: 7, rol: 'COMPRADOR', publicacionTitulo: 'Bicicleta', interlocutorApodo: 'luis', noLeidos: 2, ultimoMensaje: 'Hola', imagenUrl: null };
    const detalle = {
        conversacion: { id: 7, rol: 'COMPRADOR', publicacionId: 1, publicacionTitulo: 'Bicicleta', publicacionPrecio: 150000, montoAcordado: null, publicacionEstado: 'ACTIVA', interlocutorApodo: 'luis' },
        mensajes: [{ id: 1, remitenteId: 2, tipo: 'TEXTO', contenido: 'Hola, sigue disponible', fechaEnvio: '2026-10-01T10:00:00Z', leido: true }],
    };
    beforeEach(() => { preparar(); config.usarMock = false; sesion(demo); spyOn(mensajesService, 'listar').and.resolveTo([conversacion]); });
    afterEach(limpiar);

    it('lista las conversaciones con su contador de no leídos', async () => {
        const c = await montarConApp(<MensajesPage />);
        await esperar(30);
        expect(texto(c)).toContain('Bicicleta');
        expect(c.querySelector('.badge.text-bg-danger').textContent).toBe('2');
    });

    it('el filtro "Vendiendo" oculta las conversaciones donde compro', async () => {
        const c = await montarConApp(<MensajesPage />);
        await esperar(30);
        await clic(botonPorTexto(c, 'Vendiendo'));
        expect(texto(c)).toContain('No hay conversaciones.');
    });

    it('abre una conversación, muestra los mensajes y permite enviar una oferta', async () => {
        spyOn(mensajesService, 'detalle').and.resolveTo(detalle);
        const enviarOferta = spyOn(mensajesService, 'enviarOferta').and.resolveTo(detalle);
        window.location.hash = '#/mensajes/7';
        const c = await montarConApp(<Routes><Route path="/mensajes/:id" element={<MensajesPage />} /></Routes>);
        await esperar(40);
        expect(texto(c)).toContain('Hola, sigue disponible');
        await clic(botonPorTexto(c, 'Hacer oferta'));
        await escribir(c.querySelector('input[aria-label="Monto de la oferta"]'), '120000');
        await enviarFormulario(c.querySelector('form[aria-label="Enviar oferta"]'));
        await esperar(30);
        expect(enviarOferta).toHaveBeenCalledWith(7, 120000);
    });

    it('rechaza una oferta con monto inválido sin llamar al servicio', async () => {
        spyOn(mensajesService, 'detalle').and.resolveTo(detalle);
        const enviarOferta = spyOn(mensajesService, 'enviarOferta');
        window.location.hash = '#/mensajes/7';
        const c = await montarConApp(<Routes><Route path="/mensajes/:id" element={<MensajesPage />} /></Routes>);
        await esperar(40);
        await clic(botonPorTexto(c, 'Hacer oferta'));
        await escribir(c.querySelector('input[aria-label="Monto de la oferta"]'), 'abc');
        await enviarFormulario(c.querySelector('form[aria-label="Enviar oferta"]'));
        expect(c.querySelector('[role=alert]')).not.toBeNull();
        expect(enviarOferta).not.toHaveBeenCalled();
    });

    it('envía un mensaje de texto a través del servicio', async () => {
        spyOn(mensajesService, 'detalle').and.resolveTo(detalle);
        const enviar = spyOn(mensajesService, 'enviarMensaje').and.resolveTo(detalle);
        window.location.hash = '#/mensajes/7';
        const c = await montarConApp(<Routes><Route path="/mensajes/:id" element={<MensajesPage />} /></Routes>);
        await esperar(40);
        await escribir(c.querySelector('textarea[aria-label=Mensaje]'), 'Gracias');
        await enviarFormulario(c.querySelector('form[aria-label="Enviar mensaje"]'));
        await esperar(30);
        expect(enviar).toHaveBeenCalledWith(7, 'Gracias');
    });
});

describe('SoportePage (usuario)', () => {
    const ticket = { id: 3, asunto: 'No puedo entrar', estado: 'ABIERTO', estadoNombre: 'Abierto', noLeidos: 1, fechaActualizacion: '2026-10-01T10:00:00Z' };
    beforeEach(() => { preparar(); config.usarMock = false; });
    afterEach(limpiar);

    it('un invitado ve la invitación a iniciar sesión', async () => {
        const c = await montarConApp(<SoportePage />);
        expect(texto(c)).toContain('Inicia sesión para abrir un ticket');
    });

    it('lista los tickets y abre el detalle con su chat', async () => {
        sesion(demo);
        spyOn(soporteUsuarioService, 'listar').and.resolveTo([ticket]);
        spyOn(soporteUsuarioService, 'categorias').and.resolveTo([{ codigo: 'CUENTA', nombre: 'Mi cuenta' }]);
        spyOn(soporteUsuarioService, 'detalle').and.resolveTo({
            ticket: { id: 3, asunto: 'No puedo entrar', categoriaNombre: 'Mi cuenta' }, puedeEscribir: true,
            mensajes: [{ id: 1, autorTipo: 'USUARIO', autorNombre: 'demo', contenido: 'No me deja ingresar', fecha: '2026-10-01T10:00:00Z' }],
        });
        const c = await montarConApp(<SoportePage />);
        await esperar(30);
        expect(texto(c)).toContain('#3 · No puedo entrar');
        await clic(c.querySelector('.list-group-item'));
        await esperar(30);
        expect(texto(c)).toContain('No me deja ingresar');
        expect(botonPorTexto(c, 'Cerrar ticket')).toBeDefined();
    });

    it('valida el formulario de nuevo ticket antes de enviarlo', async () => {
        sesion(demo);
        spyOn(soporteUsuarioService, 'listar').and.resolveTo([]);
        spyOn(soporteUsuarioService, 'categorias').and.resolveTo([{ codigo: 'CUENTA', nombre: 'Mi cuenta' }]);
        const crear = spyOn(soporteUsuarioService, 'crear');
        const c = await montarConApp(<SoportePage />);
        await esperar(30);
        await clic(botonPorTexto(c, 'Nuevo ticket'));
        await enviarFormulario(document.querySelector('form[aria-label="Nuevo ticket"]'));
        expect(document.querySelector('form[aria-label="Nuevo ticket"] [role=alert]').textContent).toBe('Elige una categoría.');
        expect(crear).not.toHaveBeenCalled();
    });
});

describe('SoportePanelPage (personal)', () => {
    const personal = { id: 1, nombre: 'Sol', rol: 'SOPORTE', rolNombre: 'Soporte' };
    beforeEach(() => { preparar(); config.usarMock = false; });
    afterEach(limpiar);

    it('sin sesión muestra el acceso del personal y valida los campos', async () => {
        const c = await montar(<SoportePanelPage />);
        await enviarFormulario(c.querySelector('form'));
        expect(c.querySelector('[role=alert]').textContent).toBe('Ingresa tu correo y tu contraseña.');
    });

    it('al ingresar guarda la sesión del personal y muestra el panel con la lista', async () => {
        spyOn(soportePanelService, 'login').and.resolveTo({ token: 'p', expiraEnMs: 60000, personal });
        spyOn(soportePanelService, 'tickets').and.resolveTo({ contenido: [{ id: 9, asunto: 'Error al publicar', estado: 'ABIERTO', estadoNombre: 'Abierto', prioridadNombre: 'Normal', usuarioApodo: 'demo', asignadoNombre: null, sinLeer: 0 }], totalPaginas: 1 });
        const c = await montar(<SoportePanelPage />);
        await escribir(c.querySelector('#spCorreo'), 'sol@marketroad.cl');
        await escribir(c.querySelector('#spClave'), 'secreto123');
        await enviarFormulario(c.querySelector('form'));
        await esperar(50);
        expect(texto(c)).toContain('Panel de soporte');
        expect(texto(c)).toContain('#9 · Error al publicar');
    });
});

describe('AdminPage (modo simulado)', () => {
    beforeEach(preparar);
    afterEach(limpiar);

    it('el dashboard resume usuarios y publicaciones', async () => {
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        expect(texto(c)).toContain('Usuarios');
        expect(texto(c)).toContain('Publicaciones activas');
        expect(c.querySelectorAll('.display-6')[0].textContent).toBe('2');
        expect(c.querySelectorAll('.display-6')[1].textContent).toBe('8');
    });

    it('la pestaña Usuarios lista y filtra la tabla', async () => {
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await clic(Array.from(c.querySelectorAll('[role=tab]')).find(t => t.textContent === 'Usuarios'));
        expect(texto(c)).toContain('demo@marketroad.cl');
        await escribir(c.querySelector('input[aria-label=Filtrar]'), 'zzzz');
        expect(texto(c)).toContain('No hay usuarios.');
    });

    it('la pestaña Publicaciones muestra las 8 publicaciones', async () => {
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await clic(Array.from(c.querySelectorAll('[role=tab]')).find(t => t.textContent === 'Publicaciones'));
        expect(c.querySelectorAll('tbody tr').length).toBe(8);
    });
});

describe('PerfilPage (modo simulado)', () => {
    beforeEach(async () => { preparar(); await authService.login('demo@marketroad.cl', 'demo1234'); });
    afterEach(limpiar);

    it('muestra los datos y las publicaciones de la persona', async () => {
        const c = await montarConApp(<PerfilPage />);
        await esperar(40);
        expect(c.querySelector('#perfilApodo').value).toBe('demo');
        expect(c.querySelectorAll('[data-testid=publication-card]').length).toBe(4);
    });

    it('guarda los cambios de ciudad (estado → servicio)', async () => {
        const c = await montarConApp(<PerfilPage />);
        await esperar(40);
        await escribir(c.querySelector('#perfilCiudad'), 'Lota');
        await enviarFormulario(c.querySelector('form[aria-label="Datos del perfil"]'));
        await esperar(30);
        expect(texto(c)).toContain('Perfil actualizado correctamente.');
        expect(bd.listarUsuarios()[0].ciudad).toBe('Lota');
    });

    it('avisa cuando no hay cambios y valida el apodo', async () => {
        const c = await montarConApp(<PerfilPage />);
        await esperar(40);
        await enviarFormulario(c.querySelector('form[aria-label="Datos del perfil"]'));
        expect(texto(c)).toContain('No hay cambios para guardar.');
        await escribir(c.querySelector('#perfilApodo'), 'a');
        await enviarFormulario(c.querySelector('form[aria-label="Datos del perfil"]'));
        expect(c.querySelector('.alert-danger')).not.toBeNull();
    });
});

describe('App completa (navegación)', () => {
    beforeEach(preparar);
    afterEach(limpiar);

    it('renderiza el inicio con la barra de navegación y el catálogo', async () => {
        const c = await montar(<App />);
        await esperar(60);
        expect(c.querySelector('nav.navbar')).not.toBeNull();
        expect(c.querySelectorAll('[data-testid=publication-card]').length).toBe(8);
    });

    it('cambia de vista cuando cambia el hash de la URL', async () => {
        const c = await montar(<App />);
        await esperar(30);
        window.location.hash = '#/nosotros';
        await esperar(50);
        expect(texto(c)).toContain('Sobre Market-Road');
        window.location.hash = '#/ruta-inexistente';
        await esperar(50);
        expect(texto(c)).toContain('La página que buscas no existe.');
    });
});
