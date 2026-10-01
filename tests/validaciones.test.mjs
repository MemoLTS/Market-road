import test from 'node:test';
import assert from 'node:assert/strict';
import * as v from '../js/validaciones.js';

test('título: largo y saltos de línea', () => {
    assert.equal(v.validarTitulo('Bicicleta'), null);
    assert.match(v.validarTitulo('ab'), /entre 3 y 100/);
    assert.match(v.validarTitulo('a'.repeat(101)), /entre 3 y 100/);
    assert.match(v.validarTitulo('Hola\nmundo'), /saltos de línea/);
});

test('texto: rechaza caracteres de control y de dirección', () => {
    assert.match(v.validarDescripcion('descripción\u0000 válida'), /no permitidos/);
    assert.match(v.validarDescripcion('descripción \u202E válida'), /no permitidos/);
    assert.equal(v.validarDescripcion('Línea uno\nlínea dos'), null);
});

test('monto: positivo, 2 decimales y tope', () => {
    assert.equal(v.validarMonto('1000'), null);
    assert.equal(v.validarMonto('1000,50'), null);
    assert.equal(v.validarMonto(99.99), null);
    for (const malo of ['', '0', '-5', '10.999', 'abc', '1e5', '99999999999']) {
        assert.notEqual(v.validarMonto(malo), null, `debería rechazar "${malo}"`);
    }
});

test('rango de precios', () => {
    assert.equal(v.validarRangoPrecios('', ''), null);
    assert.equal(v.validarRangoPrecios('10', '20'), null);
    assert.notEqual(v.validarRangoPrecios('30', '20'), null);
    assert.notEqual(v.validarRangoPrecios('-1', ''), null);
});

test('fotos: cantidad, tipo y peso', () => {
    const ok = { type: 'image/jpeg', size: 1000 };
    assert.equal(v.validarFotos([ok]), null);
    assert.notEqual(v.validarFotos([]), null);
    assert.notEqual(v.validarFotos(Array(9).fill(ok)), null);
    assert.notEqual(v.validarFotos([{ type: 'image/gif', size: 10 }]), null);
    assert.notEqual(v.validarFotos([{ type: 'image/png', size: 6 * 1024 * 1024 }]), null);
});

test('coordenadas', () => {
    assert.equal(v.validarCoordenadas(-36.8, -73.05), null);
    assert.notEqual(v.validarCoordenadas(95, 0), null);
    assert.notEqual(v.validarCoordenadas(0, 181), null);
    assert.notEqual(v.validarCoordenadas(NaN, 0), null);
});

test('cuenta: correo, nombre, apodo y contraseña', () => {
    assert.equal(v.validarCorreo('a@b.cl'), null);
    assert.notEqual(v.validarCorreo('sin-arroba'), null);
    assert.equal(v.validarNombre('María José', 'El nombre'), null);
    assert.notEqual(v.validarNombre('R2D2', 'El nombre'), null);
    assert.equal(v.validarApodo('juan_92'), null);
    assert.notEqual(v.validarApodo('con espacio'), null);
    assert.equal(v.validarContrasenaNueva('Clave1234'), null);
    assert.notEqual(v.validarContrasenaNueva('soloLetras'), null);
    assert.notEqual(v.validarContrasenaNueva('12345678'), null);
    assert.notEqual(v.validarContrasenaNueva('con espacio1'), null);
});

test('mensaje: vacío y largo', () => {
    assert.equal(v.validarMensaje('hola'), null);
    assert.notEqual(v.validarMensaje('   '), null);
    assert.notEqual(v.validarMensaje('a'.repeat(1001)), null);
});
