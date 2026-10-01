/**
 * Validaciones puras (sin DOM) para dar feedback inmediato en el navegador.
 * Reflejan las reglas del backend, que sigue siendo la validación autoritativa.
 * Cada función devuelve un mensaje de error, o null si el valor es válido.
 */

export type Resultado = string | null;

export const LIMITES = {
    titulo: { min: 3, max: 100 },
    descripcion: { min: 10, max: 1000 },
    ubicacion: { min: 2, max: 120 },
    mensaje: { min: 1, max: 1000 },
    nombre: { min: 3, max: 32 },
    apodo: { min: 3, max: 20 },
    contrasena: { min: 8, max: 32 },
    correo: { max: 100 },
    fotos: { min: 1, max: 8, maxMB: 5 },
    precioMaximo: 9_999_999_999.99,
} as const;

export const TIPOS_FOTO: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_NOMBRE = /^\p{L}[\p{L} '.-]*$/u;
const REGEX_APODO = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
// Caracteres de control (salvo \n y \t) y de dirección/ancho cero usados para falsear texto.
// eslint-disable-next-line no-control-regex
const REGEX_PROHIBIDOS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B\u202A-\u202E\u2066-\u2069]/;

export function tieneCaracteresProhibidos(texto: string): boolean {
    return REGEX_PROHIBIDOS.test(texto);
}

function largo(valor: string, etiqueta: string, min: number, max: number): Resultado {
    const n = valor.trim().length;
    if (n < min || n > max) {
        return min <= 1 && n === 0
            ? `${etiqueta} no puede estar vacío.`
            : `${etiqueta} debe tener entre ${min} y ${max} caracteres.`;
    }
    if (tieneCaracteresProhibidos(valor)) return `${etiqueta} contiene caracteres no permitidos.`;
    return null;
}

export function validarTitulo(valor: string): Resultado {
    if (/[\n\r]/.test(valor)) return 'El título no puede tener saltos de línea.';
    return largo(valor, 'El título', LIMITES.titulo.min, LIMITES.titulo.max);
}

export function validarDescripcion(valor: string): Resultado {
    return largo(valor, 'La descripción', LIMITES.descripcion.min, LIMITES.descripcion.max);
}

export function validarUbicacion(valor: string): Resultado {
    if (/[\n\r]/.test(valor)) return 'La ubicación no puede tener saltos de línea.';
    return largo(valor, 'La ubicación', LIMITES.ubicacion.min, LIMITES.ubicacion.max);
}

export function validarMensaje(valor: string): Resultado {
    return largo(valor, 'El mensaje', LIMITES.mensaje.min, LIMITES.mensaje.max);
}

/** Acepta texto o número; exige > 0, máximo 2 decimales y un tope. */
export function validarMonto(valor: string | number, etiqueta = 'El precio'): Resultado {
    const texto = String(valor).trim().replace(',', '.');
    if (texto === '') return `${etiqueta} es obligatorio.`;
    if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
        return `${etiqueta} debe ser un número mayor que 0 con hasta 2 decimales.`;
    }
    const n = Number(texto);
    if (!(n > 0)) return `${etiqueta} debe ser mayor que 0.`;
    if (n > LIMITES.precioMaximo) return `${etiqueta} es demasiado alto.`;
    return null;
}

export function validarRangoPrecios(min: string, max: string): Resultado {
    for (const [valor, nombre] of [[min, 'mínimo'], [max, 'máximo']] as const) {
        if (valor.trim() === '') continue;
        const n = Number(valor);
        if (!Number.isFinite(n) || n < 0) return `El precio ${nombre} debe ser un número igual o mayor que 0.`;
    }
    if (min.trim() !== '' && max.trim() !== '' && Number(min) > Number(max)) {
        return 'El precio mínimo no puede ser mayor que el máximo.';
    }
    return null;
}

export function validarCoordenadas(lat: number, lon: number): Resultado {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return 'Las coordenadas no son válidas.';
    }
    return null;
}

export interface ArchivoFoto {
    type: string;
    size: number;
}

export function validarFotos(fotos: readonly ArchivoFoto[]): Resultado {
    const { min, max, maxMB } = LIMITES.fotos;
    if (fotos.length < min || fotos.length > max) return `Debes seleccionar entre ${min} y ${max} fotos.`;
    for (const foto of fotos) {
        if (!TIPOS_FOTO.includes(foto.type)) return 'Solo se permiten fotos JPG, PNG o WEBP.';
        if (foto.size <= 0) return 'Una de las fotos está vacía.';
        if (foto.size > maxMB * 1024 * 1024) return `Cada foto puede pesar como máximo ${maxMB} MB.`;
    }
    return null;
}

export function validarCorreo(valor: string): Resultado {
    const v = valor.trim();
    if (!v) return 'El correo es obligatorio.';
    if (v.length > LIMITES.correo.max) return `El correo puede tener como máximo ${LIMITES.correo.max} caracteres.`;
    if (!REGEX_CORREO.test(v)) return 'Ingresa un correo con formato válido.';
    return null;
}

export function validarNombre(valor: string, etiqueta: 'El nombre' | 'El apellido'): Resultado {
    const v = valor.trim();
    if (v.length < LIMITES.nombre.min || v.length > LIMITES.nombre.max) {
        return `${etiqueta} debe tener entre ${LIMITES.nombre.min} y ${LIMITES.nombre.max} caracteres.`;
    }
    if (!REGEX_NOMBRE.test(v)) return `${etiqueta} solo puede contener letras, espacios, apóstrofes, puntos y guiones.`;
    return null;
}

export function validarApodo(valor: string): Resultado {
    const v = valor.trim();
    if (v.length < LIMITES.apodo.min || v.length > LIMITES.apodo.max) {
        return `El apodo debe tener entre ${LIMITES.apodo.min} y ${LIMITES.apodo.max} caracteres.`;
    }
    if (!REGEX_APODO.test(v)) return 'El apodo solo puede tener letras, números, guion, guion bajo y punto, sin espacios.';
    return null;
}

/** Para crear cuenta: largo + al menos una letra y un número, sin espacios. */
export function validarContrasenaNueva(valor: string): Resultado {
    if (valor.length < LIMITES.contrasena.min || valor.length > LIMITES.contrasena.max) {
        return `La contraseña debe tener entre ${LIMITES.contrasena.min} y ${LIMITES.contrasena.max} caracteres.`;
    }
    if (/\s/.test(valor)) return 'La contraseña no puede tener espacios.';
    if (!/\p{L}/u.test(valor) || !/\d/.test(valor)) return 'La contraseña debe incluir al menos una letra y un número.';
    return null;
}

/** Devuelve el primer error de una lista de validaciones. */
export function primerError(...resultados: Resultado[]): Resultado {
    return resultados.find(r => r !== null) ?? null;
}
