import { config } from '../src/config';
import * as bd from '../src/data/baseDatos';
import { Route, Routes } from '../src/core/router';
import App from '../src/App';
import RutaProtegida from '../src/components/layout/RutaProtegida';
import { peticion } from '../src/services/http';
import { guardarSesion, obtenerSesion } from '../src/services/sesion';
import { adminService } from '../src/services/adminService';
import { authService } from '../src/services/authService';
import { guardarSesionSoporte, obtenerSesionSoporte } from '../src/services/sesionSoporte';
import { soportePanelService } from '../src/services/soporteService';
import type { Usuario } from '../src/types/api';
import { botonPorTexto, clic, desmontarTodo, esperar, montar, montarConApp, respuestaJson, texto } from './helpers';

const deshabilitada: Usuario = { id: 1, nombre: 'Demo', apellido: 'Usuario', apodo: 'demo', correo: 'demo@marketroad.cl', ciudad: 'Concepción', rol: 'USUARIO', activo: false };
const { activo: _omitido, ...normal } = deshabilitada;

describe('cuenta deshabilitada (solo soporte)', () => {
    beforeEach(() => { localStorage.clear(); bd.configurarPersistencia(false); bd.reiniciar(); config.usarMock = true; window.location.hash = '#/'; });
    afterEach(async () => { await desmontarTodo(); localStorage.clear(); });

    it('muestra el aviso y deja en el menú solo Soporte y Cerrar sesión', async () => {
        guardarSesion({ token: 't', expiraEnMs: 600000, usuario: deshabilitada });
        const c = await montar(<App />);
        await esperar(40);
        expect(c.querySelector('[data-testid="aviso-deshabilitada"]')?.textContent).toContain('solo puedes usar el soporte');
        expect(texto(c)).not.toContain('Mensajes');
        await clic(c.querySelector('.dropdown-toggle'));
        const menu = c.querySelector('.dropdown-menu')?.textContent ?? '';
        expect(menu).toContain('Soporte');
        expect(menu).toContain('Cerrar sesión');
        expect(menu).not.toContain('Mi perfil');
    });

    it('una cuenta habilitada no ve el aviso', async () => {
        guardarSesion({ token: 't', expiraEnMs: 600000, usuario: normal });
        const c = await montar(<App />);
        await esperar(40);
        expect(c.querySelector('[data-testid="aviso-deshabilitada"]')).toBeNull();
        expect(texto(c)).toContain('Mensajes');
    });

    it('las páginas protegidas la llevan a /soporte', async () => {
        guardarSesion({ token: 't', expiraEnMs: 600000, usuario: deshabilitada });
        window.location.hash = '#/mensajes';
        await montarConApp(<Routes><Route path="/mensajes" element={<RutaProtegida><p>Mensajes privados</p></RutaProtegida>} /><Route path="/soporte" element={<p>Pantalla de soporte</p>} /></Routes>);
        await esperar(40);
        expect(window.location.hash).toBe('#/soporte');
    });

    it('si el superusuario la deshabilita con la sesión abierta, el 403 del servidor la marca como deshabilitada', async () => {
        config.usarMock = false;
        guardarSesion({ token: 't', expiraEnMs: 600000, usuario: normal });
        spyOn(window, 'fetch').and.resolveTo(respuestaJson({ mensaje: 'Tu cuenta está deshabilitada. Solo puedes escribir a soporte' }, 403));
        await expectAsync(peticion('/conversaciones')).toBeRejected();
        expect(obtenerSesion()?.usuario.activo).toBe(false);
    });

    it('un 403 que no habla de la cuenta no la deshabilita', async () => {
        config.usarMock = false;
        guardarSesion({ token: 't', expiraEnMs: 600000, usuario: normal });
        spyOn(window, 'fetch').and.resolveTo(respuestaJson({ mensaje: 'Acceso restringido al superusuario' }, 403));
        await expectAsync(peticion('/admin/usuarios')).toBeRejected();
        expect(obtenerSesion()?.usuario.activo).toBeUndefined();
    });

    it('en modo demostración iniciar sesión conserva el estado: deshabilitada entra con activo=false; eliminada ya no existe', () => {
        const admin = obtenerSesion()?.usuario.id ?? 2;
        bd.cambiarEstadoUsuario(admin, 1, false);
        expect(bd.autenticar('demo@marketroad.cl', 'demo1234').usuario.activo).toBeFalse();
        bd.eliminarUsuario(admin, 1);
        expect(() => bd.autenticar('demo@marketroad.cl', 'demo1234')).toThrowError('Correo o contraseña incorrectos.');
    });

    it('la BD simulada rechaza tocar superusuarios y ids inexistentes', () => {
        expect(bd.cambiarEstadoUsuario(2, 2, false)).toBe('superusuario');
        expect(bd.eliminarUsuario(2, 2)).toBe('superusuario');
        expect(bd.cambiarEstadoUsuario(2, 999, false)).toBe('no-existe');
        expect(bd.eliminarUsuario(2, 999)).toBe('no-existe');
        expect(bd.cambiarEstadoPublicacion(999, false)).toBe('no-existe');
    });

    it('una publicación vendida no se puede deshabilitar', () => {
        const p = bd.listarPublicaciones({ tamano: 100 }).contenido[0];
        bd.actualizarPublicacion(p.id, { estado: 'VENDIDA' } as never);
        expect(bd.cambiarEstadoPublicacion(p.id, false)).toBe('no-permitido');
    });
});

