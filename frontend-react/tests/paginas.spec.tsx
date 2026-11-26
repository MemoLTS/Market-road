import { act } from 'react';
import App from '../src/App';
import RutaProtegida from '../src/components/layout/RutaProtegida';
import { config } from '../src/config';
import * as bd from '../src/data/baseDatos';
import { Route, Routes } from '../src/core/router';
import AdminPage from '../src/pages/AdminPage';
import { CategoriaPage, CategoriasPage } from '../src/pages/CategoriasPage';
import MensajesPage from '../src/pages/MensajesPage';
import PerfilPage from '../src/pages/PerfilPage';
import PublicationDetailPage, { contactarVendedor } from '../src/pages/PublicationDetailPage';
import SoportePage from '../src/pages/SoportePage';
import SoportePanelPage from '../src/pages/SoportePanelPage';
import { ContactoPage, NoEncontradaPage, NosotrosPage } from '../src/pages/StaticPages';
import { adminService } from '../src/services/adminService';
import { ApiError } from '../src/services/http';
import { authService } from '../src/services/authService';
import { mensajesService } from '../src/services/mensajesService';
import { guardarSesion } from '../src/services/sesion';
import { soportePanelService, soporteUsuarioService } from '../src/services/soporteService';
import { publicacionesService } from '../src/services/publicacionesService';
import { botonPorTexto, clic, desmontarTodo, enviarFormulario, escribir, esperar, montar, montarConApp, publicacionDePrueba, respuestaJson, texto } from './helpers';

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

    it('eliminar pide confirmación en una ventana de la página (sin cuadro nativo) y borra la publicación (DELETE)', async () => {
        sesion(demo);
        const nativo = spyOn(window, 'confirm');
        const c = await ruta(1);
        await esperar(30);
        await clic(botonPorTexto(c, 'Eliminar publicación'));
        expect(document.querySelector('.modal')?.textContent).toContain('¿Eliminar esta publicación?');
        expect(bd.obtenerPublicacion(1)).not.toBeNull();
        await clic(botonPorTexto(document.body, 'Sí, eliminar'));
        await esperar(30);
        expect(bd.obtenerPublicacion(1)).toBeNull();
        expect(nativo).not.toHaveBeenCalled();
    });

    it('no elimina si se cancela la confirmación', async () => {
        sesion(demo);
        const c = await ruta(1);
        await esperar(30);
        await clic(botonPorTexto(c, 'Eliminar publicación'));
        await clic(botonPorTexto(document.body, 'Cancelar'));
        expect(document.querySelector('.modal')).toBeNull();
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
        const deLaPublicacion = spyOn(mensajesService, 'deLaPublicacion');
        deLaPublicacion.and.resolveTo([{ id: 5 }] as never);
        const iniciar = spyOn(mensajesService, 'iniciar');
        expect(await contactarVendedor(1, 'Hola')).toBe(5);
        expect(iniciar).not.toHaveBeenCalled();
        deLaPublicacion.and.resolveTo([]);
        iniciar.and.resolveTo({ conversacion: { id: 11 } } as never);
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
        expect((c.querySelector('#ctNombre') as HTMLInputElement).value).toBe('');
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
    beforeEach(() => { preparar(); config.usarMock = false; sesion(demo); spyOn(mensajesService, 'listar').and.resolveTo([conversacion] as never); });
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
        spyOn(mensajesService, 'detalle').and.resolveTo(detalle as never);
        const enviarOferta = spyOn(mensajesService, 'enviarOferta').and.resolveTo(detalle as never);
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

    it('"Marcar como vendido" confirma dentro de la página (no pausa el navegador) y solo vende al aceptar', async () => {
        const comoVendedor = { ...detalle, conversacion: { ...detalle.conversacion, rol: 'VENDEDOR' } };
        spyOn(mensajesService, 'detalle').and.resolveTo(comoVendedor as never);
        const marcar = spyOn(mensajesService, 'marcarVendido').and.resolveTo(comoVendedor as never);
        const nativo = spyOn(window, 'confirm');
        window.location.hash = '#/mensajes/7';
        const c = await montarConApp(<Routes><Route path="/mensajes/:id" element={<MensajesPage />} /></Routes>);
        await esperar(40);
        await clic(botonPorTexto(c, 'Marcar como vendido'));
        expect(document.querySelector('.modal')?.textContent).toContain('¿Marcar como vendido a luis por');
        expect(marcar).not.toHaveBeenCalled();
        await clic(botonPorTexto(document.body, 'Cancelar'));
        expect(document.querySelector('.modal')).toBeNull();
        expect(marcar).not.toHaveBeenCalled();
        await clic(botonPorTexto(c, 'Marcar como vendido'));
        await clic(botonPorTexto(document.body, 'Sí, marcar como vendido'));
        await esperar(30);
        expect(marcar).toHaveBeenCalledWith(7);
        expect(nativo).not.toHaveBeenCalled();
    });

    it('rechaza una oferta con monto inválido sin llamar al servicio', async () => {
        spyOn(mensajesService, 'detalle').and.resolveTo(detalle as never);
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
        spyOn(mensajesService, 'detalle').and.resolveTo(detalle as never);
        const enviar = spyOn(mensajesService, 'enviarMensaje').and.resolveTo(detalle as never);
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
        spyOn(soporteUsuarioService, 'listar').and.resolveTo([ticket] as never);
        spyOn(soporteUsuarioService, 'categorias').and.resolveTo([{ codigo: 'CUENTA', nombre: 'Mi cuenta' }]);
        spyOn(soporteUsuarioService, 'detalle').and.resolveTo({
            ticket: { id: 3, asunto: 'No puedo entrar', categoriaNombre: 'Mi cuenta' }, puedeEscribir: true,
            mensajes: [{ id: 1, autorTipo: 'USUARIO', autorNombre: 'demo', contenido: 'No me deja ingresar', fecha: '2026-10-01T10:00:00Z' }],
        } as never);
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
        spyOn(soportePanelService, 'login').and.resolveTo({ token: 'p', expiraEnMs: 60000, personal } as never);
        spyOn(soportePanelService, 'tickets').and.resolveTo({ contenido: [{ id: 9, asunto: 'Error al publicar', estado: 'ABIERTO', estadoNombre: 'Abierto', prioridadNombre: 'Normal', usuarioApodo: 'demo', asignadoNombre: null, sinLeer: 0 }], totalPaginas: 1  } as never);
        const c = await montar(<SoportePanelPage />);
        await escribir(c.querySelector('#spCorreo'), 'sol@marketroad.cl');
        await escribir(c.querySelector('#spClave'), 'secreto123');
        await enviarFormulario(c.querySelector('form'));
        await esperar(50);
        expect(texto(c)).toContain('Panel de soporte');
        expect(texto(c)).toContain('#9 · Error al publicar');
    });
});

