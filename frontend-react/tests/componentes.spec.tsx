import Alert from '../src/components/common/Alert';
import Pagination from '../src/components/common/Pagination';
import PublicationCard from '../src/components/publicaciones/PublicationCard';
import PublicationList from '../src/components/publicaciones/PublicationList';
import FiltersForm from '../src/components/publicaciones/FiltersForm';
import type { ValoresFiltros } from '../src/components/publicaciones/FiltersForm';
import { desmontarTodo, clic, enviarFormulario, escribir, montar, montarConApp, publicacionDePrueba, texto } from './helpers';
import { Router } from '../src/core/router';

const categorias = [{ codigo: 'HOGAR', nombre: 'Hogar y jardín' }, { codigo: 'MODA', nombre: 'Moda y accesorios' }];
const filtrosVacios: ValoresFiltros = { q: '', categorias: [], precioMin: '', precioMax: '', ubicacion: null, radioKm: '', orden: 'RELEVANCIA' };

describe('Renderizado correcto: PublicationList', () => {
    afterEach(desmontarTodo);

    it('renderiza una tarjeta por cada publicación recibida', async () => {
        const datos = [1, 2, 3].map(id => publicacionDePrueba({ id, titulo: `Artículo ${id}` }));
        const c = await montar(<Router><PublicationList publicaciones={datos} /></Router>);
        expect(c.querySelectorAll('[data-testid=publication-card]').length).toBe(3);
        expect(texto(c)).toContain('Artículo 2');
    });

    it('muestra el mensaje de vacío cuando no hay datos', async () => {
        const c = await montar(<Router><PublicationList publicaciones={[]} vacio="Nada por aquí" /></Router>);
        expect(c.querySelector('[data-testid=lista-vacia]').textContent).toBe('Nada por aquí');
    });

    it('muestra el estado de carga y oculta la lista mientras carga', async () => {
        const c = await montar(<Router><PublicationList publicaciones={[publicacionDePrueba()]} cargando /></Router>);
        expect(c.querySelector('[role=status]')).not.toBeNull();
        expect(c.querySelector('[data-testid=publication-list]')).toBeNull();
    });

    it('muestra el error de la API en vez de la lista', async () => {
        const c = await montar(<Router><PublicationList publicaciones={[]} error="Falló la carga" /></Router>);
        expect(c.querySelector('[role=alert]').textContent).toBe('Falló la carga');
    });

    it('usa clases de grilla de Bootstrap para el diseño responsivo', async () => {
        const c = await montar(<Router><PublicationList publicaciones={[publicacionDePrueba()]} /></Router>);
        const col = c.querySelector('.row > div');
        ['col-12', 'col-sm-6', 'col-lg-4', 'col-xl-3'].forEach(clase => expect(col.classList.contains(clase)).toBe(true));
    });
});

describe('Props: PublicationCard', () => {
    afterEach(desmontarTodo);

    it('muestra título, precio formateado, categoría y enlace al detalle', async () => {
        const c = await montar(<Router><PublicationCard publicacion={publicacionDePrueba({ id: 7, precio: 150000 })} /></Router>);
        expect(texto(c)).toContain('Bicicleta');
        expect(texto(c)).toContain('$150.000');
        expect(texto(c)).toContain('Deportes y ocio');
        expect(c.querySelector('a').getAttribute('href')).toBe('#/publicaciones/7');
    });

    it('muestra la insignia "Vendida" solo cuando corresponde (renderizado condicional)', async () => {
        const a = await montar(<Router><PublicationCard publicacion={publicacionDePrueba({ estado: 'ACTIVA' })} /></Router>);
        expect(texto(a)).not.toContain('Vendida');
        const b = await montar(<Router><PublicationCard publicacion={publicacionDePrueba({ estado: 'VENDIDA' })} /></Router>);
        expect(texto(b)).toContain('Vendida');
    });
});

