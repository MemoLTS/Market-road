import { useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { mensajeDeError } from '../../core/formato';
import type { Ubicacion } from '../../core/formato';
import { buscarLugares, buscarLugarEnCoordenadas } from '../../core/geocodificacion';
import type { Lugar } from '../../core/geocodificacion';
import MapaSelector from '../publicaciones/MapaSelector';

export interface ValorLocalidad {
    ubicacion: string;
    lugar: Lugar | null;
}

export interface PropsSelectorLocalidad {
    id: string;
    valor: ValorLocalidad;
    onCambiar: (valor: ValorLocalidad) => void;
    error?: string | null;
    /** Localidad ya guardada (se muestra como confirmada mientras no se edite). */
    original?: string;
    placeholder?: string;
}

/**
 * Selector de localidad compartido por publicaciones y perfil: escribir + «Buscar» (Enter) + elegir de la lista,
 * o «Elegir en el mapa». Al escribir se descarta la localidad confirmada, así el texto nunca queda distinto de lo validado.
 */
export default function SelectorLocalidad({ id, valor, onCambiar, error, original, placeholder = 'Ej.: Concepción' }: PropsSelectorLocalidad) {
    const [resultados, setResultados] = useState<Lugar[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [aviso, setAviso] = useState('');
    const [mapaAbierto, setMapaAbierto] = useState(false);
    const [estadoMapa, setEstadoMapa] = useState('');
    const controlador = useRef<AbortController | null>(null);

    async function buscar(): Promise<void> {
        const consulta = valor.ubicacion.trim();
        setResultados([]);
        if (consulta.length < 2) { setAviso('Escribe al menos 2 letras para buscar la localidad.'); return; }
        controlador.current?.abort();
        controlador.current = new AbortController();
        setBuscando(true);
        setAviso('');
        try {
            const lugares = await buscarLugares(consulta, controlador.current.signal);
            setResultados(lugares);
            if (!lugares.length) setAviso('No encontramos ciudades, pueblos o aldeas con ese nombre.');
        } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return;
            setAviso(mensajeDeError(e, 'No se pudo buscar la localidad.'));
        } finally {
            setBuscando(false);
        }
    }

    function elegir(lugar: Lugar): void {
        onCambiar({ ubicacion: lugar.nombre, lugar });
        setResultados([]);
        setAviso('');
    }

    async function elegirEnMapa(punto: Ubicacion): Promise<void> {
        setAviso('');
        setResultados([]);
        onCambiar({ ubicacion: valor.ubicacion, lugar: null });
        setEstadoMapa('Verificando la ciudad o pueblo de esta zona...');
        try {
            elegir(await buscarLugarEnCoordenadas(punto));
        } catch (e) {
            setAviso(mensajeDeError(e, 'No se pudo identificar una ciudad o pueblo en esa zona.'));
        } finally {
            setEstadoMapa('');
        }
    }

    const sinCambios = original !== undefined && !valor.lugar && valor.ubicacion.trim() === original.trim() && original.trim() !== '';

    return (
        <div>
            <div className="input-group">
                <input id={id} className={`form-control${error ? ' is-invalid' : ''}`} value={valor.ubicacion} placeholder={placeholder} autoComplete="off"
                    aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => { onCambiar({ ubicacion: e.target.value, lugar: null }); setResultados([]); setAviso(''); }}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); void buscar(); } }} />
                <button type="button" className="btn btn-outline-secondary" onClick={() => { void buscar(); }} disabled={buscando}>{buscando ? 'Buscando...' : 'Buscar'}</button>
                <button type="button" className="btn btn-outline-secondary" aria-expanded={mapaAbierto} onClick={() => setMapaAbierto(a => !a)}>
                    {mapaAbierto ? 'Ocultar mapa' : 'Elegir en el mapa'}
                </button>
            </div>
            {error && <div className="invalid-feedback d-block" id={`${id}-error`}>{error}</div>}
            {aviso && <div className="form-text" role="status">{aviso}</div>}
            {estadoMapa && <div className="form-text" role="status">{estadoMapa}</div>}
            {mapaAbierto && <div className="mt-2"><MapaSelector posicion={valor.lugar?.ubicacion ?? null} onSeleccionar={p => { void elegirEnMapa(p); }} /></div>}
            {resultados.length > 0 && !valor.lugar && (
                <ul className="list-group mt-2" aria-label="Resultados de localidades">
                    {resultados.map(l => (
                        <li key={`${l.nombre}-${l.ubicacion.lat}`} className="list-group-item list-group-item-action">
                            <button type="button" className="btn btn-link p-0 text-start" onClick={() => elegir(l)}>{l.nombre}</button>
                        </li>
                    ))}
                </ul>
            )}
            {valor.lugar && <div className="form-text text-success">✔ Localidad confirmada.</div>}
            {sinCambios && <div className="form-text text-success">Localidad guardada. Si la cambias, vuelve a elegirla en la lista o el mapa.</div>}
        </div>
    );
}
