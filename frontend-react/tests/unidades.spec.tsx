import PublicationCard from '../src/components/publicaciones/PublicationCard';
import { config } from '../src/config';
import { Router } from '../src/core/router';
import { unidadesDe, validarUnidades } from '../src/core/validaciones';
import * as bd from '../src/data/baseDatos';
import { ActividadPublicaciones } from '../src/pages/AdminPage';
import { adminService } from '../src/services/adminService';
import { publicacionesService } from '../src/services/publicacionesService';
import type { Usuario } from '../src/types/api';
import type { DatosPublicacion } from '../src/types/app';
import { botonPorTexto, clic, desmontarTodo, montar, publicacionDePrueba, respuestaJson } from './helpers';

const usuario = { id: 1, nombre: 'Ana', apellido: 'Pérez', apodo: 'ana', correo: 'ana@correo.cl', ciudad: null, rol: 'USUARIO' } as Usuario;

const datos = (extra: Partial<DatosPublicacion> = {}): DatosPublicacion => ({
    titulo: 'Mesa de centro', precio: '45000', descripcion: 'Mesa de madera en buen estado.', ubicacion: 'Concepción',
    categoria: 'HOGAR', modalidadesEntrega: ['ENVIO'], latitud: -36.8, longitud: -73, fotos: [], ...extra,
});

describe('unidades a la venta: validación', () => {
    it('vacío es válido y equivale a 1 unidad', () => {
        expect(validarUnidades('')).toBeNull();
        expect(validarUnidades(undefined)).toBeNull();
        expect(unidadesDe('')).toBe(1);
        expect(unidadesDe(undefined)).toBe(1);
    });

    it('acepta enteros entre 1 y 9999', () => {
        expect(validarUnidades('1')).toBeNull();
        expect(validarUnidades('9999')).toBeNull();
        expect(unidadesDe('12')).toBe(12);
    });

    it('rechaza cero, decimales, texto y valores demasiado altos', () => {
        expect(validarUnidades('0')).toContain('entre 1 y 9999');
        expect(validarUnidades('10000')).toContain('entre 1 y 9999');
        expect(validarUnidades('2.5')).toContain('entero');
        expect(validarUnidades('dos')).toContain('entero');
    });
});

describe('unidades a la venta: servicio y base simulada', () => {
    beforeEach(() => { localStorage.clear(); config.usarMock = false; bd.configurarPersistencia(false); bd.reiniciar(); });
    afterEach(() => { config.usarMock = false; });

    it('en modo API envía unidades=1 cuando el campo queda vacío', async () => {
        const espia = spyOn(window, 'fetch').and.resolveTo(respuestaJson(publicacionDePrueba(), 201));
        await publicacionesService.crear(datos());
        const cuerpo = espia.calls.mostRecent().args[1]?.body as FormData;
        expect(cuerpo.get('unidades')).toBe('1');
    });

    it('en modo API envía las unidades indicadas', async () => {
        const espia = spyOn(window, 'fetch').and.resolveTo(respuestaJson(publicacionDePrueba(), 201));
        await publicacionesService.crear(datos({ unidades: '4' }));
        expect((espia.calls.mostRecent().args[1]?.body as FormData).get('unidades')).toBe('4');
    });

    it('en modo API actualizar manda las unidades en el PATCH', async () => {
        const espia = spyOn(window, 'fetch').and.resolveTo(respuestaJson(publicacionDePrueba({ unidades: 6 })));
        await publicacionesService.actualizar(1, { unidades: 6 });
        const [url, opciones] = espia.calls.mostRecent().args;
        expect(String(url)).toContain('/publicaciones/1');
        expect(opciones?.method).toBe('PATCH');
        expect(JSON.parse(String(opciones?.body))).toEqual({ unidades: 6 });
    });

    it('la base simulada usa 1 por defecto y permite cambiarlo', () => {
        expect(bd.crearPublicacion(datos(), usuario).unidades).toBe(1);
        const con = bd.crearPublicacion(datos({ unidades: '3' }), usuario);
        expect(con.unidades).toBe(3);
        expect(bd.actualizarPublicacion(con.id, { unidades: 5 })?.unidades).toBe(5);
    });
});

describe('unidades a la venta: tarjeta', () => {
    afterEach(async () => { await desmontarTodo(); });

    it('marca la publicación cuando hay más de una unidad', async () => {
        const c = await montar(<Router><PublicationCard publicacion={publicacionDePrueba({ unidades: 3 })} /></Router>);
        expect(c.querySelector('[data-testid="unidades"]')?.textContent).toContain('3 unidades');
    });

    it('no muestra la marca con una sola unidad', async () => {
        const c = await montar(<Router><PublicationCard publicacion={publicacionDePrueba({ unidades: 1 })} /></Router>);
        expect(c.querySelector('[data-testid="unidades"]')).toBeNull();
    });
});

describe('dashboard: publicaciones nuevas y ventas cerradas', () => {
    beforeEach(() => { localStorage.clear(); config.usarMock = false; bd.configurarPersistencia(false); bd.reiniciar(); });
    afterEach(async () => { await desmontarTodo(); config.usarMock = false; });

    it('en modo API consulta /admin/publicaciones/resumen con los días', async () => {
        const espia = spyOn(window, 'fetch').and.resolveTo(respuestaJson({ dias: 30, desde: '', nuevas: 1, cerradasVentas: 0, activas: 1, totalVendidas: 0 }));
        await adminService.resumenPublicaciones(30);
        expect(espia.calls.mostRecent().args[0]).toContain('/admin/publicaciones/resumen?dias=30');
    });

    it('el resumen simulado cuenta las nuevas dentro de la ventana', () => {
        const ahora = Date.UTC(2026, 10, 1);
        expect(bd.resumenPublicaciones(365, ahora).nuevas).toBe(bd.resumenPublicaciones(365, ahora).activas);
        expect(bd.resumenPublicaciones(1, ahora + 400 * 86_400_000).nuevas).toBe(0);
    });

    it('muestra nuevas y cerradas en ventas, y recarga al cambiar el período', async () => {
        const espia = spyOn(adminService, 'resumenPublicaciones').and.callFake(async (dias: number) => ({
            dias, desde: '', nuevas: dias === 7 ? 4 : 11, cerradasVentas: dias === 7 ? 2 : 5, activas: 20, totalVendidas: 9,
        }));
        const c = await montar(<ActividadPublicaciones />);
        expect(c.querySelector('[data-testid="pub-nuevas"]')?.textContent).toBe('4');
        expect(c.querySelector('[data-testid="pub-cerradas"]')?.textContent).toBe('2');
        await clic(botonPorTexto(c, '30 días'));
        expect(espia).toHaveBeenCalledWith(30);
        expect(c.querySelector('[data-testid="pub-nuevas"]')?.textContent).toBe('11');
        expect(c.querySelector('[data-testid="pub-cerradas"]')?.textContent).toBe('5');
    });
});
