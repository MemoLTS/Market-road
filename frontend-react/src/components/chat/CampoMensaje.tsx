import { useId, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { LIMITES } from '../../core/validaciones';
import { sugerirMensajes } from '../../core/mensajesPredeterminados';

export interface PropsCampoMensaje {
    valor: string;
    onCambiar: (valor: string) => void;
    /** Mensajes predeterminados que se ofrecen como autocompletado. */
    sugerencias?: readonly string[];
    rows?: number;
    placeholder?: string;
    etiqueta?: string;
    id?: string;
    /** Tecla pulsada (Enter envía en el chat); no se llama si la tecla eligió una sugerencia. */
    onTeclear?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}

/**
 * Cuadro de texto con autocompletado: al enfocar o escribir muestra los mensajes predeterminados que coinciden.
 * Se elige con clic o con las flechas + Enter; Escape cierra la lista.
 */
export default function CampoMensaje({ valor, onCambiar, sugerencias = [], rows = 3, placeholder = 'Escribe un mensaje', etiqueta = 'Mensaje', id, onTeclear }: PropsCampoMensaje) {
    const idInterno = useId();
    const idCampo = id ?? `mensaje-${idInterno}`;
    const [abierto, setAbierto] = useState(false);
    const [activa, setActiva] = useState(-1);
    const opciones = abierto ? sugerirMensajes(valor, sugerencias) : [];

    function elegir(texto: string): void {
        onCambiar(texto);
        setAbierto(false);
        setActiva(-1);
    }

    function teclear(e: KeyboardEvent<HTMLTextAreaElement>): void {
        if (opciones.length) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActiva(a => (a + 1) % opciones.length); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActiva(a => (a <= 0 ? opciones.length - 1 : a - 1)); return; }
            if (e.key === 'Enter' && activa >= 0) { e.preventDefault(); elegir(opciones[activa]); return; }
            if (e.key === 'Escape') { e.preventDefault(); setAbierto(false); return; }
        }
        onTeclear?.(e);
    }

    return (
        <div className="position-relative flex-grow-1">
            <textarea id={idCampo} className="form-control" rows={rows} maxLength={LIMITES.mensaje.max} placeholder={placeholder} aria-label={etiqueta}
                role="combobox" aria-expanded={opciones.length > 0} aria-autocomplete="list" aria-controls={`${idCampo}-lista`} autoComplete="off"
                value={valor}
                onFocus={() => setAbierto(true)}
                onBlur={() => setAbierto(false)}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => { onCambiar(e.target.value); setAbierto(true); setActiva(-1); }}
                onKeyDown={teclear} />
            {opciones.length > 0 && (
                <ul id={`${idCampo}-lista`} className="list-group position-absolute w-100 shadow-sm autocompletado" role="listbox" aria-label="Mensajes sugeridos" style={{ zIndex: 5, bottom: '100%', marginBottom: 4 }}>
                    {opciones.map((o, i) => (
                        <li key={o} role="option" aria-selected={i === activa} className={`list-group-item list-group-item-action py-1 small${i === activa ? ' active' : ''}`} style={{ cursor: 'pointer' }}
                            onMouseDown={e => { e.preventDefault(); elegir(o); }}>{o}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
