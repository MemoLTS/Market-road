import ChatThread from '../src/components/chat/ChatThread.jsx';
import LoginForm from '../src/components/auth/LoginForm.jsx';
import RegisterForm from '../src/components/auth/RegisterForm.jsx';
import PublicationForm, { validarPublicacion } from '../src/components/publicaciones/PublicationForm.jsx';
import { authService } from '../src/services/authService.js';
import { clic, desmontarTodo, enviarFormulario, escribir, esperar, montar, montarConApp } from './helpers.jsx';

const categorias = [{ codigo: 'HOGAR', nombre: 'Hogar y jardín' }];

describe('LoginForm (estado, eventos y mocks)', () => {
    beforeEach(() => localStorage.clear());
    afterEach(desmontarTodo);

    it('valida campos vacíos sin llamar al servicio', async () => {
        const login = spyOn(authService, 'login');
        const c = await montarConApp(<LoginForm />);
        await enviarFormulario(c.querySelector('form'));
        expect(c.querySelector('[role=alert]').textContent).toBe('Completa correo y contraseña.');
        expect(login).not.toHaveBeenCalled();
    });

    it('llama a authService.login con los datos escritos y avisa el éxito', async () => {
        const login = spyOn(authService, 'login').and.resolveTo({ id: 1 });
        const onExito = jasmine.createSpy('onExito');
        const c = await montarConApp(<LoginForm onExito={onExito} />);
        await escribir(c.querySelector('#loginCorreo'), ' ana@correo.cl ');
        await escribir(c.querySelector('#loginContrasena'), 'clave1234');
        await enviarFormulario(c.querySelector('form'));
        await esperar();
        expect(login).toHaveBeenCalledWith('ana@correo.cl', 'clave1234');
        expect(onExito).toHaveBeenCalled();
    });

    it('muestra el error que devuelve la API', async () => {
        spyOn(authService, 'login').and.rejectWith(new Error('Correo o contraseña incorrectos.'));
        const c = await montarConApp(<LoginForm />);
        await escribir(c.querySelector('#loginCorreo'), 'ana@correo.cl');
        await escribir(c.querySelector('#loginContrasena'), 'clave1234');
        await enviarFormulario(c.querySelector('form'));
        await esperar();
        expect(c.querySelector('[role=alert]').textContent).toBe('Correo o contraseña incorrectos.');
    });
});

describe('RegisterForm (validación en vivo)', () => {
    beforeEach(() => localStorage.clear());
    afterEach(desmontarTodo);

    it('marca un correo inválido al perder el foco', async () => {
        const c = await montarConApp(<RegisterForm />);
        const correo = c.querySelector('#regCorreo');
        await escribir(correo, 'sin-arroba');
        await esperar();
        correo.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        await esperar();
        expect(correo.classList.contains('is-invalid')).toBe(true);
        expect(c.textContent).toContain('formato válido');
    });

    it('no registra si la contraseña es débil', async () => {
        const registrar = spyOn(authService, 'registrar');
        const c = await montarConApp(<RegisterForm />);
        await escribir(c.querySelector('#regNombre'), 'Ana');
        await escribir(c.querySelector('#regApellido'), 'Pérez');
        await escribir(c.querySelector('#regCorreo'), 'ana@correo.cl');
        await escribir(c.querySelector('#regContrasena'), 'abc');
        await enviarFormulario(c.querySelector('form'));
        expect(c.querySelector('[role=alert]').textContent).toContain('entre 8 y 32');
        expect(registrar).not.toHaveBeenCalled();
    });

    it('registra con datos válidos y limpia el formulario', async () => {
        const registrar = spyOn(authService, 'registrar').and.resolveTo({ sesionIniciada: false });
        const c = await montarConApp(<RegisterForm />);
        await escribir(c.querySelector('#regNombre'), 'Ana');
        await escribir(c.querySelector('#regApellido'), 'Pérez');
        await escribir(c.querySelector('#regCorreo'), 'ana@correo.cl');
        await escribir(c.querySelector('#regContrasena'), 'clave1234');
        await enviarFormulario(c.querySelector('form'));
        await esperar();
        expect(registrar).toHaveBeenCalledWith(jasmine.objectContaining({ nombre: 'Ana', correo: 'ana@correo.cl' }));
        expect(c.querySelector('#regNombre').value).toBe('');
        expect(c.querySelector('.alert-success')).not.toBeNull();
    });
});

