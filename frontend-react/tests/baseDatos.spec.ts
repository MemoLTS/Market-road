import * as bd from '../src/data/baseDatos';
import type { DatosPublicacion } from '../src/types/app';

describe('base de datos simulada (CRUD)', () => {
    beforeEach(() => { bd.configurarPersistencia(false); bd.reiniciar(); });

    it('READ: lista las publicaciones activas con paginación', () => {
        const pag = bd.listarPublicaciones({ pagina: 0, tamano: 3 });
        expect(pag.contenido.length).toBe(3);
        expect(pag.total).toBe(8);
        expect(pag.totalPaginas).toBe(3);
    });

    it('READ: filtra por texto, categoría y rango de precio', () => {
        expect(bd.listarPublicaciones({ q: 'bicicleta' }).total).toBe(1);
        expect(bd.listarPublicaciones({ categorias: ['HOGAR'] }).contenido[0].titulo).toContain('Sofá');
        expect(bd.listarPublicaciones({ precioMin: '100000', precioMax: '200000' }).total).toBe(1);
    });

    it('READ: ordena por precio ascendente y descendente', () => {
        const asc = bd.listarPublicaciones({ orden: 'PRECIO_ASC' }).contenido.map(p => p.precio);
        expect(asc).toEqual([...asc].sort((a, b) => a - b));
        const desc = bd.listarPublicaciones({ orden: 'PRECIO_DESC' }).contenido.map(p => p.precio);
        expect(desc[0]).toBeGreaterThan(desc[desc.length - 1]);
    });

    it('CREATE: agrega una publicación al inicio con id nuevo', () => {
        const usuario = bd.listarUsuarios()[0];
        const nueva = bd.crearPublicacion({ titulo: ' Mesa ', precio: '45000,5', descripcion: 'Mesa de madera', ubicacion: 'Coronel', categoria: 'HOGAR', modalidadesEntrega: ['ENVIO'] } as DatosPublicacion, usuario);
        expect(nueva.id).toBe(9);
        expect(nueva.titulo).toBe('Mesa');
        expect(nueva.precio).toBe(45000.5);
        expect(nueva.modalidadesEntrega.length).toBe(1);
        expect(bd.listarPublicaciones().total).toBe(9);
    });

    it('UPDATE: cambia campos permitidos y devuelve null si no existe', () => {
        const editada = bd.actualizarPublicacion(1, { titulo: 'Notebook Dell', precio: '250000' });
        expect(editada.titulo).toBe('Notebook Dell');
        expect(editada.precio).toBe(250000);
        expect(bd.actualizarPublicacion(999, { titulo: 'x' })).toBeNull();
    });

    it('DELETE: la baja es lógica y deja de aparecer', () => {
        expect(bd.eliminarPublicacion(2)).toBe(true);
        expect(bd.obtenerPublicacion(2)).toBeNull();
        expect(bd.listarPublicaciones().total).toBe(7);
        expect(bd.eliminarPublicacion(2)).toBe(false);
    });

    it('autentica y rechaza credenciales inválidas', () => {
        expect(bd.autenticar('demo@marketroad.cl', 'demo1234').usuario.apodo).toBe('demo');
        expect(() => bd.autenticar('demo@marketroad.cl', 'mala')).toThrowError('Correo o contraseña incorrectos.');
    });

    it('registra usuarios y rechaza correos duplicados sin exponer la contraseña', () => {
        const u = bd.registrarUsuario({ nombre: 'Ana', apellido: 'Pérez', apodo: 'ana', correo: 'ANA@correo.cl', contrasena: 'clave1234' });
        expect((u as { contrasena?: string }).contrasena).toBeUndefined();
        expect(() => bd.registrarUsuario({ nombre: 'Otra', apellido: 'Persona', apodo: '', correo: 'ana@correo.cl', contrasena: 'clave1234' })).toThrowError('El correo ya está registrado.');
    });
});