describe('SoportePanelPage (entrada con el token de usuario)', () => {
    const personal = { id: 7, nombre: 'admin', rol: 'ADMIN', rolNombre: 'Administración' };
    beforeEach(() => { preparar(); config.usarMock = false; });
    afterEach(limpiar);

    it('el superusuario entra solo, sin pedir correo ni contraseña', async () => {
        sesion(admin);
        const sso = spyOn(soportePanelService, 'entrarConUsuario').and.resolveTo({ token: 'p', expiraEnMs: 60000, personal } as never);
        spyOn(soportePanelService, 'tickets').and.resolveTo({ contenido: [], totalPaginas: 1 } as never);
        const c = await montar(<SoportePanelPage />);
        await esperar(60);
        expect(sso).toHaveBeenCalledTimes(1);
        expect(c.querySelector('#spCorreo')).toBeNull();
        expect(texto(c)).toContain('Panel de soporte');
        expect(texto(c)).toContain('Administración');
    });

    it('si la entrada automática falla, muestra el error y deja el acceso manual', async () => {
        sesion(admin);
        spyOn(soportePanelService, 'entrarConUsuario').and.rejectWith(new Error('Tu cuenta de soporte está desactivada'));
        const c = await montar(<SoportePanelPage />);
        await esperar(60);
        expect(c.querySelector('#spCorreo')).not.toBeNull();
        expect(c.querySelector('[role=alert]').textContent).toContain('desactivada');
    });

    it('si soporte no reconoce la sesión (401) no se muestra el texto engañoso de «sesión expirada»', async () => {
        sesion(admin);
        spyOn(soportePanelService, 'entrarConUsuario').and.rejectWith(new ApiError('Tu sesión no es válida o expiró, inicia sesión nuevamente', 401));
        const c = await montar(<SoportePanelPage />);
        await esperar(60);
        expect(c.querySelector('[role=alert]').textContent).toBe('No se pudo entrar automáticamente al panel. Ingresa con una cuenta del equipo de soporte.');
        expect(c.querySelector('#spCorreo')).not.toBeNull();
    });

    it('una persona usuaria normal no intenta entrar sola', async () => {
        sesion(demo);
        const sso = spyOn(soportePanelService, 'entrarConUsuario');
        const c = await montar(<SoportePanelPage />);
        await esperar(30);
        expect(sso).not.toHaveBeenCalled();
        expect(c.querySelector('#spCorreo')).not.toBeNull();
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
        expect(c.querySelectorAll('.stat-valor')[0].textContent).toBe('2');
        expect(c.querySelectorAll('.stat-valor')[1].textContent).toBe('8');
    });

    it('la pestaña Usuarios lista y filtra la tabla', async () => {
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await clic(Array.from(c.querySelectorAll('[role=tab]')).find(t => t.textContent === 'Usuarios'));
        expect(texto(c)).toContain('demo@marketroad.cl');
        await escribir(c.querySelector('input[aria-label=Filtrar]'), 'zzzz');
        expect(texto(c)).toContain('No hay usuarios.');
    });

    const abrirEdicion = async (c: HTMLElement, apodo: string) => {
        await clic(Array.from(c.querySelectorAll('[role=tab]')).find(t => t.textContent === 'Usuarios'));
        await clic(c.querySelector(`button[aria-label="Editar a ${apodo}"]`));
    };
    const formEditar = () => document.querySelector('form[aria-label="Editar usuario"]');
    const textoModal = () => document.querySelector('.modal')?.textContent ?? '';

    it('cada usuario tiene un botón Editar que abre la ventana con sus datos actuales y un único botón de guardado', async () => {
        sesion(admin);
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await abrirEdicion(c, 'demo');
        expect((document.querySelector('#adminNombre') as HTMLInputElement).value).toBe('Demo');
        expect((document.querySelector('#adminApellido') as HTMLInputElement).value).toBe('Usuario');
        expect((document.querySelector('#adminApodo') as HTMLInputElement).value).toBe('demo');
        expect((document.querySelector('#adminCorreo') as HTMLInputElement).value).toBe('demo@marketroad.cl');
        expect((document.querySelector('#adminCiudad') as HTMLInputElement).value).toBe('Concepción');
        expect(document.querySelectorAll('.modal button[type=submit]').length).toBe(1);
    });

    it('el superusuario edita nombre, apodo, correo y contraseña en una sola ventana y la lista se actualiza', async () => {
        sesion(admin);
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await abrirEdicion(c, 'demo');
        await escribir(document.querySelector('#adminNombre') as HTMLInputElement, 'Pedro');
        await escribir(document.querySelector('#adminApodo') as HTMLInputElement, 'pedro');
        await escribir(document.querySelector('#adminCorreo') as HTMLInputElement, 'pedro@marketroad.cl');
        await escribir(document.querySelector('#adminClaveNueva') as HTMLInputElement, 'Nueva1234');
        await escribir(document.querySelector('#adminClaveRepetir') as HTMLInputElement, 'Nueva1234');
        await enviarFormulario(formEditar());
        await esperar(60);
        expect(textoModal()).toContain('Datos de pedro actualizados.');
        const guardado = bd.listarUsuarios().find(u => u.id === 1);
        expect([guardado?.nombre, guardado?.apodo, guardado?.correo]).toEqual(['Pedro', 'pedro', 'pedro@marketroad.cl']);
        expect(bd.autenticar('pedro@marketroad.cl', 'Nueva1234').usuario.id).toBe(1);
        expect(texto(c)).toContain('pedro@marketroad.cl');
    });

    it('valida los datos antes de llamar al servicio (nombre, correo, contraseña, repetición y ciudad)', async () => {
        const actualizar = spyOn(adminService, 'actualizarUsuario').and.resolveTo({} as never);
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await abrirEdicion(c, 'demo');
        await escribir(document.querySelector('#adminCorreo') as HTMLInputElement, 'sin-arroba');
        await enviarFormulario(formEditar());
        expect(textoModal()).toContain('correo con formato válido');
        await escribir(document.querySelector('#adminCorreo') as HTMLInputElement, 'demo@marketroad.cl');
        await escribir(document.querySelector('#adminClaveNueva') as HTMLInputElement, 'corta');
        await enviarFormulario(formEditar());
        expect(textoModal()).toContain('entre 8 y 32');
        await escribir(document.querySelector('#adminClaveNueva') as HTMLInputElement, 'Nueva1234');
        await escribir(document.querySelector('#adminClaveRepetir') as HTMLInputElement, 'Otra12345');
        await enviarFormulario(formEditar());
        expect(textoModal()).toContain('no coinciden');
        await escribir(document.querySelector('#adminClaveNueva') as HTMLInputElement, '');
        await escribir(document.querySelector('#adminClaveRepetir') as HTMLInputElement, '');
        await escribir(document.querySelector('#adminCiudad') as HTMLInputElement, 'Lota');
        await enviarFormulario(formEditar());
        expect(textoModal()).toContain('Busca y elige la localidad del usuario');
        expect(actualizar).not.toHaveBeenCalled();
    });

    it('avisa cuando no hay cambios y muestra el error del servidor (por ejemplo, correo repetido)', async () => {
        sesion(admin);
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await abrirEdicion(c, 'demo');
        await enviarFormulario(formEditar());
        expect(textoModal()).toContain('No hay cambios para guardar.');
        await escribir(document.querySelector('#adminCorreo') as HTMLInputElement, 'admin@marketroad.cl');
        await enviarFormulario(formEditar());
        await esperar(30);
        expect(textoModal()).toContain('Ya existe un usuario registrado con ese correo');
    });

    it('el servicio (modo simulado) rechaza editar a otro superusuario con 403 y a un usuario inexistente con 404', async () => {
        sesion(demo); // la sesión es de la persona 1; el objetivo es el superusuario 2
        await expectAsync(adminService.actualizarUsuario(2, { nombre: 'Hack' })).toBeRejectedWithError(/otro superusuario/);
        sesion(admin);
        await expectAsync(adminService.actualizarUsuario(999, { nombre: 'Nadie' })).toBeRejectedWithError(/no existe/);
        const yo = await adminService.actualizarUsuario(2, { ciudad: 'Santiago, Chile' }); // el superusuario sí puede editar su propia cuenta
        expect(yo.ciudad).toBe('Santiago, Chile');
    });

    it('con el backend real envía PATCH /admin/usuarios/{id} solo con los campos cambiados', async () => {
        config.usarMock = false;
        sesion(admin);
        const espia = spyOn(window, 'fetch').and.resolveTo(respuestaJson({ id: 7, nombre: 'Ana', apellido: 'Paz', apodo: 'ana', correo: 'a@a.cl', ciudad: null }));
        await adminService.actualizarUsuario(7, { nombre: 'Ana', contrasena: 'Nueva1234' });
        const [url, opciones] = espia.calls.mostRecent().args as [string, RequestInit];
        expect(String(url)).toContain('/admin/usuarios/7');
        expect(opciones.method).toBe('PATCH');
        expect(JSON.parse(String(opciones.body))).toEqual({ nombre: 'Ana', contrasena: 'Nueva1234' });
    });

    it('el atajo del dashboard lleva a la pestaña Usuarios para editar', async () => {
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await clic(botonPorTexto(c, 'Editar usuarios'));
        expect(c.querySelector('button[aria-label="Editar a demo"]')).not.toBeNull();
    });

    const irAUsuarios = async (c: HTMLElement) => clic(Array.from(c.querySelectorAll('[role=tab]')).find(t => t.textContent === 'Usuarios'));
    /** Abre la ventana «Editar usuario»: ahí están Deshabilitar/Habilitar y Eliminar (abajo a la izquierda). */
    const abrirVentana = async (c: HTMLElement, apodo: string) => { await irAUsuarios(c); await clic(c.querySelector(`button[aria-label="Editar a ${apodo}"]`)); };

    it('deshabilitar un usuario pide confirmación, lo marca como Deshabilitada y retira sus publicaciones; Habilitar lo revierte', async () => {
        sesion(admin);
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await abrirVentana(c, 'demo');
        await clic(botonPorTexto(document.body, 'Deshabilitar usuario'));
        expect(textoModal()).toContain('Solo podrá entrar a soporte');
        await clic(botonPorTexto(document.body, 'Sí, deshabilitar'));
        await esperar(40);
        expect(texto(c)).toContain('Deshabilitada');
        expect(bd.listarUsuarios().find(u => u.id === 1)?.activo).toBeFalse();
        expect(bd.obtenerPublicacion(1)?.estado).toBe('DESHABILITADA');
        expect(bd.listarPublicaciones({ tamano: 100 }).contenido.some(p => p.usuarioId === 1)).toBeFalse();
        await abrirVentana(c, 'demo');
        await clic(botonPorTexto(document.body, 'Habilitar usuario'));
        await clic(botonPorTexto(document.body, 'Sí, habilitar'));
        await esperar(40);
        expect(bd.listarUsuarios().find(u => u.id === 1)?.activo).toBeTrue();
        expect(bd.obtenerPublicacion(1)?.estado).toBe('ACTIVA');
    });

    it('eliminar un usuario avisa que no podrá escribir ni a soporte y, al confirmar, desaparece junto con sus publicaciones', async () => {
        sesion(admin);
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await abrirVentana(c, 'demo');
        await clic(botonPorTexto(document.body, 'Eliminar usuario'));
        expect(textoModal()).toContain('dejará de existir');
        await clic(botonPorTexto(document.body, 'Cancelar'));
        expect(bd.listarUsuarios().some(u => u.id === 1)).toBeTrue();
        await abrirVentana(c, 'demo');
        await clic(botonPorTexto(document.body, 'Eliminar usuario'));
        await clic(botonPorTexto(document.body, 'Sí, eliminar usuario'));
        await esperar(40);
        expect(bd.listarUsuarios().some(u => u.id === 1)).toBeFalse();
        expect(c.querySelector('button[aria-label="Editar a demo"]')).toBeNull();
        expect(bd.obtenerPublicacion(1)).toBeNull();
    });

    it('Deshabilitar y Eliminar están en la ventana de edición, abajo a la izquierda y en paralelo a Guardar cambios; la tabla ya no los tiene', async () => {
        sesion(admin);
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await irAUsuarios(c);
        expect(botonPorTexto(c, 'Deshabilitar usuario')).toBeUndefined();
        expect(botonPorTexto(c, 'Eliminar usuario')).toBeUndefined();
        await clic(c.querySelector('button[aria-label="Editar a demo"]'));
        const pie = document.querySelector('form[aria-label="Editar usuario"] > div:last-child') as HTMLElement;
        const [izquierda, derecha] = Array.from(pie.children) as HTMLElement[];
        expect(Array.from(izquierda.querySelectorAll('button')).map(b => b.textContent)).toEqual(['Deshabilitar usuario', 'Eliminar usuario']);
        expect(Array.from(derecha.querySelectorAll('button')).map(b => b.textContent)).toEqual(['Cerrar', 'Guardar cambios']);
        expect(pie.classList.contains('justify-content-between')).toBeTrue();
    });

    it('en la ventana el botón cambia a «Habilitar usuario» si la cuenta ya está deshabilitada', async () => {
        sesion(admin);
        bd.cambiarEstadoUsuario(2, 1, false);
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await abrirVentana(c, 'demo');
        expect(botonPorTexto(document.body, 'Habilitar usuario')).toBeDefined();
        expect(botonPorTexto(document.body, 'Deshabilitar usuario')).toBeUndefined();
    });

    it('un superusuario no se puede deshabilitar ni eliminar (su ventana solo tiene Cerrar y Guardar cambios)', async () => {
        sesion(admin);
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await abrirVentana(c, 'admin');
        expect(botonPorTexto(document.body, 'Guardar cambios')).toBeDefined();
        expect(botonPorTexto(document.body, 'Deshabilitar usuario')).toBeUndefined();
        expect(botonPorTexto(document.body, 'Eliminar usuario')).toBeUndefined();
    });

    it('un error al deshabilitar se muestra en la página', async () => {
        sesion(admin);
        spyOn(adminService, 'cambiarEstadoUsuario').and.rejectWith(new Error('No se puede deshabilitar ni eliminar a un superusuario'));
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await abrirVentana(c, 'demo');
        await clic(botonPorTexto(document.body, 'Deshabilitar usuario'));
        await clic(botonPorTexto(document.body, 'Sí, deshabilitar'));
        await esperar(30);
        expect(texto(c)).toContain('No se puede deshabilitar ni eliminar a un superusuario');
    });

    it('el superusuario deshabilita y vuelve a habilitar una publicación desde la pestaña Publicaciones', async () => {
        sesion(admin);
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await clic(Array.from(c.querySelectorAll('[role=tab]')).find(t => t.textContent === 'Publicaciones'));
        await clic(Array.from(c.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === 'Deshabilitar la publicación Notebook Lenovo 14"'));
        expect(textoModal()).toContain('Sale del catálogo');
        await clic(botonPorTexto(document.body, 'Sí, deshabilitar'));
        await esperar(40);
        expect(bd.obtenerPublicacion(1)?.estado).toBe('DESHABILITADA');
        expect(bd.listarPublicaciones({ tamano: 100 }).contenido.some(p => p.id === 1)).toBeFalse();
        expect(texto(c)).toContain('DESHABILITADA');
        await clic(Array.from(c.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === 'Reactivar la publicación Notebook Lenovo 14"'));
        expect(textoModal()).toContain('Vuelve al catálogo');
        await clic(botonPorTexto(document.body, 'Sí, reactivar'));
        await esperar(40);
        expect(bd.obtenerPublicacion(1)?.estado).toBe('ACTIVA');
    });

    it('la pestaña Publicaciones muestra las 8 publicaciones', async () => {
        const c = await montarConApp(<AdminPage />);
        await esperar(40);
        await clic(Array.from(c.querySelectorAll('[role=tab]')).find(t => t.textContent === 'Publicaciones'));
        expect(c.querySelectorAll('tbody tr').length).toBe(8);
    });

    it('el dashboard incluye el apartado de actividad con nuevas y cerradas en ventas', async () => {
        const c = await montarConApp(<AdminPage />);
        await esperar(60);
        expect(c.querySelector('[data-testid="actividad-publicaciones"]')).not.toBeNull();
        expect(c.querySelector('[data-testid="pub-nuevas"]')).not.toBeNull();
        expect(c.querySelector('[data-testid="pub-cerradas"]')).not.toBeNull();
    });

    it('el listado muestra la venta cerrada (precio y fecha) solo de las publicaciones vendidas', async () => {
        const base = { id: 1, titulo: 'Bicicleta', precio: 150000, categoriaNombre: 'Deportes', unidades: 1, vendedorApodo: 'demo', fechaCreacion: '2026-10-01T10:00:00Z' };
        spyOn(adminService, 'publicaciones').and.resolveTo([
            { ...base, id: 1, estado: 'VENDIDA', precioVenta: 140000, fechaVenta: '2026-10-05T10:00:00Z' },
            { ...base, id: 2, titulo: 'Mesa', estado: 'ACTIVA', precioVenta: null, fechaVenta: null },
        ] as never);
        const c = await montarConApp(<AdminPage />);
        await esperar(60);
        await clic(Array.from(c.querySelectorAll('[role=tab]')).find(t => t.textContent === 'Publicaciones'));
        const filas = Array.from(c.querySelectorAll('tbody tr')).map(f => f.textContent);
        expect(filas.length).toBe(2);
        expect(filas[0]).toContain('140.000');
        expect(filas[1]).not.toContain('·');
    });
});

