import { useState } from 'react';
import App from '../src/App';
import SelectorLocalidad from '../src/components/common/SelectorLocalidad';
import type { ValorLocalidad } from '../src/components/common/SelectorLocalidad';
import { validarLocalidad } from '../src/core/localidad';
import RutaProtegida from '../src/components/layout/RutaProtegida';
import CambiarContrasena from '../src/components/soporte/CambiarContrasena';
import { config } from '../src/config';
import * as bd from '../src/data/baseDatos';
import { VIGENCIA_DESTINO_MS, esDestinoValido, guardarDestino, olvidarDestino, tomarDestino } from '../src/core/destino';
import { urlAbsoluta } from '../src/services/http';
import { TicketAdminModal } from '../src/pages/AdminPage';
import { Equipo } from '../src/pages/SoportePanelPage';
import { adminService } from '../src/services/adminService';
import { soportePanelService } from '../src/services/soporteService';
import { clic, desmontarTodo, enviarFormulario, escribir, esperar, montar, montarConApp, respuestaJson, texto } from './helpers';

describe('direcciones de la aplicación: «volver a donde ibas»', () => {
    beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });

    it('solo acepta direcciones internas de la app', () => {
        expect(esDestinoValido('/perfil')).toBeTrue();
        expect(esDestinoValido('/mensajes/7')).toBeTrue();
        expect(esDestinoValido('//sitio-malicioso.com')).toBeFalse();
        expect(esDestinoValido('https://sitio-malicioso.com')).toBeFalse();
        expect(esDestinoValido('perfil')).toBeFalse();
        expect(esDestinoValido(42)).toBeFalse();
    });

    it('guarda un destino, lo entrega una sola vez y lo borra', () => {
        guardarDestino('/perfil');
        expect(tomarDestino()).toBe('/perfil');
        expect(tomarDestino()).toBeNull();
    });

    it('no guarda el inicio ni direcciones inválidas', () => {
        guardarDestino('/');
        guardarDestino('//otro');
        expect(tomarDestino()).toBeNull();
    });

    it('un destino vencido (más de 10 minutos) no se usa', () => {
        const ahora = Date.now();
        guardarDestino('/admin', ahora);
        expect(tomarDestino(ahora + VIGENCIA_DESTINO_MS + 1)).toBeNull();
    });

    it('datos corruptos en el almacenamiento se ignoran', () => {
        sessionStorage.setItem('mr_destino', '{no es json');
        expect(tomarDestino()).toBeNull();
        sessionStorage.setItem('mr_destino', JSON.stringify({ ruta: '//x', hasta: Date.now() + 1000 }));
        expect(tomarDestino()).toBeNull();
    });

    it('olvidarDestino borra el destino pendiente', () => {
        guardarDestino('/perfil');
        olvidarDestino();
        expect(tomarDestino()).toBeNull();
    });
});

describe('direcciones: página protegida y regreso tras iniciar sesión', () => {
    beforeEach(() => {
        localStorage.clear(); sessionStorage.clear(); config.usarMock = true;
        bd.configurarPersistencia(false); bd.reiniciar(); window.location.hash = '#/';
    });
    afterEach(async () => { await desmontarTodo(); window.location.hash = '#/'; });

    it('sin sesión, una ruta protegida guarda la dirección pedida y abre el ingreso', async () => {
        window.location.hash = '#/perfil';
        const c = await montar(<App />);
        await esperar(80);
        expect(window.location.hash).toBe('#/');
        expect(c.querySelector('form[aria-label="Iniciar sesión"], #loginCorreo')).not.toBeNull();
        expect(tomarDestino()).toBe('/perfil');
    });

    it('al iniciar sesión lleva a la página que se había pedido', async () => {
        window.location.hash = '#/perfil';
        const c = await montar(<App />);
        await esperar(80);
        await escribir(c.querySelector('#loginCorreo'), 'demo@marketroad.cl');
        await escribir(c.querySelector('#loginContrasena'), 'demo1234');
        await enviarFormulario(c.querySelector('form[aria-label="Iniciar sesión"]') ?? c.querySelector('#loginCorreo')?.closest('form'));
        await esperar(150);
        expect(window.location.hash).toBe('#/perfil');
        expect(texto(c)).toContain('Mi perfil');
    });

    it('cerrar el ingreso sin iniciar sesión cancela el regreso', async () => {
        window.location.hash = '#/perfil';
        const c = await montar(<App />);
        await esperar(80);
        await clic(c.querySelector('button.btn-close, [aria-label="Cerrar"]'));
        await esperar(40);
        expect(tomarDestino()).toBeNull();
    });

    it('un usuario sin rol de administración no se guarda como destino y vuelve al inicio', async () => {
        const c = await montarConApp(<RutaProtegida admin><p>secreto</p></RutaProtegida>);
        await esperar(40);
        expect(texto(c)).not.toContain('secreto');
    });
});

