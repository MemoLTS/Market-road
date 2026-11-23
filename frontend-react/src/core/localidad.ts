import type { Lugar } from './geocodificacion';
import type { Resultado } from './validaciones';
import { validarCoordenadas, validarUbicacion } from './validaciones';

export interface OpcionesLocalidad {
    /** Si es true, un texto vacío es un error (publicaciones). En el perfil la ciudad es opcional. */
    obligatoria?: boolean;
    /** Localidad que ya estaba guardada: se acepta tal cual mientras no se cambie. */
    original?: string;
    /** Complemento del mensaje: «de la publicación», «de tu perfil»… */
    de?: string;
}

/**
 * Regla ÚNICA de localidad para publicaciones y perfil.
 * El texto debe tener un largo válido y, si cambió, tiene que haberse elegido en la lista de resultados
 * o en el mapa (así siempre es una ciudad o pueblo real con coordenadas válidas).
 */
export function validarLocalidad(texto: string, lugar: Lugar | null, opciones: OpcionesLocalidad = {}): Resultado {
    const { obligatoria = true, original, de = 'de la publicación' } = opciones;
    const valor = texto.trim();
    if (!valor) return obligatoria ? `Busca y elige la localidad ${de}.` : null;
    const largo = validarUbicacion(valor);
    if (largo) return largo;
    if (lugar) return validarCoordenadas(lugar.ubicacion.lat, lugar.ubicacion.lon);
    if (original !== undefined && valor === original.trim()) return null;
    return `Busca y elige la localidad ${de} en la lista o márcala en el mapa.`;
}
