import { config } from '../src/config.js';
import * as bd from '../src/data/baseDatos.js';
import { ApiError, apiFetch, mensajeDeCuerpo, urlAbsoluta } from '../src/services/http.js';
import { construirQuery, publicacionesService } from '../src/services/publicacionesService.js';
import { guardarSesion, obtenerSesion, CLAVE_SESION } from '../src/services/sesion.js';
import { respuestaJson } from './helpers.jsx';

const usuario = { id: 1, nombre: 'Ana', apellido: 'Pérez', apodo: 'ana', correo: 'ana@correo.cl', ciudad: null, rol: 'USUARIO' };

describe('sesión', () => {
    beforeEach(() => localStorage.clear());

    it('guarda y recupera la sesión', () => {
        guardarSesion({ token: 't', expiraEnMs: 60000, usuario });
        expect(obtenerSesion().usuario.apodo).toBe('ana');
    });

    it('descarta una sesión vencida', () => {
        guardarSesion({ token: 't', expiraEnMs: -1000, usuario });
        expect(obtenerSesion()).toBeNull();
        expect(localStorage.getItem(CLAVE_SESION)).toBeNull();
    });

    it('descarta una sesión corrupta sin lanzar error', () => {
        localStorage.setItem(CLAVE_SESION, '{no es json');
        expect(obtenerSesion()).toBeNull();
    });
});

describe('capa HTTP (con fetch simulado)', () => {
    beforeEach(() => { localStorage.clear(); config.usarMock = false; });

    it('envía el token en Authorization y devuelve el JSON', async () => {
        guardarSesion({ token: 'abc', expiraEnMs: 60000, usuario });
        const espia = spyOn(window, 'fetch').and.resolveTo(respuestaJson({ ok: true }));
        const datos = await apiFetch('/algo');
        expect(datos).toEqual({ ok: true });
        const opciones = espia.calls.mostRecent().args[1];
        expect(opciones.headers.get('Authorization')).toBe('Bearer abc');
    });

    it('un 401 con token cierra la sesión y avisa', async () => {
        guardarSesion({ token: 'abc', expiraEnMs: 60000, usuario });
        const aviso = jasmine.createSpy('aviso');
        window.addEventListener('mr:sesion-expirada', aviso);
        spyOn(window, 'fetch').and.resolveTo(respuestaJson({ mensaje: 'no autorizado' }, 401));
        let error;
        try { await apiFetch('/privado'); } catch (e) { error = e; }
        window.removeEventListener('mr:sesion-expirada', aviso);
        expect(error instanceof ApiError).toBe(true);
        expect(error.status).toBe(401);
        expect(obtenerSesion()).toBeNull();
        expect(aviso).toHaveBeenCalled();
    });

    it('un 401 del login NO se trata como sesión expirada', async () => {
        guardarSesion({ token: 'abc', expiraEnMs: 60000, usuario });
        spyOn(window, 'fetch').and.resolveTo(respuestaJson({ mensaje: 'Credenciales inválidas' }, 401));
        try { await apiFetch('/auth/login', { method: 'POST' }); } catch { /* esperado */ }
        expect(obtenerSesion()).not.toBeNull();
    });

    it('convierte un fallo de red en un mensaje legible', async () => {
        spyOn(window, 'fetch').and.rejectWith(new TypeError('Failed to fetch'));
        let error;
        try { await apiFetch('/x'); } catch (e) { error = e; }
        expect(error.message).toContain('No se pudo conectar con el servidor');
    });

    it('arma mensajes de error según el cuerpo y el estado HTTP', () => {
        expect(mensajeDeCuerpo({ mensaje: 'Hola' }, 400)).toBe('Hola');
        expect(mensajeDeCuerpo({ correo: 'Correo inválido' }, 400)).toBe('Correo inválido');
        expect(mensajeDeCuerpo(null, 429)).toContain('Demasiadas solicitudes');
        expect(mensajeDeCuerpo(null, 500)).toContain('problema');
    });

    it('completa las rutas relativas de imágenes con el origen del gateway', () => {
        expect(urlAbsoluta('/api/v1/publicaciones/1/imagenes/0')).toContain('http://localhost:8081/api/v1/publicaciones/1/imagenes/0');
        expect(urlAbsoluta('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
    });
});

describe('publicacionesService', () => {
    afterEach(() => { config.usarMock = false; });

    it('construye el query string con filtros, ubicación y paginación', () => {
        const q = construirQuery({ q: 'bici', categorias: ['DEPORTES', 'HOGAR'], precioMin: '100', ubicacion: { lat: -36.8, lon: -73 }, radioKm: '25', orden: 'PRECIO_ASC', pagina: 2, tamano: 12 });
        const p = new URLSearchParams(q);
        expect(p.get('q')).toBe('bici');
        expect(p.getAll('categoria')).toEqual(['DEPORTES', 'HOGAR']);
        expect(p.get('radioKm')).toBe('25');
        expect(p.get('pagina')).toBe('2');
        expect(p.has('precioMax')).toBe(false);
    });

    it('en modo API llama al endpoint /publicaciones', async () => {
        config.usarMock = false;
        const espia = spyOn(window, 'fetch').and.resolveTo(respuestaJson({ contenido: [], total: 0 }));
        await publicacionesService.listar({ q: 'mesa' });
        expect(espia.calls.mostRecent().args[0]).toContain('/publicaciones?q=mesa');
    });

    it('en modo simulado NO usa la red y lee de la base de datos', async () => {
        config.usarMock = true;
        bd.configurarPersistencia(false);
        bd.reiniciar();
        const espia = spyOn(window, 'fetch');
        const pagina = await publicacionesService.listar({ q: 'notebook' });
        expect(pagina.total).toBe(1);
        expect(espia).not.toHaveBeenCalled();
    });

    it('rechaza obtener una publicación inexistente en modo simulado', async () => {
        config.usarMock = true;
        let error;
        try { await publicacionesService.obtener(999); } catch (e) { error = e; }
        expect(error.status).toBe(404);
    });
});
