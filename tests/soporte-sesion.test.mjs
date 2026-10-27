import test from 'node:test';
import assert from 'node:assert/strict';

// Entorno mínimo de navegador: la sesión del personal vive en sessionStorage; la de usuarios, en localStorage.
const crearAlmacen = () => {
    const mapa = new Map();
    return {
        mapa,
        getItem: k => (mapa.has(k) ? mapa.get(k) : null),
        setItem: (k, v) => { mapa.set(k, String(v)); },
        removeItem: k => { mapa.delete(k); },
    };
};
const local = crearAlmacen();
const sesion = crearAlmacen();
globalThis.localStorage = local;
globalThis.sessionStorage = sesion;
const eventos = [];
globalThis.window = { dispatchEvent: e => { eventos.push(e.type); return true; } };

const api = await import('../Js/api.js');
const soporte = await import('../Js/soporte-api.js');

const personal = { id: 7, nombre: 'Ana', correo: 'ana@soporte.cl', rol: 'SOPORTE', rolNombre: 'Soporte', activo: true, ticketsEnCurso: 0 };
const reiniciar = () => { local.mapa.clear(); sesion.mapa.clear(); eventos.length = 0; };

let ultimaPeticion = null;
const responder = (status, cuerpo) => {
    globalThis.fetch = async (url, opciones) => {
        ultimaPeticion = { url, headers: opciones.headers };
        return { status, ok: status >= 200 && status < 300, json: async () => cuerpo };
    };
};

test('la sesión del personal se guarda en sessionStorage y se recupera', () => {
    reiniciar();
    soporte.guardarSesionSoporte({ token: 'tok-personal', expiraEnMs: 60000, personal });
    assert.equal(sesion.mapa.has(soporte.CLAVE_SESION_SOPORTE), true);
    assert.equal(local.mapa.has(soporte.CLAVE_SESION_SOPORTE), false);
    assert.equal(soporte.obtenerSesionSoporte().token, 'tok-personal');
    assert.equal(soporte.obtenerSesionSoporte().personal.nombre, 'Ana');
});

test('es independiente de la sesión de la tienda', () => {
    reiniciar();
    api.guardarSesion({ token: 'tok-usuario', expiraEnMs: 60000, usuario: { id: 1, nombre: 'J', apellido: 'P', apodo: 'jp', correo: 'j@p.cl' } });
    soporte.guardarSesionSoporte({ token: 'tok-personal', expiraEnMs: 60000, personal });
    assert.notEqual(soporte.CLAVE_SESION_SOPORTE, api.CLAVE_SESION);
    soporte.limpiarSesionSoporte();
    assert.equal(soporte.obtenerSesionSoporte(), null);
    assert.equal(api.obtenerSesion().token, 'tok-usuario'); // cerrar el panel no cierra la tienda
});

test('una sesión vencida o corrupta se descarta sin lanzar error', () => {
    reiniciar();
    soporte.guardarSesionSoporte({ token: 't', expiraEnMs: -1000, personal });
    assert.equal(soporte.obtenerSesionSoporte(), null);
    assert.equal(sesion.mapa.has(soporte.CLAVE_SESION_SOPORTE), false);

    sesion.setItem(soporte.CLAVE_SESION_SOPORTE, '{no es json');
    assert.equal(soporte.obtenerSesionSoporte(), null);
    sesion.setItem(soporte.CLAVE_SESION_SOPORTE, JSON.stringify({ token: 5 }));
    assert.equal(soporte.obtenerSesionSoporte(), null);
});

test('soporteFetch envía el token del personal, nunca el de la tienda', async () => {
    reiniciar();
    api.guardarSesion({ token: 'tok-usuario', expiraEnMs: 60000, usuario: { id: 1, nombre: 'J', apellido: 'P', apodo: 'jp', correo: 'j@p.cl' } });
    soporte.guardarSesionSoporte({ token: 'tok-personal', expiraEnMs: 60000, personal });
    responder(200, { ok: true });
    await soporte.soporteFetch('/soporte/panel/tickets');
    assert.equal(ultimaPeticion.headers.get('Authorization'), 'Bearer tok-personal');
    assert.match(ultimaPeticion.url, /\/soporte\/panel\/tickets$/);
});

test('un 401 con sesión cierra la sesión del panel y avisa; un 401 del login no', async () => {
    reiniciar();
    soporte.guardarSesionSoporte({ token: 'vencido', expiraEnMs: 60000, personal });
    responder(401, { mensaje: 'Tu sesión no es válida o expiró, inicia sesión nuevamente' });
    await assert.rejects(() => soporte.soporteFetch('/soporte/panel/tickets'), { status: 401 });
    assert.equal(soporte.obtenerSesionSoporte(), null);
    assert.deepEqual(eventos, ['mr:soporte-sesion-expirada']);

    reiniciar(); // sin sesión: es el login con credenciales incorrectas
    responder(401, { mensaje: 'Correo o contraseña incorrectos' });
    await assert.rejects(() => soporte.soporteFetch('/soporte/panel/auth/login', { method: 'POST', body: '{}' }),
        { message: 'Correo o contraseña incorrectos' });
    assert.deepEqual(eventos, []);
});

test('un 400 (por ejemplo contraseña actual incorrecta) no cierra la sesión', async () => {
    reiniciar();
    soporte.guardarSesionSoporte({ token: 'tok', expiraEnMs: 60000, personal });
    responder(400, { mensaje: 'La contraseña actual no es correcta' });
    await assert.rejects(() => soporte.soporteFetch('/soporte/panel/auth/contrasena', { method: 'POST', body: '{}' }),
        { message: 'La contraseña actual no es correcta', status: 400 });
    assert.equal(soporte.obtenerSesionSoporte().token, 'tok');
    assert.deepEqual(eventos, []);
});

test('mensajes de error: validación por campo, 429 y 500', async () => {
    reiniciar();
    responder(400, { asunto: 'El asunto no puede estar vacío' });
    await assert.rejects(() => soporte.soporteFetch('/x'), { message: 'El asunto no puede estar vacío' });
    responder(429, null);
    await assert.rejects(() => soporte.soporteFetch('/x'), { message: /Demasiadas solicitudes/ });
    responder(500, null);
    await assert.rejects(() => soporte.soporteFetch('/x'), { message: /servidor tuvo un problema/ });
});

test('un corte de red da un error entendible y 204 devuelve null', async () => {
    reiniciar();
    globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
    await assert.rejects(() => soporte.soporteFetch('/x'), { message: /No se pudo conectar/, status: 0 });
    responder(204, null);
    assert.equal(await soporte.soporteFetch('/x', { method: 'POST' }), null);
});
