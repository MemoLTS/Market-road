import FormularioPersonal, { validarPersonal } from '../src/components/soporte/FormularioPersonal';
import MapaSelector from '../src/components/publicaciones/MapaSelector';
import PublicationForm from '../src/components/publicaciones/PublicationForm';
import { config } from '../src/config';
import { cargarLeaflet, URL_LEAFLET_JS } from '../src/core/mapa';
import type { LeafletEvento, LeafletLib } from '../src/core/mapa';
import { calcularRecorte } from '../src/core/recorte';
import { Equipo } from '../src/pages/SoportePanelPage';
import { FotoPerfil } from '../src/pages/PerfilPage';
import type { GeneradorFoto } from '../src/pages/PerfilPage';
import { authService } from '../src/services/authService';
import { soportePanelService } from '../src/services/soporteService';
import { clic, desmontarTodo, enviarFormulario, escribir, esperar, montar, respuestaJson, texto } from './helpers';

/** Doble de Leaflet: guarda el manejador de clic para poder simular que la persona toca el mapa. */
function leafletFalso() {
    const estado = { clic: null as null | ((e: LeafletEvento) => void), marcadores: [] as [number, number][], removido: false };
    const mapa = {
        setView: () => mapa,
        on: (_: 'click', fn: (e: LeafletEvento) => void) => { estado.clic = fn; return mapa; },
        invalidateSize: () => undefined,
        remove: () => { estado.removido = true; },
    };
    const lib: LeafletLib = {
        map: () => mapa,
        tileLayer: () => ({ addTo: () => undefined }),
        marker: (p) => { estado.marcadores.push(p); const m = { addTo: () => m, setLatLng: (q: [number, number]) => { estado.marcadores.push(q); return m; } }; return m; },
    };
    return { estado, lib };
}

const globalL = (): { L?: LeafletLib } => window as unknown as { L?: LeafletLib };

describe('calcularRecorte (zoom y posición de la foto de perfil)', () => {
    it('sin zoom conserva el lado menor y, centrado, deja márgenes iguales', () => {
        expect(calcularRecorte(800, 600, 1)).toEqual({ origenX: 100, origenY: 0, lado: 600 });
    });

    it('con zoom 2 el cuadrado mide la mitad y se mueve con x e y', () => {
        expect(calcularRecorte(600, 600, 2, 0, 0)).toEqual({ origenX: 0, origenY: 0, lado: 300 });
        expect(calcularRecorte(600, 600, 2, 100, 100)).toEqual({ origenX: 300, origenY: 300, lado: 300 });
    });

    it('acota zoom y posición a sus rangos válidos', () => {
        expect(calcularRecorte(600, 600, 99, 50, 50).lado).toBe(200);
        expect(calcularRecorte(600, 600, 0, 50, 50).lado).toBe(600);
        expect(calcularRecorte(600, 600, 2, -40, 500)).toEqual({ origenX: 0, origenY: 300, lado: 300 });
        expect(calcularRecorte(600, 600, NaN).lado).toBe(600);
    });
});

describe('cargarLeaflet y MapaSelector', () => {
    afterEach(async () => {
        await desmontarTodo();
        delete globalL().L;
        document.querySelectorAll(`script[src="${URL_LEAFLET_JS}"]`).forEach(s => s.remove());
    });

    it('reutiliza window.L si ya existe, sin descargar nada', async () => {
        const { lib } = leafletFalso();
        globalL().L = lib;
        expect(await cargarLeaflet()).toBe(lib);
        expect(document.querySelector(`script[src="${URL_LEAFLET_JS}"]`)).toBeNull();
    });

    it('un clic en el mapa entrega las coordenadas por props', async () => {
        const { estado, lib } = leafletFalso();
        globalL().L = lib;
        const onSeleccionar = jasmine.createSpy('onSeleccionar');
        await montar(<MapaSelector onSeleccionar={onSeleccionar} />);
        await esperar(10);
        estado.clic?.({ latlng: { lat: -36.82, lng: -73.04 } });
        expect(onSeleccionar).toHaveBeenCalledWith({ lat: -36.82, lon: -73.04 });
        expect(estado.marcadores.length).toBe(1);
    });

    it('al desmontar libera el mapa', async () => {
        const { estado, lib } = leafletFalso();
        globalL().L = lib;
        await montar(<MapaSelector onSeleccionar={() => undefined} />);
        await esperar(10);
        await desmontarTodo();
        expect(estado.removido).toBeTrue();
    });

    it('si el CDN falla muestra un aviso y permite buscar por nombre', async () => {
        const c = await montar(<MapaSelector onSeleccionar={() => undefined} />);
        const script = document.querySelector(`script[src="${URL_LEAFLET_JS}"]`) as HTMLScriptElement;
        expect(script).not.toBeNull();
        await clic(null);
        script.onerror?.(new Event('error'));
        await esperar(10);
        expect(texto(c)).toContain('No se pudo cargar el mapa');
    });
});