describe('PerfilPage (modo simulado)', () => {
    beforeEach(async () => { preparar(); await authService.login('demo@marketroad.cl', 'demo1234'); });
    afterEach(limpiar);

    it('muestra los datos y las publicaciones de la persona', async () => {
        const c = await montarConApp(<PerfilPage />);
        await esperar(40);
        expect((c.querySelector('#perfilApodo') as HTMLInputElement).value).toBe('demo');
        expect(c.querySelectorAll('[data-testid=publication-card]').length).toBe(4);
    });

    const form = (c: HTMLElement) => c.querySelector('form[aria-label="Datos del perfil"]');
    const buscarCiudad = async (c: HTMLElement, consulta: string) => {
        spyOn(window, 'fetch').and.resolveTo(respuestaJson([{ lat: '-37.09', lon: '-73.15', class: 'place', type: 'town', address: { town: 'Lota', state: 'Biobío', country: 'Chile' } }]));
        await escribir(c.querySelector('#perfilCiudad'), consulta);
        await clic(Array.from(c.querySelectorAll('button')).find(b => b.textContent === 'Buscar'));
        await esperar(1300);
    };

    it('tiene un único botón de guardado', async () => {
        const c = await montarConApp(<PerfilPage />);
        await esperar(40);
        const guardar = Array.from(c.querySelectorAll('button[type=submit]'));
        expect(guardar.length).toBe(1);
        expect(guardar[0].textContent).toBe('Guardar cambios');
        expect(c.querySelectorAll('form').length).toBe(1);
    });

    it('rechaza una ciudad escrita a mano: debe elegirse en la lista o el mapa (igual que en publicaciones)', async () => {
        const c = await montarConApp(<PerfilPage />);
        await esperar(40);
        await escribir(c.querySelector('#perfilCiudad'), 'Lota');
        await enviarFormulario(form(c));
        await esperar(30);
        expect(texto(c)).toContain('Busca y elige la localidad de tu perfil en la lista o márcala en el mapa.');
        expect(bd.listarUsuarios()[0].ciudad).toBe('Concepción');
    });

    it('guarda la ciudad elegida de la lista (estado → servicio)', async () => {
        const c = await montarConApp(<PerfilPage />);
        await esperar(40);
        await buscarCiudad(c, 'Lota');
        await clic(c.querySelector('ul[aria-label="Resultados de localidades"] button'));
        await enviarFormulario(form(c));
        await esperar(30);
        expect(texto(c)).toContain('Perfil actualizado correctamente.');
        expect(bd.listarUsuarios()[0].ciudad).toBe('Lota, Biobío, Chile');
    });

    it('guardar con la ciudad sin tocar no exige buscarla de nuevo', async () => {
        const c = await montarConApp(<PerfilPage />);
        await esperar(40);
        await escribir(c.querySelector('#perfilApodo'), 'demo2');
        await enviarFormulario(form(c));
        await esperar(30);
        expect(texto(c)).toContain('Perfil actualizado correctamente.');
        expect(bd.listarUsuarios()[0].apodo).toBe('demo2');
        expect(bd.listarUsuarios()[0].ciudad).toBe('Concepción');
    });

    it('avisa cuando no hay cambios y valida el apodo', async () => {
        const c = await montarConApp(<PerfilPage />);
        await esperar(40);
        await enviarFormulario(form(c));
        expect(texto(c)).toContain('No hay cambios para guardar.');
        await escribir(c.querySelector('#perfilApodo'), 'a');
        await enviarFormulario(form(c));
        expect(c.querySelector('.alert-danger')).not.toBeNull();
    });
});