describe('PublicationForm', () => {
    afterEach(desmontarTodo);

    const valido = { titulo: 'Mesa', precio: '1000', descripcion: 'Mesa de madera maciza', ubicacion: 'Coronel', categoria: 'HOGAR', modalidadesEntrega: ['ENVIO'], fotos: [{ type: 'image/png', size: 100 }], lugar: { nombre: 'Coronel', ubicacion: { lat: -37, lon: -73 } } };

    it('validarPublicacion acepta datos completos y detecta cada faltante', () => {
        expect(validarPublicacion(valido)).toBeNull();
        expect(validarPublicacion({ ...valido, categoria: '' })).toBe('Selecciona una categoría.');
        expect(validarPublicacion({ ...valido, modalidadesEntrega: [] })).toContain('modalidad de entrega');
        expect(validarPublicacion({ ...valido, lugar: null })).toContain('Busca y elige la localidad');
        expect(validarPublicacion({ ...valido, lugar: null }, { exigirLugar: false })).toBeNull();
    });

    it('en modo editar no exige fotos ni modalidades', () => {
        expect(validarPublicacion({ ...valido, fotos: [], modalidadesEntrega: [], lugar: null }, { modo: 'editar' })).toBeNull();
    });

    it('envía los datos del formulario a onEnviar (estado → props)', async () => {
        const onEnviar = jasmine.createSpy('onEnviar').and.resolveTo();
        const c = await montar(<PublicationForm categorias={categorias} onEnviar={onEnviar} exigirLugar={false} />);
        await escribir(c.querySelector('#pubTitulo'), 'Mesa de comedor');
        await escribir(c.querySelector('#pubPrecio'), '45000');
        await escribir(c.querySelector('#pubCategoria'), 'HOGAR');
        await escribir(c.querySelector('#pubDescripcion'), 'Mesa de madera maciza para seis personas');
        await escribir(c.querySelector('#pubUbicacion'), 'Concepción');
        await clic(c.querySelector('#mod-ENVIO'));
        const entrada = c.querySelector('#pubFotos');
        const archivo = new File(['x'], 'foto.png', { type: 'image/png' });
        const transferencia = new DataTransfer();
        transferencia.items.add(archivo);
        entrada.files = transferencia.files;
        await escribir(c.querySelector('#pubTitulo'), 'Mesa de comedor');
        entrada.dispatchEvent(new Event('change', { bubbles: true }));
        await esperar();
        await enviarFormulario(c.querySelector('form'));
        await esperar();
        expect(onEnviar).toHaveBeenCalledWith(jasmine.objectContaining({ titulo: 'Mesa de comedor', precio: '45000', categoria: 'HOGAR', modalidadesEntrega: ['ENVIO'] }));
    });

    it('muestra el error y no llama a onEnviar si falta el título', async () => {
        const onEnviar = jasmine.createSpy('onEnviar');
        const c = await montar(<PublicationForm categorias={categorias} onEnviar={onEnviar} />);
        await enviarFormulario(c.querySelector('form'));
        expect(c.querySelector('[role=alert]').textContent).toContain('título');
        expect(onEnviar).not.toHaveBeenCalled();
    });
});

describe('ChatThread (eventos de usuario)', () => {
    afterEach(desmontarTodo);

    const mensajes = [
        { id: 1, mio: false, tipo: 'TEXTO', contenido: 'Hola, ¿sigue disponible?', fecha: '2026-10-01T10:00:00Z' },
        { id: 2, mio: true, tipo: 'TEXTO', contenido: 'Sí, sigue disponible', fecha: '2026-10-01T10:05:00Z', leido: true },
        { id: 3, mio: false, tipo: 'OFERTA', monto: 120000, estadoOferta: 'PENDIENTE', fecha: '2026-10-01T10:06:00Z' },
    ];

    it('renderiza todas las burbujas y marca las propias', async () => {
        const c = await montar(<ChatThread mensajes={mensajes} onEnviar={() => {}} />);
        expect(c.querySelectorAll('[data-testid=burbuja]').length).toBe(3);
        expect(c.querySelectorAll('.chat-burbuja.mia').length).toBe(1);
    });

    it('envía el mensaje escrito y limpia la caja', async () => {
        const onEnviar = jasmine.createSpy('onEnviar').and.resolveTo();
        const c = await montar(<ChatThread mensajes={[]} onEnviar={onEnviar} />);
        const caja = c.querySelector('textarea');
        await escribir(caja, '  Buenas tardes  ');
        await enviarFormulario(c.querySelector('form'));
        await esperar();
        expect(onEnviar).toHaveBeenCalledWith('Buenas tardes');
        expect(caja.value).toBe('');
    });

    it('envía con Enter pero no con Shift+Enter', async () => {
        const onEnviar = jasmine.createSpy('onEnviar').and.resolveTo();
        const c = await montar(<ChatThread mensajes={[]} onEnviar={onEnviar} />);
        const caja = c.querySelector('textarea');
        await escribir(caja, 'Hola');
        await esperar();
        caja.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
        await esperar();
        expect(onEnviar).not.toHaveBeenCalled();
        caja.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        await esperar();
        expect(onEnviar).toHaveBeenCalledWith('Hola');
    });

    it('rechaza un mensaje vacío', async () => {
        const onEnviar = jasmine.createSpy('onEnviar');
        const c = await montar(<ChatThread mensajes={[]} onEnviar={onEnviar} />);
        await enviarFormulario(c.querySelector('form'));
        expect(c.querySelector('[role=alert]')).not.toBeNull();
        expect(onEnviar).not.toHaveBeenCalled();
    });

    it('permite aceptar una oferta pendiente solo cuando puedeResponderOfertas', async () => {
        const onResponder = jasmine.createSpy('onResponder');
        const sin = await montar(<ChatThread mensajes={mensajes} onEnviar={() => {}} />);
        expect(sin.textContent).not.toContain('Aceptar');
        const con = await montar(<ChatThread mensajes={mensajes} onEnviar={() => {}} puedeResponderOfertas onResponderOferta={onResponder} />);
        await clic(Array.from(con.querySelectorAll('button')).find(b => b.textContent === 'Aceptar'));
        expect(onResponder).toHaveBeenCalledWith(3, true);
    });

    it('oculta la caja de texto cuando no se puede escribir', async () => {
        const c = await montar(<ChatThread mensajes={mensajes} onEnviar={() => {}} puedeEscribir={false} />);
        expect(c.querySelector('form')).toBeNull();
    });
});
