import { config } from '../src/config.js';
import * as bd from '../src/data/baseDatos.js';
import { buscarLugares, esResultadoAsentamiento, esTipoAsentamiento } from '../src/core/geocodificacion.js';
import { formatoFechaCorta, formatoPrecio, mensajeDeError, obtenerUbicacion } from '../src/core/formato.js';
import { adminService } from '../src/services/adminService.js';
import { authService, obtenerDispositivoId } from '../src/services/authService.js';
import { mensajesService } from '../src/services/mensajesService.js';
import { guardarSesion, obtenerSesion } from '../src/services/sesion.js';
import { guardarSesionSoporte, limpiarSesionSoporte, obtenerSesionSoporte } from '../src/services/sesionSoporte.js';
import { soportePanelService, soporteUsuarioService } from '../src/services/soporteService.js';
import { respuestaJson } from './helpers.jsx';

const usuario = { id: 1, nombre: 'Ana', apellido: 'Pérez', apodo: 'ana', correo: 'ana@correo.cl', rol: 'USUARIO' };
const ultimaLlamada = espia => ({ url: espia.calls.mostRecent().args[0], opciones: espia.calls.mostRecent().args[1] });

describe('authService', () => {
    beforeEach(() => { localStorage.clear(); config.usarMock = false; bd.configurarPersistencia(false); bd.reiniciar(); });
    afterEach(() => { config.usarMock = false; localStorage.clear(); });

    it('genera un identificador de dispositivo UUID v4 y lo mantiene estable', () => {
        const id = obtenerDispositivoId();
        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(obtenerDispositivoId()).toBe(id);
    });

    it('login en modo API envía credenciales + dispositivo y guarda la sesión', async () => {
        const espia = spyOn(window, 'fetch').and.resolveTo(respuestaJson({ token: 'tok', expiraEnMs: 60000, usuario }));
        const u = await authService.login('ana@correo.cl', 'clave1234');
        const { url, opciones } = ultimaLlamada(espia);
        expect(url).toContain('/auth/login');
        expect(JSON.parse(opciones.body)).toEqual(jasmine.objectContaining({ correo: 'ana@correo.cl', contrasena: 'clave1234' }));
        expect(u.apodo).toBe('ana');
        expect(obtenerSesion().token).toBe('tok');
    });

    it('login en modo simulado no usa la red', async () => {
        config.usarMock = true;
        const espia = spyOn(window, 'fetch');
        await authService.login('demo@marketroad.cl', 'demo1234');
        expect(espia).not.toHaveBeenCalled();
        expect(obtenerSesion().usuario.apodo).toBe('demo');
    });

    it('registrar crea la cuenta y deja la sesión iniciada', async () => {
        const espia = spyOn(window, 'fetch').and.callFake(url => Promise.resolve(
            String(url).endsWith('/usuarios') ? respuestaJson(usuario, 201) : respuestaJson({ token: 't', expiraEnMs: 1000, usuario })));
        const r = await authService.registrar({ nombre: 'Ana', apellido: 'Pérez', apodo: 'ana', correo: 'ana@correo.cl', contrasena: 'clave1234' });
        expect(r.sesionIniciada).toBe(true);
        expect(espia).toHaveBeenCalledTimes(2);
    });

    it('registrar informa sesionIniciada=false si el login automático falla', async () => {
        spyOn(window, 'fetch').and.callFake(url => Promise.resolve(
            String(url).endsWith('/usuarios') ? respuestaJson(usuario, 201) : respuestaJson({ mensaje: 'x' }, 500)));
        const r = await authService.registrar({ nombre: 'Ana', apellido: 'Pérez', apodo: '', correo: 'ana@correo.cl', contrasena: 'clave1234' });
        expect(r.sesionIniciada).toBe(false);
    });

    it('logout limpia la sesión local aunque el servidor falle', async () => {
        guardarSesion({ token: 't', expiraEnMs: 60000, usuario });
        spyOn(window, 'fetch').and.rejectWith(new TypeError('sin red'));
        await authService.logout();
        expect(obtenerSesion()).toBeNull();
    });

    it('actualizarPerfil (simulado) cambia la ciudad y actualiza la sesión', async () => {
        config.usarMock = true;
        await authService.login('demo@marketroad.cl', 'demo1234');
        await authService.actualizarPerfil({ ciudad: 'Coronel' });
        expect(obtenerSesion().usuario.ciudad).toBe('Coronel');
    });
});