describe('contrato: deshabilitar y eliminar (rutas del backend)', () => {
    let espia: jasmine.Spy<typeof fetch>;
    const ultima = (): { url: string; metodo: string; cuerpo: unknown } => {
        const [url, opciones] = espia.calls.mostRecent().args as [string, RequestInit];
        return { url: String(url).replace(config.apiBaseUrl, ''), metodo: opciones.method ?? 'GET', cuerpo: typeof opciones.body === 'string' ? JSON.parse(opciones.body) : opciones.body };
    };
    const llamadas = (): [string, string][] => espia.calls.allArgs().map(([u, o]) => [String(u).replace(config.apiBaseUrl, ''), (o as RequestInit).method ?? 'GET']);

    beforeEach(() => {
        localStorage.clear();
        config.usarMock = false;
        guardarSesion({ token: 'T', expiraEnMs: 600000, usuario: { ...normal, id: 2, rol: 'SUPERUSUARIO' } });
        espia = spyOn(window, 'fetch').and.callFake(async () => respuestaJson({}));
    });
    afterEach(() => localStorage.clear());

    it('deshabilitar: PATCH /admin/usuarios/{id}/estado {activo:false} y luego sus publicaciones', async () => {
        await adminService.cambiarEstadoUsuario(5, false);
        expect(llamadas()).toEqual([['/admin/usuarios/5/estado', 'PATCH'], ['/admin/publicaciones/usuario/5/estado', 'PATCH']]);
        expect(ultima().cuerpo).toEqual({ habilitada: false });
    });

    it('habilitar envía activo=true y habilitada=true', async () => {
        await adminService.cambiarEstadoUsuario(5, true);
        expect(espia.calls.first().args[1]).toEqual(jasmine.objectContaining({ body: JSON.stringify({ activo: true }) }));
        expect(ultima().cuerpo).toEqual({ habilitada: true });
    });

    it('eliminar: DELETE /admin/usuarios/{id} y retira sus publicaciones', async () => {
        espia.and.callFake(async () => new Response(null, { status: 204 }));
        await adminService.eliminarUsuario(5);
        expect(llamadas()).toEqual([['/admin/usuarios/5', 'DELETE'], ['/admin/publicaciones/usuario/5', 'DELETE']]);
    });

    it('si falla el retiro de publicaciones, igual se informa la cuenta como eliminada', async () => {
        let n = 0;
        espia.and.callFake(async () => (n++ === 0 ? new Response(null, { status: 204 }) : respuestaJson({ mensaje: 'x' }, 500)));
        await expectAsync(adminService.eliminarUsuario(5)).toBeResolved();
    });

    it('si User-Api rechaza (403), no se tocan las publicaciones', async () => {
        espia.and.callFake(async () => respuestaJson({ mensaje: 'No se puede deshabilitar ni eliminar a un superusuario' }, 403));
        await expectAsync(adminService.cambiarEstadoUsuario(2, false)).toBeRejected();
        expect(espia).toHaveBeenCalledTimes(1);
    });

    it('publicación: PATCH /admin/publicaciones/{id}/estado {habilitada}', async () => {
        await adminService.cambiarEstadoPublicacion(9, false);
        expect(ultima()).toEqual({ url: '/admin/publicaciones/9/estado', metodo: 'PATCH', cuerpo: { habilitada: false } });
    });
});

describe('entrada al panel de soporte sin volver a ingresar', () => {
    const personal = { id: 7, nombre: 'Sol', rol: 'SOPORTE', rolNombre: 'Soporte' } as never;
    beforeEach(() => { localStorage.clear(); sessionStorage.clear(); config.usarMock = false; });
    afterEach(() => { localStorage.clear(); sessionStorage.clear(); });

    it('la sesión del personal queda en localStorage: sigue al recargar o abrir otra pestaña', () => {
        guardarSesionSoporte({ token: 'P', expiraEnMs: 60000, personal });
        expect(localStorage.getItem('mr_soporte_session')).not.toBeNull();
        expect(sessionStorage.getItem('mr_soporte_session')).toBeNull();
        expect(obtenerSesionSoporte()?.token).toBe('P');
    });

    it('cerrar sesión en la tienda también cierra la del panel (equipos compartidos)', async () => {
        guardarSesion({ token: 't', expiraEnMs: 600000, usuario: { id: 2, nombre: 'Admin', apellido: 'M', apodo: 'admin', correo: 'a@a.cl', ciudad: null, rol: 'SUPERUSUARIO' } });
        guardarSesionSoporte({ token: 'P', expiraEnMs: 60000, personal });
        spyOn(window, 'fetch').and.resolveTo(new Response(null, { status: 204 }));
        await authService.logout();
        expect(obtenerSesionSoporte()).toBeNull();
        expect(obtenerSesion()).toBeNull();
    });

    it('si el servidor rechaza la entrada automática (401), la sesión de la tienda NO se cierra', async () => {
        guardarSesion({ token: 't', expiraEnMs: 600000, usuario: { id: 2, nombre: 'Admin', apellido: 'M', apodo: 'admin', correo: 'a@a.cl', ciudad: null, rol: 'SUPERUSUARIO' } });
        spyOn(window, 'fetch').and.resolveTo(respuestaJson({ mensaje: 'Tu sesión no es válida' }, 401));
        await expectAsync(soportePanelService.entrarConUsuario()).toBeRejected();
        expect(obtenerSesion()?.token).toBe('t');
    });
});