describe('direcciones de la API', () => {
    it('la dirección base de la API es absoluta y sin barra final', () => {
        expect(config.apiBaseUrl).toMatch(/^https?:\/\//);
        expect(config.apiBaseUrl.endsWith('/')).toBeFalse();
    });

    it('las rutas relativas de imágenes se completan con el origen de la API', () => {
        const origen = new URL(config.apiBaseUrl).origin;
        expect(urlAbsoluta('/api/v1/publicaciones/9/imagenes/0')).toBe(`${origen}/api/v1/publicaciones/9/imagenes/0`);
        expect(urlAbsoluta('https://otro.cl/x.png')).toBe('https://otro.cl/x.png');
    });
});

describe('validarLocalidad (misma regla en publicaciones y perfil)', () => {
    const lugar = { nombre: 'Concepción, Biobío, Chile', ubicacion: { lat: -36.82, lon: -73.04 } };

    it('vacío: error si es obligatoria y válido si es opcional', () => {
        expect(validarLocalidad('', null, { obligatoria: true })).toContain('Busca y elige la localidad');
        expect(validarLocalidad('  ', null, { obligatoria: false })).toBeNull();
    });

    it('un texto sin elegir de la lista ni del mapa se rechaza', () => {
        expect(validarLocalidad('Lota', null, { de: 'de tu perfil' })).toBe('Busca y elige la localidad de tu perfil en la lista o márcala en el mapa.');
    });

    it('un lugar elegido con coordenadas válidas se acepta y uno con coordenadas inválidas no', () => {
        expect(validarLocalidad(lugar.nombre, lugar)).toBeNull();
        expect(validarLocalidad(lugar.nombre, { ...lugar, ubicacion: { lat: 120, lon: 0 } })).toContain('coordenadas');
    });

    it('la localidad ya guardada se acepta mientras no se cambie', () => {
        expect(validarLocalidad('Concepción', null, { original: 'Concepción' })).toBeNull();
        expect(validarLocalidad('Concepcion', null, { original: 'Concepción' })).toContain('Busca y elige');
    });

    it('valida el largo (2 a 120 caracteres)', () => {
        expect(validarLocalidad('a', null)).toContain('entre 2 y 120');
        expect(validarLocalidad('a'.repeat(121), null)).toContain('entre 2 y 120');
    });
});

describe('SelectorLocalidad (búsqueda y elección de localidad)', () => {
    afterEach(desmontarTodo);
    const resultado = { lat: '-36.82', lon: '-73.04', class: 'place', type: 'city', address: { city: 'Concepción', state: 'Biobío', country: 'Chile' } };

    function Controlado({ inicial = '', original }: { inicial?: string; original?: string }) {
        const [valor, setValor] = useState<ValorLocalidad>({ ubicacion: inicial, lugar: null });
        return <><SelectorLocalidad id="locPrueba" valor={valor} original={original} onCambiar={setValor} /><output data-testid="valor">{valor.ubicacion}|{valor.lugar ? 'confirmada' : 'sin-confirmar'}</output></>;
    }
    const buscar = (c: HTMLElement) => clic(Array.from(c.querySelectorAll('button')).find(b => b.textContent === 'Buscar'));

    it('pide al menos 2 letras antes de buscar', async () => {
        const espia = spyOn(window, 'fetch');
        const c = await montar(<Controlado inicial="C" />);
        await buscar(c);
        expect(texto(c)).toContain('al menos 2 letras');
        expect(espia).not.toHaveBeenCalled();
    });

    it('muestra las localidades encontradas y al elegir una la confirma con sus coordenadas', async () => {
        spyOn(window, 'fetch').and.resolveTo(respuestaJson([resultado]));
        const c = await montar(<Controlado inicial="Concep" />);
        await buscar(c);
        await esperar(1300);
        const opcion = c.querySelector('ul[aria-label="Resultados de localidades"] button') as HTMLButtonElement;
        expect(opcion.textContent).toBe('Concepción, Biobío, Chile');
        await clic(opcion);
        expect(c.querySelector('[data-testid="valor"]')?.textContent).toBe('Concepción, Biobío, Chile|confirmada');
        expect(texto(c)).toContain('Localidad confirmada');
        expect(c.querySelector('ul[aria-label="Resultados de localidades"]')).toBeNull();
    });

    it('al volver a escribir se pierde la confirmación', async () => {
        spyOn(window, 'fetch').and.resolveTo(respuestaJson([resultado]));
        const c = await montar(<Controlado inicial="Concep" />);
        await buscar(c);
        await esperar(1300);
        await clic(c.querySelector('ul[aria-label="Resultados de localidades"] button'));
        await escribir(c.querySelector('#locPrueba'), 'Lota');
        expect(c.querySelector('[data-testid="valor"]')?.textContent).toBe('Lota|sin-confirmar');
    });

    it('avisa cuando no hay resultados', async () => {
        spyOn(window, 'fetch').and.resolveTo(respuestaJson([]));
        const c = await montar(<Controlado inicial="Zzzzz" />);
        await buscar(c);
        await esperar(1300);
        expect(texto(c)).toContain('No encontramos ciudades, pueblos o aldeas');
    });

    it('si el servicio falla muestra el error y deja seguir escribiendo', async () => {
        spyOn(window, 'fetch').and.resolveTo(respuestaJson({}, 500));
        const c = await montar(<Controlado inicial="Concep" />);
        await buscar(c);
        await esperar(1300);
        expect(texto(c)).toContain('No se pudo consultar el servicio de ubicaciones');
    });

    it('con una localidad ya guardada indica que está guardada', async () => {
        const c = await montar(<Controlado inicial="Concepción" original="Concepción" />);
        expect(texto(c)).toContain('Localidad guardada');
    });

    it('ofrece elegir en el mapa', async () => {
        const c = await montar(<Controlado />);
        const boton = Array.from(c.querySelectorAll('button')).find(b => b.textContent === 'Elegir en el mapa');
        expect(boton).toBeDefined();
    });
});

describe('CambiarContrasena (panel de soporte)', () => {
    afterEach(desmontarTodo);

    it('valida los tres campos y no llama al servidor si hay errores', async () => {
        const onCambiar = jasmine.createSpy('onCambiar').and.resolveTo();
        const c = await montar(<CambiarContrasena onCambiar={onCambiar} />);
        await enviarFormulario(c.querySelector('form'));
        expect(texto(c)).toContain('Ingresa tu contraseña actual.');
        await escribir(c.querySelector('#cpActual'), 'Vieja1234');
        await escribir(c.querySelector('#cpNueva'), 'Nueva1234');
        await escribir(c.querySelector('#cpRepetir'), 'Distinta1');
        await enviarFormulario(c.querySelector('form'));
        expect(texto(c)).toContain('no coinciden');
        expect(onCambiar).not.toHaveBeenCalled();
    });

    it('entrega la contraseña actual y la nueva y confirma', async () => {
        const onCambiar = jasmine.createSpy('onCambiar').and.resolveTo();
        const c = await montar(<CambiarContrasena onCambiar={onCambiar} />);
        await escribir(c.querySelector('#cpActual'), 'Vieja1234');
        await escribir(c.querySelector('#cpNueva'), 'Nueva1234');
        await escribir(c.querySelector('#cpRepetir'), 'Nueva1234');
        await enviarFormulario(c.querySelector('form'));
        await esperar(20);
        expect(onCambiar).toHaveBeenCalledWith('Vieja1234', 'Nueva1234');
        expect(texto(c)).toContain('Contraseña actualizada.');
        expect((c.querySelector('#cpActual') as HTMLInputElement).value).toBe('');
    });

    it('muestra el error del servidor (por ejemplo, contraseña actual incorrecta)', async () => {
        const onCambiar = jasmine.createSpy('onCambiar').and.rejectWith(new Error('La contraseña actual no es correcta'));
        const c = await montar(<CambiarContrasena onCambiar={onCambiar} />);
        await escribir(c.querySelector('#cpActual'), 'Mala12345');
        await escribir(c.querySelector('#cpNueva'), 'Nueva1234');
        await escribir(c.querySelector('#cpRepetir'), 'Nueva1234');
        await enviarFormulario(c.querySelector('form'));
        await esperar(20);
        expect(texto(c)).toContain('La contraseña actual no es correcta');
    });

    it('el servicio envía POST /soporte/panel/auth/contrasena con {actual, nueva}', async () => {
        const espia = spyOn(window, 'fetch').and.resolveTo(new Response(null, { status: 204 }));
        sessionStorage.setItem('mr_soporte_session', JSON.stringify({ token: 'P', expiraEnMs: 3600000, personal: { id: 1, nombre: 'Sol', rol: 'ADMIN' }, hasta: Date.now() + 3600000 }));
        await soportePanelService.cambiarContrasena('Vieja1234', 'Nueva1234').catch(() => undefined);
        const [url, opciones] = espia.calls.mostRecent().args as [string, RequestInit];
        expect(String(url)).toContain('/soporte/panel/auth/contrasena');
        expect(opciones.method).toBe('POST');
        expect(JSON.parse(String(opciones.body))).toEqual({ actual: 'Vieja1234', nueva: 'Nueva1234' });
    });
});

describe('Administración: detalle de ticket (solo lectura)', () => {
    afterEach(desmontarTodo);

    it('muestra los datos y los mensajes del ticket', async () => {
        spyOn(adminService, 'detalleTicket').and.resolveTo({
            ticket: { id: 9, asunto: 'Error al publicar', categoriaNombre: 'Publicaciones', estadoNombre: 'Abierto', prioridadNombre: 'Normal', usuarioApodo: 'demo', asignadoNombre: null },
            usuario: {}, puedeResponder: false, estadosPermitidos: [], puedeTomar: false,
            mensajes: [
                { id: 1, autorTipo: 'USUARIO', autorNombre: 'demo', contenido: 'No puedo subir fotos', fecha: '2026-10-01T10:00:00Z' },
                { id: 2, autorTipo: 'PERSONAL', autorNombre: 'Sol', contenido: 'Revisamos tu caso', fecha: '2026-10-01T11:00:00Z' },
            ],
        } as never);
        const c = await montarConApp(<TicketAdminModal id={9} onCerrar={() => undefined} />);
        await esperar(40);
        expect(texto(c)).toContain('Ticket #9');
        expect(c.querySelector('[data-testid="ticket-datos"]')?.textContent).toContain('sin asignar');
        expect(c.querySelectorAll('[data-testid="ticket-mensajes"] li').length).toBe(2);
        expect(texto(c)).toContain('Revisamos tu caso');
    });

    it('sin ticket seleccionado el modal no pide nada', async () => {
        const espia = spyOn(adminService, 'detalleTicket');
        await montarConApp(<TicketAdminModal id={null} onCerrar={() => undefined} />);
        await esperar(20);
        expect(espia).not.toHaveBeenCalled();
    });
});

describe('Equipo y «Mi cuenta» del panel', () => {
    afterEach(desmontarTodo);
    it('el panel del equipo sigue cargando con las acciones de gestión', async () => {
        spyOn(soportePanelService, 'personal').and.resolveTo([]);
        spyOn(soportePanelService, 'estadisticas').and.resolveTo({ totalTickets: 0, sinAsignar: 0, creadosUltimos7Dias: 0, personalActivo: 0 } as never);
        const c = await montar(<Equipo />);
        await esperar(30);
        expect(texto(c)).toContain('Nueva persona');
    });
});
