import { useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { mensajeDeError } from '../../core/formato';
import { buscarLugares } from '../../core/geocodificacion';
import type { Lugar } from '../../core/geocodificacion';

export interface PropsBuscadorCiudad {
    id: string;
    valor: string;
    /** Se llama al escribir y al elegir una sugerencia. */
    onCambiar: (valor: string) => void;
    placeholder?: string;
}

/**
 * Campo de ciudad con sugerencias reales: se escribe el nombre, se pulsa «Buscar» (o Enter) y se elige una ciudad o pueblo
 * de la lista (OpenStreetMap / Nominatim). Una sola responsabilidad: entregar el nombre de la localidad elegida.
 */
export default function BuscadorCiudad({ id, valor, onCambiar, placeholder = 'Ej.: Concepción' }: PropsBuscadorCiudad) {
    const [buscando, setBuscando] = useState(false);
    const [resultados, setResultados] = useState<Lugar[]>([]);
    const [aviso, setAviso] = useState('');
    const controlador = useRef<AbortController | null>(null);

    async function buscar(): Promise<void> {
        const consulta = valor.trim();
        setResultados([]);
        if (consulta.length < 3) { setAviso('Escribe al menos 3 letras para buscar.'); return; }
        controlador.current?.abort();
        controlador.current = new AbortController();
        setBuscando(true);
        setAviso('');
        try {
            const lugares = await buscarLugares(consulta, controlador.current.signal);
            setResultados(lugares);
            if (!lugares.length) setAviso('No encontramos ciudades o pueblos con ese nombre.');
        } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return;
            setAviso(mensajeDeError(e, 'No se pudo buscar la ciudad.'));
        } finally {
            setBuscando(false);
        }
    }

    function elegir(lugar: Lugar): void {
        onCambiar(lugar.nombre);
        setResultados([]);
        setAviso('');
    }

    return (
        <div>
            <div className="input-group">
                <input id={id} className="form-control" value={valor} placeholder={placeholder} autoComplete="off"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => { onCambiar(e.target.value); setResultados([]); setAviso(''); }}
                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); void buscar(); } }} />
                <button type="button" className="btn btn-outline-secondary" onClick={() => { void buscar(); }} disabled={buscando}>{buscando ? 'Buscando...' : 'Buscar'}</button>
            </div>
            {aviso && <div className="form-text" role="status">{aviso}</div>}
            {resultados.length > 0 && (
                <div className="list-group mt-2" role="listbox" aria-label="Ciudades encontradas">
                    {resultados.map(l => (
                        <button type="button" key={l.nombre} role="option" aria-selected={false} className="list-group-item list-group-item-action" onClick={() => elegir(l)}>{l.nombre}</button>
                    ))}
                </div>
            )}
        </div>
    );
}
