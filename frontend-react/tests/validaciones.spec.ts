import {
    primerError, validarContrasenaNueva, validarCorreo, validarFotos, validarMonto, validarRangoPrecios, validarTitulo,
} from '../src/core/validaciones';

describe('validaciones (lógica pura)', () => {
    it('acepta un monto válido con coma o punto y hasta 2 decimales', () => {
        expect(validarMonto('1500')).toBeNull();
        expect(validarMonto('1500,50')).toBeNull();
        expect(validarMonto(99.99)).toBeNull();
    });

    it('rechaza montos vacíos, cero, negativos o con más de 2 decimales', () => {
        expect(validarMonto('')).toContain('obligatorio');
        expect(validarMonto('0')).toContain('mayor que 0');
        expect(validarMonto('-5')).toContain('número mayor que 0');
        expect(validarMonto('10.123')).toContain('hasta 2 decimales');
    });

    it('valida el formato del correo', () => {
        expect(validarCorreo('ana@correo.cl')).toBeNull();
        expect(validarCorreo('ana@correo')).toBe('Ingresa un correo con formato válido.');
        expect(validarCorreo('  ')).toBe('El correo es obligatorio.');
    });

    it('exige contraseña de 8 a 32 caracteres con letra y número, sin espacios', () => {
        expect(validarContrasenaNueva('clave1234')).toBeNull();
        expect(validarContrasenaNueva('corta1')).toContain('entre 8 y 32');
        expect(validarContrasenaNueva('soloLetrasAqui')).toContain('una letra y un número');
        expect(validarContrasenaNueva('con espacio 1')).toContain('espacios');
    });

    it('valida cantidad, tipo y peso de las fotos', () => {
        const foto = { type: 'image/png', size: 1000 };
        expect(validarFotos([foto])).toBeNull();
        expect(validarFotos([])).toContain('entre 1 y 8');
        expect(validarFotos([{ type: 'application/pdf', size: 10 }])).toContain('JPG, PNG o WEBP');
        expect(validarFotos([{ type: 'image/png', size: 6 * 1024 * 1024 }])).toContain('5 MB');
    });

    it('rechaza un rango de precios invertido', () => {
        expect(validarRangoPrecios('100', '500')).toBeNull();
        expect(validarRangoPrecios('500', '100')).toContain('mínimo no puede ser mayor');
        expect(validarRangoPrecios('-1', '')).toContain('igual o mayor que 0');
    });

    it('rechaza títulos con saltos de línea o muy cortos', () => {
        expect(validarTitulo('Mesa de comedor')).toBeNull();
        expect(validarTitulo('ab')).toContain('entre 3 y 100');
        expect(validarTitulo('Hola\nmundo')).toContain('saltos de línea');
    });

    it('primerError devuelve el primer mensaje no nulo', () => {
        expect(primerError(null, 'segundo', 'tercero')).toBe('segundo');
        expect(primerError(null, null)).toBeNull();
    });
});
