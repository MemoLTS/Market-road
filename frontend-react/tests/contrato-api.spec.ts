import { config } from '../src/config';
import { adminService } from '../src/services/adminService';
import { authService } from '../src/services/authService';
import { mensajesService } from '../src/services/mensajesService';
import { guardarSesion } from '../src/services/sesion';
import { guardarSesionSoporte } from '../src/services/sesionSoporte';
import { soportePanelService, soporteUsuarioService } from '../src/services/soporteService';
import type { Usuario } from '../src/types/api';
import { respuestaJson } from './helpers';

/**
 * Pruebas de contrato React → API: con `fetch` simulado (mock) se comprueba que cada función del servicio
 * emite el método, la ruta y el cuerpo que esperan los controladores de Spring Boot (vía el gateway).
 */
describe('contrato con el backend (servicios React)', () => {
    const usuario = { id: 7, nombre: 'Ana', apellido: 'Pérez', apodo: 'ana', correo: 'ana@correo.cl', ciudad: null, rol: 'USUARIO' } as Usuario;
    let espia: jasmine.Spy<typeof fetch>;

    const ultima = (): { url: string; metodo: string; cuerpo: unknown; auth: string | null } => {
        const [url, opciones] = espia.calls.mostRecent().args as [string, RequestInit];
        const encabezados = new Headers(opciones.headers);
        const cuerpo = typeof opciones.body === 'string' ? JSON.parse(opciones.body) : opciones.body;
        return { url: String(url).replace(config.apiBaseUrl, ''), metodo: opciones.method ?? 'GET', cuerpo, auth: encabezados.get('Authorization') };
    };

    beforeEach(() => {
        localStorage.clear();
        config.usarMock = false;
        guardarSesion({ token: 'T-USUARIO', expiraEnMs: 3_600_000, usuario });
        guardarSesionSoporte({ token: 'T-PERSONAL', expiraEnMs: 3_600_000, personal: { id: 1, nombre: 'Sol', rol: 'ADMIN', rolNombre: 'Administrador' } as never });
        espia = spyOn(window, 'fetch').and.callFake(async () => respuestaJson({}));
    });
    afterEach(() => { localStorage.clear(); });

    describe('cuentas (User-Api)', () => {
        it('login: POST /auth/login con correo, contraseña y dispositivo', async () => {
            espia.and.callFake(async () => respuestaJson({ token: 'x', expiraEnMs: 1000, usuario }));
            await authService.login('ana@correo.cl', 'Clave1234');
            expect(ultima().metodo).toBe('POST');
            expect(ultima().url).toBe('/auth/login');
            expect(ultima().cuerpo).toEqual(jasmine.objectContaining({ correo: 'ana@correo.cl', contrasena: 'Clave1234' }));
        });

        it('registrar: POST /usuarios y luego inicia sesión', async () => {
            espia.and.callFake(async (url) => respuestaJson(String(url).endsWith('/auth/login') ? { token: 'x', expiraEnMs: 1000, usuario } : usuario, 201));
            const r = await authService.registrar({ nombre: 'Ana', apellido: 'Pérez', apodo: '', correo: 'ana@correo.cl', contrasena: 'Clave1234' } as never);
            expect(r.sesionIniciada).toBeTrue();
            expect(espia.calls.argsFor(0)[0]).toContain('/usuarios');
            expect((espia.calls.argsFor(0)[1] as RequestInit).method).toBe('POST');
        });

        it('registrar: si el login automático falla lo informa sin lanzar', async () => {
            espia.and.callFake(async (url) => String(url).endsWith('/auth/login') ? respuestaJson({ mensaje: 'no' }, 401) : respuestaJson(usuario, 201));
            expect((await authService.registrar({ correo: 'a@a.cl', contrasena: 'Clave1234' } as never)).sesionIniciada).toBeFalse();
        });

        it('logout: POST /auth/logout y limpia la sesión aunque el servidor falle', async () => {
            espia.and.callFake(async () => { throw new Error('sin red'); });
            await authService.logout();
            expect(localStorage.getItem('mr_session')).toBeNull();
        });

        it('actualizarPerfil: PATCH /usuarios/{id} con solo los cambios', async () => {
            espia.and.callFake(async () => respuestaJson({ ...usuario, apodo: 'nuevo' }));
            const r = await authService.actualizarPerfil({ apodo: 'nuevo' });
            expect(ultima()).toEqual(jasmine.objectContaining({ metodo: 'PATCH', url: '/usuarios/7', cuerpo: { apodo: 'nuevo' }, auth: 'Bearer T-USUARIO' }));
            expect(r.apodo).toBe('nuevo');
        });

        it('cambiarCorreo: PATCH /usuarios/{id}/correo con la contraseña actual', async () => {
            espia.and.callFake(async () => respuestaJson({ ...usuario, correo: 'otro@correo.cl' }));
            await authService.cambiarCorreo('otro@correo.cl', 'Clave1234');
            expect(ultima()).toEqual(jasmine.objectContaining({ metodo: 'PATCH', url: '/usuarios/7/correo', cuerpo: { correo: 'otro@correo.cl', contrasenaActual: 'Clave1234' } }));
        });

        it('subirFoto: PUT multipart /usuarios/{id}/foto', async () => {
            await authService.subirFoto(new File(['x'], 'f.jpg', { type: 'image/jpeg' }));
            expect(ultima().metodo).toBe('PUT');
            expect(ultima().url).toBe('/usuarios/7/foto');
            expect((ultima().cuerpo as FormData).get('foto')).toBeInstanceOf(File);
        });

        it('dispositivos: GET /usuarios/{id}/dispositivos', async () => {
            espia.and.callFake(async () => respuestaJson([]));
            await authService.dispositivos();
            expect(ultima()).toEqual(jasmine.objectContaining({ metodo: 'GET', url: '/usuarios/7/dispositivos' }));
        });

        it('sin sesión las acciones de cuenta fallan antes de llamar al servidor', async () => {
            localStorage.clear();
            await expectAsync(authService.actualizarPerfil({ apodo: 'x' })).toBeRejected();
            expect(espia).not.toHaveBeenCalled();
        });

        it('en modo demostración cambiarCorreo y subirFoto exigen el backend real', async () => {
            config.usarMock = true;
            await expectAsync(authService.cambiarCorreo('a@a.cl', 'Clave1234')).toBeRejectedWithError(/backend real/);
            await expectAsync(authService.subirFoto(new File(['x'], 'f.jpg'))).toBeRejectedWithError(/backend real/);
            expect(await authService.dispositivos()).toEqual([]);
        });
    });

    describe('mensajería y ofertas (Publication-Api)', () => {
        const casos: [string, () => Promise<unknown>, string, string, unknown][] = [
            ['listar', () => mensajesService.listar(), 'GET', '/conversaciones', undefined],
            ['noLeidos', () => mensajesService.noLeidos(), 'GET', '/conversaciones/no-leidos', undefined],
            ['detalle', () => mensajesService.detalle(5), 'GET', '/conversaciones/5', undefined],
            ['deLaPublicacion', () => mensajesService.deLaPublicacion(9), 'GET', '/conversaciones?publicacionId=9', undefined],
            ['iniciar', () => mensajesService.iniciar(9, 'Hola'), 'POST', '/conversaciones', { publicacionId: 9, contenido: 'Hola' }],
            ['enviarMensaje', () => mensajesService.enviarMensaje(5, 'Hola'), 'POST', '/conversaciones/5/mensajes', { contenido: 'Hola' }],
            ['enviarOferta', () => mensajesService.enviarOferta(5, 45000), 'POST', '/conversaciones/5/ofertas', { monto: 45000 }],
            ['responderOferta (aceptar)', () => mensajesService.responderOferta(5, 3, true), 'POST', '/conversaciones/5/ofertas/3/aceptar', undefined],
            ['responderOferta (rechazar)', () => mensajesService.responderOferta(5, 3, false), 'POST', '/conversaciones/5/ofertas/3/rechazar', undefined],
            ['marcarVendido', () => mensajesService.marcarVendido(5), 'POST', '/conversaciones/5/venta', undefined],
        ];
        casos.forEach(([nombre, llamar, metodo, ruta, cuerpo]) => {
            it(`${nombre}: ${metodo} ${ruta}`, async () => {
                await llamar();
                expect(ultima().metodo).toBe(metodo);
                expect(ultima().url).toBe(ruta);
                expect(ultima().auth).toBe('Bearer T-USUARIO');
                if (cuerpo !== undefined) expect(ultima().cuerpo).toEqual(cuerpo);
            });
        });
    });

    describe('soporte de la persona usuaria (Soporte-Api)', () => {
        const casos: [string, () => Promise<unknown>, string, string, unknown][] = [
            ['categorias', () => soporteUsuarioService.categorias(), 'GET', '/soporte/categorias', undefined],
            ['listar', () => soporteUsuarioService.listar(), 'GET', '/soporte/tickets', undefined],
            ['detalle', () => soporteUsuarioService.detalle(3), 'GET', '/soporte/tickets/3', undefined],
            ['crear', () => soporteUsuarioService.crear('No puedo entrar', 'CUENTA', 'Ayuda'), 'POST', '/soporte/tickets', { asunto: 'No puedo entrar', categoria: 'CUENTA', mensaje: 'Ayuda' }],
            ['responder', () => soporteUsuarioService.responder(3, 'Gracias'), 'POST', '/soporte/tickets/3/mensajes', { contenido: 'Gracias' }],
            ['cerrar', () => soporteUsuarioService.cerrar(3), 'POST', '/soporte/tickets/3/cierre', undefined],
        ];
        casos.forEach(([nombre, llamar, metodo, ruta, cuerpo]) => {
            it(`${nombre}: ${metodo} ${ruta}`, async () => {
                await llamar();
                expect(ultima()).toEqual(jasmine.objectContaining({ metodo, url: ruta }));
                if (cuerpo !== undefined) expect(ultima().cuerpo).toEqual(cuerpo);
            });
        });
    });

    describe('panel del personal de soporte (token propio)', () => {
        const casos: [string, () => Promise<unknown>, string, string, unknown][] = [
            ['yo', () => soportePanelService.yo(), 'GET', '/soporte/panel/auth/yo', undefined],
            ['tickets', () => soportePanelService.tickets({ estado: 'ABIERTO', pagina: '0' }), 'GET', '/soporte/panel/tickets?estado=ABIERTO&pagina=0', undefined],
            ['detalle', () => soportePanelService.detalle(4), 'GET', '/soporte/panel/tickets/4', undefined],
            ['tomar', () => soportePanelService.tomar(4), 'POST', '/soporte/panel/tickets/4/tomar', {}],
            ['cambiarEstado', () => soportePanelService.cambiarEstado(4, 'RESUELTO'), 'POST', '/soporte/panel/tickets/4/estado', { estado: 'RESUELTO' }],
            ['cambiarPrioridad', () => soportePanelService.cambiarPrioridad(4, 'ALTA'), 'POST', '/soporte/panel/tickets/4/prioridad', { prioridad: 'ALTA' }],
            ['asignar', () => soportePanelService.asignar(4, null), 'POST', '/soporte/panel/tickets/4/asignacion', { personalId: null }],
            ['responder', () => soportePanelService.responder(4, 'Listo'), 'POST', '/soporte/panel/tickets/4/mensajes', { contenido: 'Listo' }],
            ['personal', () => soportePanelService.personal(), 'GET', '/soporte/panel/personal', undefined],
            ['estadisticas', () => soportePanelService.estadisticas(), 'GET', '/soporte/panel/estadisticas', undefined],
            ['crearPersonal', () => soportePanelService.crearPersonal({ nombre: 'Ana', correo: 'a@a.cl', contrasena: 'Clave1234', rol: 'SOPORTE' }), 'POST', '/soporte/panel/personal', { nombre: 'Ana', correo: 'a@a.cl', contrasena: 'Clave1234', rol: 'SOPORTE' }],
            ['actualizarPersonal', () => soportePanelService.actualizarPersonal(6, { activo: false }), 'PATCH', '/soporte/panel/personal/6', { activo: false }],
        ];
        casos.forEach(([nombre, llamar, metodo, ruta, cuerpo]) => {
            it(`${nombre}: ${metodo} ${ruta}`, async () => {
                await llamar();
                expect(ultima().metodo).toBe(metodo);
                expect(ultima().url).toBe(ruta);
                expect(ultima().auth).toBe('Bearer T-PERSONAL');
                if (cuerpo !== undefined) expect(ultima().cuerpo).toEqual(cuerpo);
            });
        });

        it('entrar con el token de usuario pega a /soporte/panel/auth/sso con el token de la tienda', async () => {
            espia.and.callFake(async () => respuestaJson({ token: 'p', expiraEnMs: 1000, personal: {} }));
            await soportePanelService.entrarConUsuario();
            expect(ultima()).toEqual(jasmine.objectContaining({ metodo: 'POST', url: '/soporte/panel/auth/sso' }));
        });

        it('login del personal no envía token (es público)', async () => {
            espia.and.callFake(async () => respuestaJson({ token: 'p', expiraEnMs: 1000, personal: {} }));
            await soportePanelService.login('sol@correo.cl', 'Clave1234');
            expect(ultima()).toEqual(jasmine.objectContaining({ metodo: 'POST', url: '/soporte/panel/auth/login', cuerpo: { correo: 'sol@correo.cl', contrasena: 'Clave1234' } }));
        });
    });

    describe('administración (superusuario)', () => {
        it('usuarios, publicaciones, resumen y soporte pegan a las rutas /admin', async () => {
            espia.and.callFake(async () => respuestaJson([]));
            await adminService.usuarios();
            expect(ultima().url).toBe('/admin/usuarios');
            await adminService.publicaciones();
            expect(ultima().url).toBe('/admin/publicaciones');
            await adminService.resumenPublicaciones(30);
            expect(ultima().url).toBe('/admin/publicaciones/resumen?dias=30');
            await adminService.tickets({ pagina: '0' });
            expect(ultima().url).toBe('/soporte/admin/tickets?pagina=0');
            await adminService.resumenTickets();
            expect(ultima().url).toBe('/soporte/admin/tickets/resumen');
            await adminService.detalleTicket(8);
            expect(ultima().url).toBe('/soporte/admin/tickets/8');
            expect(ultima().auth).toBe('Bearer T-USUARIO');
        });

        it('en modo demostración usuarios y publicaciones salen de la BD simulada, sin red', async () => {
            config.usarMock = true;
            expect((await adminService.usuarios()).length).toBeGreaterThan(0);
            expect(Array.isArray(await adminService.publicaciones())).toBeTrue();
            expect((await adminService.resumenPublicaciones(7)).dias).toBe(7);
            expect(espia).not.toHaveBeenCalled();
        });
    });
});