describe('PerfilPage (backend real): un solo guardado para datos, correo y foto', () => {
    beforeEach(async () => { preparar(); config.usarMock = false; sesion(demo); });
    afterEach(limpiar);

    it('guarda datos y correo con el mismo botón, sin enviar nada que no cambió', async () => {
        const actualizar = spyOn(authService, 'actualizarPerfil').and.resolveTo({} as never);
        const correo = spyOn(authService, 'cambiarCorreo').and.resolveTo({} as never);
        const subir = spyOn(authService, 'subirFoto').and.resolveTo(undefined as never);
        spyOn(authService, 'dispositivos').and.resolveTo([]);
        spyOn(publicacionesService, 'mias').and.resolveTo([] as never);
        const c = await montarConApp(<PerfilPage />);
        await esperar(40);
        expect(c.querySelectorAll('button[type=submit]').length).toBe(1);
        await escribir(c.querySelector('#perfilApodo'), 'nuevoApodo');
        await escribir(c.querySelector('#nuevoCorreo'), 'otro@correo.cl');
        await escribir(c.querySelector('#claveActual'), 'demo1234');
        await enviarFormulario(c.querySelector('form[aria-label="Datos del perfil"]'));
        await esperar(30);
        expect(actualizar).toHaveBeenCalledWith({ apodo: 'nuevoApodo' });
        expect(correo).toHaveBeenCalledWith('otro@correo.cl', 'demo1234');
        expect(subir).not.toHaveBeenCalled();
        expect(texto(c)).toContain('Perfil actualizado correctamente.');
    });

    it('cambia también la contraseña con el mismo botón (pide la actual, valida la nueva y su repetición)', async () => {
        const clave = spyOn(authService, 'cambiarContrasena').and.resolveTo(undefined as never);
        spyOn(authService, 'dispositivos').and.resolveTo([]);
        spyOn(publicacionesService, 'mias').and.resolveTo([] as never);
        const c = await montarConApp(<PerfilPage />);
        await esperar(40);
        const f = () => c.querySelector('form[aria-label="Datos del perfil"]');
        expect(c.querySelectorAll('button[type=submit]').length).toBe(1);
        await escribir(c.querySelector('#perfilClaveNueva'), 'Nueva1234');
        await enviarFormulario(f());
        expect(texto(c)).toContain('Ingresa tu contraseña actual para cambiar la contraseña');
        await escribir(c.querySelector('#perfilClaveActual'), 'demo1234');
        await escribir(c.querySelector('#perfilClaveRepetir'), 'Otra12345');
        await enviarFormulario(f());
        expect(texto(c)).toContain('no coinciden');
        await escribir(c.querySelector('#perfilClaveRepetir'), 'Nueva1234');
        await enviarFormulario(f());
        await esperar(30);
        expect(clave).toHaveBeenCalledOnceWith('demo1234', 'Nueva1234');
        expect(texto(c)).toContain('Perfil actualizado correctamente.');
        expect((c.querySelector('#perfilClaveNueva') as HTMLInputElement).value).toBe('');
    });

    it('para cambiar el correo exige la contraseña actual', async () => {
        const correo = spyOn(authService, 'cambiarCorreo').and.resolveTo({} as never);
        spyOn(authService, 'dispositivos').and.resolveTo([]);
        spyOn(publicacionesService, 'mias').and.resolveTo([] as never);
        const c = await montarConApp(<PerfilPage />);
        await esperar(40);
        await escribir(c.querySelector('#nuevoCorreo'), 'otro@correo.cl');
        await enviarFormulario(c.querySelector('form[aria-label="Datos del perfil"]'));
        expect(texto(c)).toContain('Ingresa tu contraseña actual');
        expect(correo).not.toHaveBeenCalled();
    });

    it('si falla una parte, muestra el error del servidor', async () => {
        spyOn(authService, 'actualizarPerfil').and.rejectWith(new Error('El apodo ya está en uso'));
        spyOn(authService, 'dispositivos').and.resolveTo([]);
        spyOn(publicacionesService, 'mias').and.resolveTo([] as never);
        const c = await montarConApp(<PerfilPage />);
        await esperar(40);
        await escribir(c.querySelector('#perfilApodo'), 'ocupado');
        await enviarFormulario(c.querySelector('form[aria-label="Datos del perfil"]'));
        await esperar(30);
        expect(texto(c)).toContain('El apodo ya está en uso');
    });
});

