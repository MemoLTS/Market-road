import { config } from '../src/config';
import * as bd from '../src/data/baseDatos';
import { SeguimientoVenta } from '../src/pages/MensajesPage';
import ElegirCompradorModal from '../src/components/publicaciones/ElegirCompradorModal';
import { mensajesService } from '../src/services/mensajesService';
import { publicacionesService } from '../src/services/publicacionesService';
import { guardarSesion } from '../src/services/sesion';
import type { ConversacionResumen, RespuestaVenta, Usuario } from '../src/types/api';
import { botonPorTexto, clic, desmontarTodo, enviarFormulario, escribir, esperar, montar, respuestaJson, texto } from './helpers';

function conversacion(sobrescribir: Partial<ConversacionResumen> = {}): ConversacionResumen {
    return {
        id: 5, publicacionId: 3, publicacionTitulo: 'Moto', publicacionPrecio: 500000, publicacionEstado: 'VENDIDA', imagenUrl: '',
        rol: 'COMPRADOR', interlocutorId: 7, interlocutorApodo: 'vende', montoAcordado: 450000, ultimoMensaje: null,
        ultimaActividad: '2026-01-01T00:00:00Z', noLeidos: 0, ventaEstado: 'PENDIENTE_CONFIRMACION', ventaDetalle: null, ...sobrescribir,
    };
}

describe('venta con confirmación de la contraparte', () => {
    afterEach(async () => { await desmontarTodo(); });

    it('la persona señalada como compradora puede confirmar, negar u observar la venta', async () => {
        const respuestas: [RespuestaVenta, string | undefined][] = [];
        const c = await montar(<SeguimientoVenta c={conversacion()} onResponder={async (r, d) => { respuestas.push([r, d]); }} />);
        expect(texto(c)).toContain('¿Lo compraste?');
        await clic(botonPorTexto(c, 'Sí, lo compré'));
        await clic(botonPorTexto(c, 'No lo compré'));
        expect(respuestas).toEqual([['COMPRADO', undefined], ['NO_COMPRADO', undefined]]);
    });

    it('"otra opción" exige describir lo ocurrido antes de enviarlo a soporte', async () => {
        const respuestas: [RespuestaVenta, string | undefined][] = [];
        const c = await montar(<SeguimientoVenta c={conversacion()} onResponder={async (r, d) => { respuestas.push([r, d]); }} />);
        await clic(botonPorTexto(c, 'Otra opción'));
        await escribir(c.querySelector('textarea') as HTMLTextAreaElement, 'corto');
        await enviarFormulario(c.querySelector('form'));
        expect(texto(c)).toContain('mínimo 10 caracteres');
        expect(respuestas.length).toBe(0);

        await escribir(c.querySelector('textarea') as HTMLTextAreaElement, 'El vendedor nunca entregó el artículo');
        await enviarFormulario(c.querySelector('form'));
        await esperar(10);
        expect(respuestas).toEqual([['OTRO', 'El vendedor nunca entregó el artículo']]);
    });

    it('muestra un error cuando la respuesta falla', async () => {
        const c = await montar(<SeguimientoVenta c={conversacion()} onResponder={() => Promise.reject(new Error('Sin conexión'))} />);
        await clic(botonPorTexto(c, 'Sí, lo compré'));
        await esperar(10);
        expect(texto(c)).toContain('Sin conexión');
    });

    it('el vendedor ve el estado de la venta y no los botones de respuesta', async () => {
        const nada = async (): Promise<void> => undefined;
        let c = await montar(<SeguimientoVenta c={conversacion({ rol: 'VENDEDOR' })} onResponder={nada} />);
        expect(texto(c)).toContain('Esperando que vende confirme la compra');
        expect(botonPorTexto(c, 'Sí, lo compré')).toBeUndefined();
        await desmontarTodo();
        c = await montar(<SeguimientoVenta c={conversacion({ ventaEstado: 'CONFIRMADA' })} onResponder={nada} />);
        expect(texto(c)).toContain('Venta confirmada por ambas partes');
        await desmontarTodo();
        c = await montar(<SeguimientoVenta c={conversacion({ ventaEstado: 'EN_REVISION', ventaDetalle: 'No llegó' })} onResponder={nada} />);
        expect(texto(c)).toContain('en revisión de soporte');
        expect(texto(c)).toContain('No llegó');
        await desmontarTodo();
        c = await montar(<SeguimientoVenta c={conversacion({ ventaEstado: null })} onResponder={nada} />);
        expect(texto(c)).toBe('');
    });

    it('responderVenta llama a la ruta de respuesta con el detalle', async () => {
        guardarSesion({ token: 't', expiraEnMs: 600000, usuario: { id: 9, nombre: 'A', apellido: 'B', apodo: 'c', correo: 'c@c.cl', ciudad: 'X', rol: 'USUARIO' } as Usuario });
        const espia = spyOn(window, 'fetch').and.resolveTo(respuestaJson({ conversacion: conversacion(), mensajes: [] }));
        await mensajesService.responderVenta(5, 'OTRO', 'detalle largo');
        const [url, init] = espia.calls.mostRecent().args as [string, RequestInit];
        expect(url).toContain('/conversaciones/5/venta/respuesta');
        expect(init.method).toBe('POST');
        expect(JSON.parse(String(init.body))).toEqual({ respuesta: 'OTRO', detalle: 'detalle largo' });
    });
});