describe('Renderizado condicional: Alert', () => {
    afterEach(desmontarTodo);

    it('no renderiza nada sin mensaje', async () => {
        const c = await montar(<Alert mensaje="" />);
        expect(c.innerHTML).toBe('');
    });

    it('renderiza el mensaje con role=alert y la clase del tipo', async () => {
        const c = await montar(<Alert mensaje="Cuidado" tipo="warning" />);
        const alerta = c.querySelector('[role=alert]');
        expect(alerta.textContent).toBe('Cuidado');
        expect(alerta.classList.contains('alert-warning')).toBe(true);
    });

    it('ejecuta onCerrar al hacer clic en el botón de cerrar (evento)', async () => {
        const onCerrar = jasmine.createSpy('onCerrar');
        const c = await montar(<Alert mensaje="Aviso" onCerrar={onCerrar} />);
        await clic(c.querySelector('.btn-close'));
        expect(onCerrar).toHaveBeenCalledTimes(1);
    });
});

describe('Props y eventos: Pagination', () => {
    afterEach(desmontarTodo);

    it('no se muestra con una sola página', async () => {
        const c = await montar(<Pagination pagina={0} totalPaginas={1} onCambiar={() => {}} />);
        expect(c.innerHTML).toBe('');
    });

    it('deshabilita "Anterior" en la primera página y llama a onCambiar con la siguiente', async () => {
        const onCambiar = jasmine.createSpy('onCambiar');
        const c = await montar(<Pagination pagina={0} totalPaginas={3} onCambiar={onCambiar} />);
        const botones = Array.from(c.querySelectorAll('button'));
        expect(botones[0].disabled).toBe(true);
        await clic(botones.find(b => b.textContent === 'Siguiente'));
        expect(onCambiar).toHaveBeenCalledWith(1);
    });

    it('marca la página actual como activa', async () => {
        const c = await montar(<Pagination pagina={1} totalPaginas={3} onCambiar={() => {}} />);
        expect(c.querySelector('.page-item.active').textContent).toBe('2');
    });
});

describe('Estado y eventos: FiltersForm', () => {
    afterEach(desmontarTodo);

    it('cambia su estado al escribir y entrega los valores al aplicar', async () => {
        const onAplicar = jasmine.createSpy('onAplicar');
        const c = await montar(<FiltersForm categorias={categorias} valores={filtrosVacios} onAplicar={onAplicar} onLimpiar={() => {}} permitirUbicacion={false} />);
        await escribir(c.querySelector('#filtroTexto'), '  silla  ');
        await escribir(c.querySelector('#filtroPrecioMax'), '5000');
        await clic(c.querySelector('#cat-HOGAR'));
        await enviarFormulario(c.querySelector('form'));
        expect(onAplicar).toHaveBeenCalledWith(jasmine.objectContaining({ q: 'silla', precioMax: '5000', categorias: ['HOGAR'] }));
    });

    it('muestra un error y NO aplica si el rango de precios es inválido', async () => {
        const onAplicar = jasmine.createSpy('onAplicar');
        const c = await montar(<FiltersForm categorias={categorias} valores={filtrosVacios} onAplicar={onAplicar} onLimpiar={() => {}} permitirUbicacion={false} />);
        await escribir(c.querySelector('#filtroPrecioMin'), '900');
        await escribir(c.querySelector('#filtroPrecioMax'), '100');
        await enviarFormulario(c.querySelector('form'));
        expect(c.querySelector('[role=alert]').textContent).toContain('mínimo no puede ser mayor');
        expect(onAplicar).not.toHaveBeenCalled();
    });

    it('llama a onLimpiar al pulsar "Limpiar"', async () => {
        const onLimpiar = jasmine.createSpy('onLimpiar');
        const c = await montar(<FiltersForm categorias={categorias} valores={filtrosVacios} onAplicar={() => {}} onLimpiar={onLimpiar} permitirUbicacion={false} />);
        await clic(Array.from(c.querySelectorAll('button')).find(b => b.textContent === 'Limpiar'));
        expect(onLimpiar).toHaveBeenCalled();
    });

    it('renderiza un botón por categoría recibida', async () => {
        const c = await montar(<FiltersForm categorias={categorias} valores={filtrosVacios} onAplicar={() => {}} onLimpiar={() => {}} permitirUbicacion={false} />);
        expect(c.querySelectorAll('input.btn-check').length).toBe(2);
    });
});
