import test from 'node:test';
import assert from 'node:assert/strict';

// Entorno mínimo de navegador para probar la sesión sin DOM.
const almacen = new Map();
globalThis.localStorage = {
    getItem: k => (almacen.has(k) ? almacen.get(k) : null),
    setItem: (k, v) => { almacen.set(k, String(v)); },
    removeItem: k => { almacen.delete(k); },
};
const eventos = [];
globalThis.window = { dispatchEvent: e => { eventos.push(e.type); return true; } };

const api = await import('../js/api.js');

const usuario = { id: 1, nombre: 'Juan', apellido: 'Perez', apodo: 'juanp', correo: 'juan@correo.com' };
const reiniciar = () => { almacen.clear(); eventos.length = 0; };
const responder = (status, cuerpo) => {
    globalThis.fetch = async () => ({
        status, ok: status >= 200 && status < 300, json: async () => cuerpo,
    });
};

test('la sesión guardada se recupera al "recargar" (localStorage)', () => {
    reiniciar();
    api.guardarSesion({ token: 'abc', expiraEnMs: 60000, usuario });
    const sesion = api.obtenerSesion();
    assert.equal(sesion.token, 'abc');
    assert.equal(api.usuarioActual().apodo, 'juanp');
    assert.equal(api.estaAutenticado(), true);
});

test('una sesión vencida se descarta', () => {
    reiniciar();
    api.guardarSesion({ token: 'abc', expiraEnMs: -1000, usuario });
    assert.equal(api.obtenerSesion(), null);
    assert.equal(almacen.has(api.CLAVE_SESION), false);
});

test('una sesión corrupta se descarta sin lanzar error', () => {
    reiniciar();
    localStorage.setItem(api.CLAVE_SESION, '{no es json');
    assert.equal(api.obtenerSesion(), null);
});

test('un 401 con token enviado cierra la sesión y avisa', async () => {
    reiniciar();
    api.guardarSesion({ token: 'abc', expiraEnMs: 60000, usuario });
    responder(401, { mensaje: 'Debes iniciar sesión' });
    await assert.rejects(api.apiFetch('/publicaciones/mias'));
    assert.equal(api.obtenerSesion(), null);
    assert.deepEqual(eventos, ['mr:sesion-expirada']);
});

test('clave incorrecta en el login NO se trata como sesión expirada', async () => {
    reiniciar();
    responder(401, { mensaje: 'Correo o contraseña incorrectos' });
    await assert.rejects(api.apiFetch('/auth/login', { method: 'POST', body: '{}' }), /incorrectos/);
    assert.deepEqual(eventos, []);
});

test('un login fallido no borra una sesión que ya estaba activa', async () => {
    reiniciar();
    api.guardarSesion({ token: 'abc', expiraEnMs: 60000, usuario });
    responder(401, { mensaje: 'Correo o contraseña incorrectos' });
    await assert.rejects(api.apiFetch('/auth/login', { method: 'POST', body: '{}' }));
    assert.equal(api.obtenerSesion().token, 'abc');
});

test('las peticiones llevan el token de la sesión guardada', async () => {
    reiniciar();
    api.guardarSesion({ token: 'tok123', expiraEnMs: 60000, usuario });
    let auth = null;
    globalThis.fetch = async (_url, opts) => {
        auth = opts.headers.get('Authorization');
        return { status: 200, ok: true, json: async () => [] };
    };
    await api.apiFetch('/publicaciones/mias');
    assert.equal(auth, 'Bearer tok123');
});

test('urlAbsoluta completa las rutas de imágenes con el origen del gateway', () => {
    assert.equal(api.urlAbsoluta('/api/v1/publicaciones/5/imagenes/0'),
        'http://localhost:8081/api/v1/publicaciones/5/imagenes/0');
    assert.equal(api.urlAbsoluta('https://cdn.test/a.png'), 'https://cdn.test/a.png');
    assert.match(api.urlAbsoluta('data:image/svg+xml;utf8,x'), /^data:/);
});