describe('elegir quién compró', () => {
    afterEach(async () => { await desmontarTodo(); });

    it('lista a las personas que escribieron y marca la venta con la elegida', async () => {
        spyOn(mensajesService, 'deLaPublicacion').and.resolveTo([conversacion({ id: 5, rol: 'VENDEDOR', interlocutorApodo: 'ana', montoAcordado: null }), conversacion({ id: 6, rol: 'VENDEDOR', interlocutorApodo: 'beto' })]);
        const marcar = spyOn(mensajesService, 'marcarVendido').and.resolveTo({ conversacion: conversacion(), mensajes: [] });
        const vendidas: number[] = [];
        const c = await montar(<ElegirCompradorModal abierto publicacionId={3} precio={500000} onCerrar={() => undefined} onVendida={id => vendidas.push(id)} />);
        await esperar(20);
        expect(texto(document.body)).toContain('ana');
        expect(texto(document.body)).toContain('beto');

        await clic(botonPorTexto(document.body, 'Marcar como vendido'));
        expect(texto(document.body)).toContain('Elige a la persona que compró');
        expect(marcar).not.toHaveBeenCalled();

        await clic(document.querySelector('#comprador-6'));
        await clic(botonPorTexto(document.body, 'Marcar como vendido'));
        await esperar(10);
        expect(marcar).toHaveBeenCalledWith(6);
        expect(vendidas).toEqual([6]);
        expect(c).toBeTruthy();
    });

    it('sin interesados no hay a quién marcar', async () => {
        spyOn(mensajesService, 'deLaPublicacion').and.resolveTo([]);
        await montar(<ElegirCompradorModal abierto publicacionId={3} precio={500000} onCerrar={() => undefined} onVendida={() => undefined} />);
        await esperar(20);
        expect(texto(document.body)).toContain('Aún nadie te escribió');
        expect((botonPorTexto(document.body, 'Marcar como vendido') as HTMLButtonElement).disabled).toBeTrue();
    });
});

describe('ocultar y volver a mostrar una publicación', () => {
    beforeEach(() => { localStorage.clear(); bd.configurarPersistencia(false); bd.reiniciar(); });
    afterEach(() => { config.usarMock = false; localStorage.clear(); });

    it('en modo demostración alterna entre ACTIVA y OCULTA', async () => {
        config.usarMock = true;
        const id = bd.listarPublicaciones({}).contenido[0].id;
        expect((await publicacionesService.cambiarVisibilidad(id, false)).estado).toBe('OCULTA');
        expect((await publicacionesService.cambiarVisibilidad(id, true)).estado).toBe('ACTIVA');
    });

    it('en modo API usa PATCH /publicaciones/{id}/visibilidad', async () => {
        config.usarMock = false;
        const espia = spyOn(window, 'fetch').and.resolveTo(respuestaJson({ id: 3, estado: 'OCULTA' }));
        await publicacionesService.cambiarVisibilidad(3, false);
        const [url, init] = espia.calls.mostRecent().args as [string, RequestInit];
        expect(url).toContain('/publicaciones/3/visibilidad');
        expect(init.method).toBe('PATCH');
        expect(JSON.parse(String(init.body))).toEqual({ visible: false });
    });
});