describe('mensajesService', () => {
    beforeEach(() => { localStorage.clear(); config.usarMock = false; guardarSesion({ token: 't', expiraEnMs: 60000, usuario }); });
    afterEach(() => localStorage.clear());

    it('usa el endpoint y el método correctos en cada operación', async () => {
        const espia = spyOn(window, 'fetch').and.callFake(() => Promise.resolve(respuestaJson({})));
        await mensajesService.iniciar(5, 'Hola');
        expect(ultimaLlamada(espia).url).toMatch(/\/conversaciones$/);
        expect(JSON.parse(ultimaLlamada(espia).opciones.body)).toEqual({ publicacionId: 5, contenido: 'Hola' });
        await mensajesService.enviarOferta(9, 1000);
        expect(ultimaLlamada(espia).url).toContain('/conversaciones/9/ofertas');
        await mensajesService.responderOferta(9, 3, true);
        expect(ultimaLlamada(espia).url).toContain('/conversaciones/9/ofertas/3/aceptar');
        await mensajesService.responderOferta(9, 3, false);
        expect(ultimaLlamada(espia).url).toContain('/ofertas/3/rechazar');
        await mensajesService.marcarVendido(9);
        expect(ultimaLlamada(espia).url).toContain('/conversaciones/9/venta');
        expect(ultimaLlamada(espia).opciones.method).toBe('POST');
        await mensajesService.deLaPublicacion(5);
        expect(ultimaLlamada(espia).url).toContain('publicacionId=5');
    });
});

describe('sesión y servicios de soporte', () => {
    beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
    afterEach(() => { sessionStorage.clear(); localStorage.clear(); });

    it('la sesión del personal vive en sessionStorage y es independiente de la tienda', () => {
        guardarSesionSoporte({ token: 'p', expiraEnMs: 60000, personal: { id: 1, rol: 'ADMIN' } });
        expect(obtenerSesionSoporte().token).toBe('p');
        expect(obtenerSesion()).toBeNull();
        limpiarSesionSoporte();
        expect(obtenerSesionSoporte()).toBeNull();
    });

    it('descarta la sesión del personal vencida o corrupta', () => {
        guardarSesionSoporte({ token: 'p', expiraEnMs: -5, personal: { id: 1 } });
        expect(obtenerSesionSoporte()).toBeNull();
        sessionStorage.setItem('mr_soporte_session', 'no-json');
        expect(obtenerSesionSoporte()).toBeNull();
    });

    it('el panel envía el token del personal, no el de la tienda', async () => {
        guardarSesion({ token: 'tienda', expiraEnMs: 60000, usuario });
        guardarSesionSoporte({ token: 'personal', expiraEnMs: 60000, personal: { id: 1 } });
        const espia = spyOn(window, 'fetch').and.resolveTo(respuestaJson({ contenido: [] }));
        await soportePanelService.tickets({ pagina: '0', estado: 'ACTIVOS' });
        const { url, opciones } = ultimaLlamada(espia);
        expect(url).toContain('/soporte/panel/tickets?pagina=0&estado=ACTIVOS');
        expect(opciones.headers.get('Authorization')).toBe('Bearer personal');
    });

    it('un 401 del panel cierra solo la sesión del personal', async () => {
        guardarSesion({ token: 'tienda', expiraEnMs: 60000, usuario });
        guardarSesionSoporte({ token: 'personal', expiraEnMs: 60000, personal: { id: 1 } });
        spyOn(window, 'fetch').and.resolveTo(respuestaJson({ mensaje: 'no' }, 401));
        try { await soportePanelService.yo(); } catch { /* esperado */ }
        expect(obtenerSesionSoporte()).toBeNull();
        expect(obtenerSesion()).not.toBeNull();
    });

    it('el servicio de usuario crea tickets con asunto, categoría y mensaje', async () => {
        guardarSesion({ token: 't', expiraEnMs: 60000, usuario });
        const espia = spyOn(window, 'fetch').and.resolveTo(respuestaJson({}));
        await soporteUsuarioService.crear('No puedo entrar', 'CUENTA', 'Ayuda');
        expect(JSON.parse(ultimaLlamada(espia).opciones.body)).toEqual({ asunto: 'No puedo entrar', categoria: 'CUENTA', mensaje: 'Ayuda' });
    });
});