describe('Primer mensaje al vendedor (ventana emergente con autocompletado)', () => {
    beforeEach(() => { preparar(); config.usarMock = false; sesion(demo); });
    afterEach(limpiar);
    const ruta = () => { window.location.hash = '#/publicaciones/9'; return montarConApp(<Routes><Route path="/publicaciones/:id" element={<PublicationDetailPage />} /><Route path="/mensajes/:id" element={<p>Chat abierto</p>} /></Routes>); };
    const ventana = () => document.querySelector('form[aria-label="Primer mensaje al vendedor"]');

    beforeEach(() => { spyOn(publicacionesService, 'obtener').and.resolveTo(publicacionDePrueba({ id: 9, usuarioId: 5, vendedorApodo: 'vendedor' })); });

    it('«Enviar mensaje» abre la ventana con mensajes predeterminados', async () => {
        spyOn(mensajesService, 'deLaPublicacion').and.resolveTo([]);
        const c = await ruta();
        await esperar(40);
        expect(ventana()).toBeNull();
        await clic(botonPorTexto(c, 'Enviar mensaje'));
        expect(ventana()).not.toBeNull();
        const chips = Array.from(document.querySelectorAll('[aria-label="Mensajes predeterminados"] button')).map(b => b.textContent);
        expect(chips).toContain('Hola, ¿sigue disponible?');
        expect(chips.length).toBeGreaterThan(3);
    });

    it('el autocompletado filtra al escribir y elegir una sugerencia rellena el mensaje', async () => {
        spyOn(mensajesService, 'deLaPublicacion').and.resolveTo([]);
        const c = await ruta();
        await esperar(40);
        await clic(botonPorTexto(c, 'Enviar mensaje'));
        const campo = document.querySelector('#primerMensaje') as HTMLTextAreaElement;
        await act(async () => { campo.focus(); });
        await escribir(campo, 'juntar');
        const opciones = Array.from(document.querySelectorAll('[role=listbox] [role=option]'));
        expect(opciones.length).toBe(1);
        expect(opciones[0].textContent).toContain('juntarnos');
        await act(async () => { opciones[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); });
        expect(campo.value).toBe(opciones[0].textContent as string);
        expect(document.querySelector('[role=listbox]')).toBeNull();
    });

    it('al enviar el primer mensaje crea la conversación, la ventana desaparece y se abre el chat', async () => {
        spyOn(mensajesService, 'deLaPublicacion').and.resolveTo([]);
        const iniciar = spyOn(mensajesService, 'iniciar').and.resolveTo({ conversacion: { id: 11 } } as never);
        const c = await ruta();
        await esperar(40);
        await clic(botonPorTexto(c, 'Enviar mensaje'));
        await clic(document.querySelector('[aria-label="Mensajes predeterminados"] button'));
        await enviarFormulario(ventana());
        await esperar(40);
        expect(iniciar).toHaveBeenCalledWith(9, 'Hola, ¿sigue disponible?');
        expect(ventana()).toBeNull();
        expect(window.location.hash).toBe('#/mensajes/11');
    });

    it('no envía un mensaje vacío y muestra el error del servidor si falla', async () => {
        spyOn(mensajesService, 'deLaPublicacion').and.resolveTo([]);
        const iniciar = spyOn(mensajesService, 'iniciar').and.rejectWith(new Error('Estás enviando mensajes muy rápido'));
        const c = await ruta();
        await esperar(40);
        await clic(botonPorTexto(c, 'Enviar mensaje'));
        await enviarFormulario(ventana());
        expect(document.querySelector('.modal [role=alert]')).not.toBeNull();
        expect(iniciar).not.toHaveBeenCalled();
        await escribir(document.querySelector('#primerMensaje') as HTMLTextAreaElement, 'Hola');
        await enviarFormulario(ventana());
        await esperar(30);
        expect(document.querySelector('.modal')?.textContent).toContain('Estás enviando mensajes muy rápido');
    });

    it('si ya hay una conversación con el vendedor, la ventana deja de ofrecerse', async () => {
        spyOn(mensajesService, 'deLaPublicacion').and.resolveTo([{ id: 5 }] as never);
        const c = await ruta();
        await esperar(40);
        expect(botonPorTexto(c, 'Enviar mensaje')).toBeUndefined();
        const enlace = Array.from(c.querySelectorAll('a')).find(a => a.textContent?.includes('ver conversación'));
        expect(enlace?.getAttribute('href')).toBe('#/mensajes/5');
        expect(ventana()).toBeNull();
    });
});

