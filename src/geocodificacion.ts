import type { Ubicacion } from './util.js';

const URL_NOMINATIM = 'https://nominatim.openstreetmap.org';
const TIPOS_ASENTAMIENTO = new Set(['city', 'town', 'village', 'hamlet']);
const CLAVES_LOCALIDAD = ['city', 'town', 'village', 'hamlet', 'municipality'] as const;

interface DireccionGeografica {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    state?: string;
    country?: string;
}

interface ResultadoGeografico {
    lat?: string;
    lon?: string;
    type?: string;
    class?: string;
    category?: string;
    display_name?: string;
    address?: DireccionGeografica;
}

export interface Lugar {
    nombre: string;
    ubicacion: Ubicacion;
}

let colaSolicitudes: Promise<void> = Promise.resolve();
let ultimaSolicitud = 0;

export function esTipoAsentamiento(type: string | undefined): boolean {
    return type !== undefined && TIPOS_ASENTAMIENTO.has(type);
}

export function esResultadoAsentamiento(clase: string | undefined, type: string | undefined, tieneLocalidad: boolean): boolean {
    return (clase === 'place' && esTipoAsentamiento(type))
        || (clase === 'boundary' && type === 'administrative' && tieneLocalidad);
}

function nombreLocalidad(direccion: DireccionGeografica | undefined): string | null {
    if (!direccion) return null;
    for (const clave of CLAVES_LOCALIDAD) {
        const valor = direccion[clave];
        if (valor?.trim()) return valor.trim();
    }
    return null;
}

function tieneNombreAsentamiento(direccion: DireccionGeografica | undefined): boolean {
    return Boolean(direccion?.city?.trim() || direccion?.town?.trim()
        || direccion?.village?.trim() || direccion?.hamlet?.trim());
}

function crearLugar(resultado: ResultadoGeografico, requiereTipoAsentamiento: boolean): Lugar | null {
    const lat = Number(resultado.lat);
    const lon = Number(resultado.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return null;
    }
    if (requiereTipoAsentamiento
        && !esResultadoAsentamiento(
            resultado.class ?? resultado.category,
            resultado.type,
            tieneNombreAsentamiento(resultado.address))) {
        return null;
    }
    const localidad = nombreLocalidad(resultado.address);
    if (!localidad) return null;

    const contexto = [resultado.address?.state, resultado.address?.country]
        .filter((parte): parte is string => Boolean(parte?.trim()));
    return { nombre: [localidad, ...contexto].join(', '), ubicacion: { lat, lon } };
}

async function consultarNominatim<T>(ruta: string, signal?: AbortSignal): Promise<T> {
    const solicitud = colaSolicitudes.then(async () => {
        if (signal?.aborted) throw new DOMException('Solicitud cancelada.', 'AbortError');
        const espera = Math.max(0, 1000 - (Date.now() - ultimaSolicitud));
        if (espera) await new Promise(resolve => setTimeout(resolve, espera));
        if (signal?.aborted) throw new DOMException('Solicitud cancelada.', 'AbortError');

        ultimaSolicitud = Date.now();
        const controlador = new AbortController();
        const cancelar = () => controlador.abort();
        signal?.addEventListener('abort', cancelar, { once: true });
        const temporizador = setTimeout(cancelar, 12000);
        try {
            const respuesta = await fetch(`${URL_NOMINATIM}${ruta}`, {
                headers: { Accept: 'application/json' },
                signal: controlador.signal,
            });
            if (!respuesta.ok) {
                throw new Error('No se pudo consultar el servicio de ubicaciones. Inténtalo nuevamente.');
            }
            return await respuesta.json() as T;
        } catch (error) {
            if (signal?.aborted) throw new DOMException('Solicitud cancelada.', 'AbortError');
            if (controlador.signal.aborted) {
                throw new Error('La búsqueda de localidades tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.');
            }
            throw error;
        } finally {
            clearTimeout(temporizador);
            signal?.removeEventListener('abort', cancelar);
        }
    });
    colaSolicitudes = solicitud.then(() => undefined, () => undefined);
    return solicitud;
}

export async function buscarLugares(consulta: string, signal?: AbortSignal): Promise<Lugar[]> {
    const parametros = new URLSearchParams({
        q: consulta.trim(),
        format: 'jsonv2',
        addressdetails: '1',
        limit: '6',
        'accept-language': 'es-CL',
    });
    const resultados = await consultarNominatim<ResultadoGeografico[]>(`/search?${parametros}`, signal);
    return resultados
        .map(resultado => crearLugar(resultado, true))
        .filter((lugar): lugar is Lugar => lugar !== null);
}

export async function buscarLugarEnCoordenadas(ubicacion: Ubicacion, signal?: AbortSignal): Promise<Lugar> {
    const parametros = new URLSearchParams({
        lat: String(ubicacion.lat),
        lon: String(ubicacion.lon),
        format: 'jsonv2',
        addressdetails: '1',
        'accept-language': 'es-CL',
    });
    const resultado = await consultarNominatim<ResultadoGeografico>(`/reverse?${parametros}`, signal);
    const lugar = crearLugar(resultado, false);
    if (!lugar) {
        throw new Error('No encontramos una ciudad o pueblo real en esa zona. Marca un punto más cercano a una localidad.');
    }
    return { ...lugar, ubicacion };
}