describe('adminService (modo simulado)', () => {
    beforeEach(() => { config.usarMock = true; bd.configurarPersistencia(false); bd.reiniciar(); });
    afterEach(() => { config.usarMock = false; });

    it('lista usuarios sin exponer contraseñas y publicaciones con cantidad de imágenes', async () => {
        const usuarios = await adminService.usuarios();
        expect(usuarios.length).toBe(2);
        expect(usuarios[0].contrasena).toBeUndefined();
        const pubs = await adminService.publicaciones();
        expect(pubs.length).toBe(8);
        expect(pubs[0].cantidadImagenes).toBe(1);
    });
});

describe('geocodificación y utilidades de formato', () => {
    afterEach(() => { Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true }); });

    it('solo considera asentamientos reales como localidades', () => {
        ['city', 'town', 'village', 'hamlet'].forEach(t => expect(esTipoAsentamiento(t)).toBe(true));
        ['road', 'suburb', 'country', undefined].forEach(t => expect(esTipoAsentamiento(t)).toBe(false));
        expect(esResultadoAsentamiento('boundary', 'administrative', false)).toBe(false);
        expect(esResultadoAsentamiento('boundary', 'administrative', true)).toBe(true);
    });

    it('buscarLugares transforma la respuesta de Nominatim (fetch simulado)', async () => {
        spyOn(window, 'fetch').and.resolveTo(respuestaJson([
            { category: 'boundary', type: 'administrative', lat: '-36.82', lon: '-73.05', address: { city: 'Concepción', state: 'Región del Biobío', country: 'Chile' } },
            { category: 'highway', type: 'road', lat: '1', lon: '1', address: { road: 'Calle' } },
        ]));
        const lugares = await buscarLugares('Concepcion');
        expect(lugares).toEqual([{ nombre: 'Concepción, Región del Biobío, Chile', ubicacion: { lat: -36.82, lon: -73.05 } }]);
    });

    it('formatea precios y fechas, y tolera fechas inválidas', () => {
        expect(formatoPrecio(150000)).toBe('$150.000');
        expect(formatoFechaCorta('no-es-fecha')).toBe('');
        expect(formatoFechaCorta('2026-10-01T10:00:00Z')).not.toBe('');
        expect(mensajeDeError(new Error('Fallo'))).toBe('Fallo');
        expect(mensajeDeError('texto', 'por defecto')).toBe('por defecto');
    });

    it('obtenerUbicacion resuelve las coordenadas o explica el rechazo de permiso', async () => {
        Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: ok => ok({ coords: { latitude: -36.8, longitude: -73 } }) } });
        expect(await obtenerUbicacion()).toEqual({ lat: -36.8, lon: -73 });
        Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_, ko) => ko({ code: 1, PERMISSION_DENIED: 1 }) } });
        let error;
        try { await obtenerUbicacion(); } catch (e) { error = e; }
        expect(error.message).toContain('No diste permiso');
    });
});
