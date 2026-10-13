import test from 'node:test';
import assert from 'node:assert/strict';
import { buscarLugares, esResultadoAsentamiento, esTipoAsentamiento } from '../Js/geocodificacion.js';

test('solo considera ciudades, pueblos, aldeas y caseríos como asentamientos', () => {
    for (const tipo of ['city', 'town', 'village', 'hamlet']) {
        assert.equal(esTipoAsentamiento(tipo), true);
    }
    for (const tipo of ['road', 'suburb', 'administrative', 'country', undefined]) {
        assert.equal(esTipoAsentamiento(tipo), false);
    }
});

test('acepta resultados administrativos solo si identifican una localidad', () => {
    assert.equal(esResultadoAsentamiento('place', 'city', false), true);
    assert.equal(esResultadoAsentamiento('boundary', 'administrative', true), true);
    assert.equal(esResultadoAsentamiento('boundary', 'administrative', false), false);
    assert.equal(esResultadoAsentamiento('boundary', 'county', true), false);
});

test('reconoce ciudades devueltas por Nominatim como boundary administrativo', async () => {
    const fetchOriginal = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify([
        {
            category: 'boundary',
            type: 'administrative',
            lat: '-36.8270698',
            lon: '-73.0502064',
            address: { city: 'Concepción', state: 'Región del Biobío', country: 'Chile' },
        },
        {
            category: 'boundary',
            type: 'administrative',
            lat: '-36.8',
            lon: '-73.0',
            address: { municipality: 'Provincia de Concepción', country: 'Chile' },
        },
    ]), { headers: { 'Content-Type': 'application/json' } });
    try {
        assert.deepEqual(await buscarLugares('Concepcion'), [{
            nombre: 'Concepción, Región del Biobío, Chile',
            ubicacion: { lat: -36.8270698, lon: -73.0502064 },
        }]);
    } finally {
        globalThis.fetch = fetchOriginal;
    }
});