describe('PublicationForm: mapa y unidades', () => {
    afterEach(async () => { await desmontarTodo(); delete globalL().L; });
    const categorias = [{ codigo: 'HOGAR', nombre: 'Hogar' }];

    it('el botón alterna el mapa (renderizado condicional)', async () => {
        globalL().L = leafletFalso().lib;
        const c = await montar(<PublicationForm categorias={categorias} onEnviar={async () => undefined} />);
        expect(c.querySelector('[data-testid="mapa"]')).toBeNull();
        const boton = Array.from(c.querySelectorAll('button')).find(b => b.textContent === 'Elegir en el mapa') as HTMLButtonElement;
        await clic(boton);
        expect(c.querySelector('[data-testid="mapa"]')).not.toBeNull();
        expect(boton.getAttribute('aria-expanded')).toBe('true');
        expect(boton.textContent).toBe('Ocultar mapa');
    });

    it('un clic en el mapa confirma la ciudad o pueblo del punto', async () => {
        const { estado, lib } = leafletFalso();
        globalL().L = lib;
        spyOn(window, 'fetch').and.resolveTo(respuestaJson({ lat: '-36.82', lon: '-73.04', address: { city: 'Concepción', state: 'Biobío', country: 'Chile' } }));
        const c = await montar(<PublicationForm categorias={categorias} onEnviar={async () => undefined} />);
        await clic(Array.from(c.querySelectorAll('button')).find(b => b.textContent === 'Elegir en el mapa'));
        await esperar(10);
        estado.clic?.({ latlng: { lat: -36.82, lng: -73.04 } });
        await esperar(1300);
        expect((c.querySelector('#pubUbicacion') as HTMLInputElement).value).toBe('Concepción, Biobío, Chile');
    });

    it('el campo de unidades es opcional y se entrega a onEnviar', async () => {
        const onEnviar = jasmine.createSpy('onEnviar').and.resolveTo();
        const c = await montar(<PublicationForm categorias={categorias} onEnviar={onEnviar} exigirLugar={false} />);
        expect((c.querySelector('#pubUnidades') as HTMLInputElement).placeholder).toBe('1');
        await escribir(c.querySelector('#pubTitulo'), 'Sillas de comedor');
        await escribir(c.querySelector('#pubPrecio'), '30000');
        await escribir(c.querySelector('#pubCategoria'), 'HOGAR');
        await escribir(c.querySelector('#pubDescripcion'), 'Sillas de madera en buen estado');
        await escribir(c.querySelector('#pubUbicacion'), 'Concepción');
        await escribir(c.querySelector('#pubUnidades'), '4');
        await clic(c.querySelector('#mod-ENVIO'));
        const entrada = c.querySelector('#pubFotos') as HTMLInputElement;
        const transferencia = new DataTransfer();
        transferencia.items.add(new File(['x'], 'foto.png', { type: 'image/png' }));
        entrada.files = transferencia.files;
        entrada.dispatchEvent(new Event('change', { bubbles: true }));
        await enviarFormulario(c.querySelector('form'));
        expect(onEnviar.calls.mostRecent().args[0].unidades).toBe('4');
    });
});

