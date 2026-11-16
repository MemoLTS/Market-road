/** Cálculo del recorte cuadrado de la foto de perfil (puro, sin DOM: se prueba directamente). */
export interface Recorte {
    origenX: number;
    origenY: number;
    lado: number;
}

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;

const acotar = (valor: number, min: number, max: number): number => Math.min(max, Math.max(min, valor));

/**
 * Devuelve el cuadrado que se conserva de una imagen de `ancho` x `alto`.
 * - `zoom` (1 a 3) achica el cuadrado: más zoom, menos zona visible.
 * - `x` e `y` (0 a 100, 50 = centro) desplazan el cuadrado dentro de la imagen.
 */
export function calcularRecorte(ancho: number, alto: number, zoom: number, x = 50, y = 50): Recorte {
    const z = acotar(Number.isFinite(zoom) ? zoom : ZOOM_MIN, ZOOM_MIN, ZOOM_MAX);
    const lado = Math.min(ancho, alto) / z;
    return {
        origenX: (ancho - lado) * acotar(x, 0, 100) / 100,
        origenY: (alto - lado) * acotar(y, 0, 100) / 100,
        lado,
    };
}
