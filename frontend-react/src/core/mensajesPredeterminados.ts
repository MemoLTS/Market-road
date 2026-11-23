import type { Rol } from '../types/api';

/** Mensajes predeterminados para el PRIMER mensaje que un comprador le envía al vendedor desde la publicación. */
export const PRIMER_MENSAJE: readonly string[] = [
    'Hola, ¿sigue disponible?',
    'Hola, ¿aceptas una oferta por este producto?',
    'Hola, ¿dónde podríamos juntarnos para ver el producto?',
    'Hola, ¿hacen envío a otra ciudad?',
    'Hola, ¿tienes más fotos del producto?',
    'Hola, ¿cuál es el estado real del producto?',
];

/** Respuestas rápidas dentro de una conversación ya iniciada, según el rol de quien escribe. */
export const RESPUESTAS_RAPIDAS: Record<Rol, readonly string[]> = {
    COMPRADOR: ['¿Sigue disponible?', '¿Aceptas una oferta?', '¿Dónde podríamos juntarnos?', 'Gracias'],
    VENDEDOR: ['Sí, sigue disponible', 'Podemos coordinar la entrega por aquí', '¿Cuándo podrías pasar?', 'Gracias'],
};

const sinTildes = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Autocompletado: devuelve los mensajes predeterminados que contienen lo escrito (sin distinguir mayúsculas ni tildes).
 * Con el campo vacío devuelve todos; si lo escrito ya es exactamente un mensaje, no sugiere nada.
 */
export function sugerirMensajes(escrito: string, lista: readonly string[], maximo = 6): string[] {
    const q = sinTildes(escrito.trim());
    if (lista.some(m => sinTildes(m) === q) && q !== '') return [];
    return lista.filter(m => q === '' || sinTildes(m).includes(q)).slice(0, maximo);
}