describe('FormularioPersonal (equipo de soporte)', () => {
    afterEach(desmontarTodo);
    const valores = { nombre: 'Sol Rojas', correo: 'sol@correo.cl', contrasena: 'Clave1234', rol: 'SOPORTE' as const, activo: true };

    it('validarPersonal exige contraseña al crear y la deja opcional al editar', () => {
        expect(validarPersonal(valores, false)).toEqual({ nombre: null, correo: null, contrasena: null });
        expect(validarPersonal({ ...valores, contrasena: '' }, false).contrasena).not.toBeNull();
        expect(validarPersonal({ ...valores, contrasena: '' }, true).contrasena).toBeNull();
        expect(validarPersonal({ ...valores, nombre: 'S' }, false).nombre).toContain('entre 2 y 80');
        expect(validarPersonal({ ...valores, correo: 'sin-arroba' }, false).correo).not.toBeNull();
    });

    it('en alta valida los campos y no llama a onGuardar si hay errores', async () => {
        const onGuardar = jasmine.createSpy('onGuardar').and.resolveTo();
        const c = await montar(<FormularioPersonal onGuardar={onGuardar} onCancelar={() => undefined} />);
        await enviarFormulario(c.querySelector('form'));
        expect(texto(c)).toContain('entre 2 y 80');
        expect(onGuardar).not.toHaveBeenCalled();
    });

    it('en alta entrega nombre, correo, contraseña y rol', async () => {
        const onGuardar = jasmine.createSpy('onGuardar').and.resolveTo();
        const c = await montar(<FormularioPersonal onGuardar={onGuardar} onCancelar={() => undefined} />);
        await escribir(c.querySelector('#perNombre'), valores.nombre);
        await escribir(c.querySelector('#perCorreo'), valores.correo);
        await escribir(c.querySelector('#perContrasena'), valores.contrasena);
        await escribir(c.querySelector('#perRol'), 'ADMIN');
        await enviarFormulario(c.querySelector('form'));
        expect(onGuardar).toHaveBeenCalledWith({ nombre: 'Sol Rojas', correo: 'sol@correo.cl', contrasena: 'Clave1234', rol: 'ADMIN' });
    });

    it('en edición bloquea el correo y no envía contraseña vacía', async () => {
        const onGuardar = jasmine.createSpy('onGuardar').and.resolveTo();
        const persona = { id: 4, nombre: 'Sol Rojas', correo: 'sol@correo.cl', rol: 'SOPORTE', rolNombre: 'Soporte', activo: true, fechaCreacion: '', ultimoAcceso: null, ticketsEnCurso: 0 } as const;
        const c = await montar(<FormularioPersonal persona={persona} onGuardar={onGuardar} onCancelar={() => undefined} />);
        expect((c.querySelector('#perCorreo') as HTMLInputElement).disabled).toBeTrue();
        await clic(c.querySelector('#perActivo'));
        await enviarFormulario(c.querySelector('form'));
        expect(onGuardar).toHaveBeenCalledWith({ nombre: 'Sol Rojas', rol: 'SOPORTE', activo: false });
    });

    it('muestra el error del servidor sin cerrar el formulario', async () => {
        const onGuardar = jasmine.createSpy('onGuardar').and.rejectWith(new Error('Ese correo ya existe'));
        const c = await montar(<FormularioPersonal onGuardar={onGuardar} onCancelar={() => undefined} />);
        await escribir(c.querySelector('#perNombre'), valores.nombre);
        await escribir(c.querySelector('#perCorreo'), valores.correo);
        await escribir(c.querySelector('#perContrasena'), valores.contrasena);
        await enviarFormulario(c.querySelector('form'));
        expect(texto(c)).toContain('Ese correo ya existe');
    });
});

describe('Equipo de soporte: alta, edición y activación', () => {
    afterEach(desmontarTodo);
    const persona = { id: 4, nombre: 'Sol Rojas', correo: 'sol@correo.cl', rol: 'SOPORTE' as const, rolNombre: 'Soporte', activo: true, fechaCreacion: '', ultimoAcceso: null, ticketsEnCurso: 1 };

    beforeEach(() => {
        spyOn(soportePanelService, 'personal').and.resolveTo([persona]);
        spyOn(soportePanelService, 'estadisticas').and.resolveTo({ totalTickets: 3, sinAsignar: 1, creadosUltimos7Dias: 2, personalActivo: 1 } as never);
    });

    it('lista al equipo con sus acciones', async () => {
        const c = await montar(<Equipo />);
        await esperar(20);
        expect(texto(c)).toContain('Sol Rojas');
        expect(texto(c)).toContain('Nueva persona');
        expect(texto(c)).toContain('Desactivar');
    });

    it('crea una persona y recarga la lista', async () => {
        const crear = spyOn(soportePanelService, 'crearPersonal').and.resolveTo(persona);
        const c = await montar(<Equipo />);
        await esperar(20);
        await clic(Array.from(c.querySelectorAll('button')).find(b => b.textContent === 'Nueva persona'));
        const form = document.querySelector('form[aria-label="Nueva persona del equipo"]') as HTMLFormElement;
        await escribir(form.querySelector('#perNombre') as HTMLInputElement, 'Ana Pérez');
        await escribir(form.querySelector('#perCorreo') as HTMLInputElement, 'ana@correo.cl');
        await escribir(form.querySelector('#perContrasena') as HTMLInputElement, 'Clave1234');
        await enviarFormulario(form);
        await esperar(20);
        expect(crear).toHaveBeenCalledWith({ nombre: 'Ana Pérez', correo: 'ana@correo.cl', contrasena: 'Clave1234', rol: 'SOPORTE' });
        expect(soportePanelService.personal).toHaveBeenCalledTimes(2);
        expect(texto(c)).toContain('Persona agregada al equipo');
    });

    it('edita una persona con PATCH', async () => {
        const actualizar = spyOn(soportePanelService, 'actualizarPersonal').and.resolveTo(persona);
        const c = await montar(<Equipo />);
        await esperar(20);
        await clic(Array.from(c.querySelectorAll('button')).find(b => b.textContent === 'Editar'));
        const form = document.querySelector('form[aria-label="Editar persona del equipo"]') as HTMLFormElement;
        await escribir(form.querySelector('#perRol') as HTMLSelectElement, 'ADMIN');
        await enviarFormulario(form);
        await esperar(20);
        expect(actualizar).toHaveBeenCalledWith(4, { nombre: 'Sol Rojas', rol: 'ADMIN', activo: true });
    });

    it('desactivar muestra el aviso y, si el backend lo rechaza, el error', async () => {
        const actualizar = spyOn(soportePanelService, 'actualizarPersonal').and.resolveTo(persona);
        const c = await montar(<Equipo />);
        await esperar(20);
        await clic(Array.from(c.querySelectorAll('button')).find(b => b.textContent === 'Desactivar'));
        await esperar(20);
        expect(actualizar).toHaveBeenCalledWith(4, { activo: false });
        expect(texto(c)).toContain('Cuenta desactivada');
        actualizar.and.rejectWith(new Error('No puedes desactivar tu propia cuenta'));
        await clic(Array.from(c.querySelectorAll('button')).find(b => b.textContent === 'Desactivar'));
        await esperar(20);
        expect(texto(c)).toContain('No puedes desactivar tu propia cuenta');
    });
});