describe('Chat: autocompletado con los mensajes predeterminados', () => {
    beforeEach(() => { preparar(); config.usarMock = false; sesion(demo); });
    afterEach(limpiar);

    it('al escribir sugiere respuestas rápidas y al elegir una la coloca en la caja', async () => {
        const detalle = { conversacion: { id: 7, publicacionId: 1, tituloPublicacion: 'Bicicleta', rol: 'COMPRADOR', estado: 'ABIERTA', otroUsuarioApodo: 'vende' }, mensajes: [] };
        spyOn(mensajesService, 'detalle').and.resolveTo(detalle as never);
        spyOn(mensajesService, 'listar').and.resolveTo([] as never);
        window.location.hash = '#/mensajes/7';
        const c = await montarConApp(<Routes><Route path="/mensajes/:id" element={<MensajesPage />} /></Routes>);
        await esperar(40);
        const campo = c.querySelector('textarea[aria-label=Mensaje]') as HTMLTextAreaElement;
        await act(async () => { campo.focus(); });
        await escribir(campo, 'oferta');
        const opcion = c.querySelector('[role=listbox] [role=option]') as HTMLElement;
        expect(opcion.textContent).toBe('¿Aceptas una oferta?');
        await act(async () => { opcion.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); });
        expect(campo.value).toBe('¿Aceptas una oferta?');
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