describe('FotoPerfil: recorte con zoom y posición', () => {
    afterEach(desmontarTodo);

    /** Imagen PNG real (400 x 200) generada con canvas, para que el navegador pueda decodificarla. */
    async function imagen(tipo = 'image/png', ancho = 400, alto = 200): Promise<File> {
        const canvas = document.createElement('canvas');
        canvas.width = ancho; canvas.height = alto;
        canvas.getContext('2d')!.fillRect(0, 0, ancho, alto);
        const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b as Blob), tipo));
        return new File([blob], 'foto.png', { type: tipo });
    }
    async function elegir(c: HTMLElement, archivo: File): Promise<void> {
        const entrada = c.querySelector('#fotoPerfil') as HTMLInputElement;
        const transferencia = new DataTransfer();
        transferencia.items.add(archivo);
        entrada.files = transferencia.files;
        entrada.dispatchEvent(new Event('change', { bubbles: true }));
        await esperar(80);
    }

    it('rechaza formatos que no son JPG, PNG o WEBP', async () => {
        const c = await montar(<FotoPerfil onPreparada={() => undefined} />);
        await elegir(c, new File(['x'], 'archivo.gif', { type: 'image/gif' }));
        expect(texto(c)).toContain('Solo se permiten fotos JPG, PNG o WEBP');
        expect(c.querySelector('img')).toBeNull();
    });

    it('al elegir una foto muestra la vista previa y los controles', async () => {
        const c = await montar(<FotoPerfil onPreparada={() => undefined} />);
        await elegir(c, await imagen());
        expect(c.querySelector('img[alt="Vista previa de recorte"]')).not.toBeNull();
        expect(c.querySelector('#zoomFoto')).not.toBeNull();
        expect(c.querySelector('#posXFoto')).not.toBeNull();
        expect(c.querySelector('#posYFoto')).not.toBeNull();
    });

    it('el zoom y la posición cambian el estilo de la vista previa', async () => {
        const c = await montar(<FotoPerfil onPreparada={() => undefined} />);
        await elegir(c, await imagen());
        await escribir(c.querySelector('#zoomFoto') as HTMLInputElement, '2');
        await escribir(c.querySelector('#posXFoto') as HTMLInputElement, '20');
        const estilo = (c.querySelector('img[alt="Vista previa de recorte"]') as HTMLImageElement).style;
        expect(estilo.transform).toBe('scale(2)');
        expect(estilo.objectPosition).toContain('20%');
    });

    it('no tiene botón de guardado propio: entrega al perfil una función que genera el JPEG cuadrado de 512 x 512', async () => {
        let generar: GeneradorFoto | null = null;
        const c = await montar(<FotoPerfil onPreparada={g => { generar = g; }} />);
        expect(Array.from(c.querySelectorAll('button')).length).toBe(0);
        await elegir(c, await imagen());
        expect(generar).not.toBeNull();
        const enviada = await (generar as unknown as GeneradorFoto)();
        expect(enviada?.type).toBe('image/jpeg');
        const bitmap = await createImageBitmap(enviada as File);
        expect([bitmap.width, bitmap.height]).toEqual([512, 512]);
    });

    it('si se elige un archivo inválido, el perfil deja de tener foto pendiente', async () => {
        const estados: (GeneradorFoto | null)[] = [];
        const c = await montar(<FotoPerfil onPreparada={g => estados.push(g)} />);
        await elegir(c, await imagen());
        await elegir(c, new File(['x'], 'archivo.gif', { type: 'image/gif' }));
        expect(estados[0]).not.toBeNull();
        expect(estados[estados.length - 1]).toBeNull();
    });
});
