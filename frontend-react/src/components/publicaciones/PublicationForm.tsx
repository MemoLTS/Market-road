import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { mensajeDeError } from '../../core/formato';
import { buscarLugares } from '../../core/geocodificacion';
import type { Lugar } from '../../core/geocodificacion';
import {
    LIMITES, primerError, validarCoordenadas, validarDescripcion, validarFotos, validarMonto, validarTitulo, validarUbicacion, validarUnidades,
} from '../../core/validaciones';
import type { ArchivoFoto } from '../../core/validaciones';
import type { Categoria, Publicacion } from '../../types/api';
import type { DatosPublicacion } from '../../types/app';
import Alert from '../common/Alert';
import Campo from '../common/Campo';

const MODALIDADES = [
    { codigo: 'ENTREGA_PERSONAL', nombre: 'Entrega en persona' },
    { codigo: 'ENVIO', nombre: 'Envío' },
    { codigo: 'ENCUENTRO_PUBLICO', nombre: 'Encuentro en lugar público' },
];

/**
 * Validación pura del formulario (se exporta para probarla sin renderizar).
 * En modo "editar" solo se revisan los campos de texto y el precio.
 */
export interface ValoresFormulario {
    titulo: string;
    precio: string;
    descripcion: string;
    ubicacion: string;
    categoria: string;
    modalidadesEntrega: string[];
    /** Opcional: vacío = 1 unidad. */
    unidades?: string;
    fotos: File[];
    lugar: Lugar | null;
}

/** Lo que revisa la validación: igual que el formulario, pero las fotos solo necesitan tipo y peso. */
export type ValidablePublicacion = Omit<ValoresFormulario, 'fotos'> & { fotos: readonly ArchivoFoto[] };

export interface OpcionesValidacion {
    modo?: 'crear' | 'editar';
    exigirLugar?: boolean;
}

export function validarPublicacion(v: ValidablePublicacion, { modo = 'crear', exigirLugar = true }: OpcionesValidacion = {}) {
    const base = [
        validarTitulo(v.titulo.trim()),
        validarMonto(v.precio),
        validarDescripcion(v.descripcion.trim()),
        validarUbicacion(v.ubicacion.trim()),
        v.categoria ? null : 'Selecciona una categoría.',
        validarUnidades(v.unidades),
    ];
    if (modo === 'editar') return primerError(...base);
    return primerError(
        ...base,
        v.modalidadesEntrega.length ? null : 'Selecciona al menos una modalidad de entrega.',
        validarFotos(v.fotos),
        exigirLugar ? (v.lugar ? validarCoordenadas(v.lugar.ubicacion.lat, v.lugar.ubicacion.lon) : 'Busca y elige la localidad de la publicación.') : null,
    );
}

/**
 * Formulario controlado para crear (o editar) una publicación.
 * `onEnviar(datos)` es asíncrono; si lanza un error, se muestra aquí.
 */
export interface PropsPublicationForm {
    categorias: Categoria[];
    onEnviar: (datos: DatosPublicacion) => Promise<void>;
    onCancelar?: () => void;
    modo?: 'crear' | 'editar';
    exigirLugar?: boolean;
    inicial?: Publicacion | null;
}

export default function PublicationForm({ categorias, onEnviar, onCancelar, modo = 'crear', exigirLugar = true, inicial = null }: PropsPublicationForm) {
    const [v, setV] = useState<ValoresFormulario>({
        titulo: inicial?.titulo ?? '', precio: inicial ? String(inicial.precio) : '', descripcion: inicial?.descripcion ?? '',
        ubicacion: inicial?.ubicacion ?? '', categoria: inicial?.categoria ?? '', modalidadesEntrega: [],
        unidades: inicial && inicial.unidades > 1 ? String(inicial.unidades) : '', fotos: [], lugar: null,
    });
    const [resultados, setResultados] = useState<Lugar[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    const cambiar = (campo: 'titulo' | 'precio' | 'descripcion' | 'categoria' | 'unidades') => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => setV(x => ({ ...x, [campo]: e.target.value }));
    const alternarModalidad = (codigo: string): void => setV(x => ({
        ...x,
        modalidadesEntrega: x.modalidadesEntrega.includes(codigo) ? x.modalidadesEntrega.filter(m => m !== codigo) : [...x.modalidadesEntrega, codigo],
    }));

    async function buscarLocalidad(): Promise<void> {
        setError('');
        if (v.ubicacion.trim().length < 2) { setError('Escribe al menos 2 letras para buscar la localidad.'); return; }
        setBuscando(true);
        try {
            const lugares = await buscarLugares(v.ubicacion);
            setResultados(lugares);
            if (!lugares.length) setError('No encontramos ciudades, pueblos o aldeas con ese nombre.');
        } catch (e) {
            setError(mensajeDeError(e));
        } finally {
            setBuscando(false);
        }
    }

    async function enviar(e: FormEvent<HTMLFormElement>): Promise<void> {
        e.preventDefault();
        const invalido = validarPublicacion(v, { modo, exigirLugar });
        if (invalido) { setError(invalido); return; }
        setError('');
        setEnviando(true);
        try {
            await onEnviar({
                titulo: v.titulo, precio: v.precio, descripcion: v.descripcion, ubicacion: v.ubicacion, categoria: v.categoria,
                modalidadesEntrega: v.modalidadesEntrega, unidades: v.unidades ?? '', fotos: v.fotos,
                latitud: v.lugar?.ubicacion.lat ?? null, longitud: v.lugar?.ubicacion.lon ?? null,
            });
        } catch (err) {
            setError(mensajeDeError(err, 'No se pudo guardar la publicación.'));
        } finally {
            setEnviando(false);
        }
    }

    return (
        <form onSubmit={enviar} noValidate aria-label={modo === 'crear' ? 'Nueva publicación' : 'Editar publicación'}>
            <Alert mensaje={error} />
            <Campo id="pubTitulo" etiqueta="Título">
                <input id="pubTitulo" className="form-control" value={v.titulo} maxLength={LIMITES.titulo.max} onChange={cambiar('titulo')} />
            </Campo>
            <div className="row">
                <Campo id="pubPrecio" etiqueta="Precio (CLP)" className="col-12 col-sm-4 mb-3">
                    <input id="pubPrecio" inputMode="decimal" className="form-control" value={v.precio} onChange={cambiar('precio')} />
                </Campo>
                <Campo id="pubUnidades" etiqueta="Unidades a la venta" className="col-12 col-sm-4 mb-3" ayuda="Si lo dejas vacío, se publica 1 unidad.">
                    <input id="pubUnidades" type="number" inputMode="numeric" min={LIMITES.unidades.min} max={LIMITES.unidades.max} step={1} placeholder="1" className="form-control" value={v.unidades ?? ''} onChange={cambiar('unidades')} />
                </Campo>
                <Campo id="pubCategoria" etiqueta="Categoría" className="col-12 col-sm-4 mb-3">
                    <select id="pubCategoria" className="form-select" value={v.categoria} onChange={cambiar('categoria')}>
                        <option value="" disabled>Selecciona una categoría</option>
                        {categorias.map(c => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
                    </select>
                </Campo>
            </div>
            <Campo id="pubDescripcion" etiqueta="Descripción" ayuda={`${v.descripcion.length}/${LIMITES.descripcion.max}`}>
                <textarea id="pubDescripcion" className="form-control" rows={4} maxLength={LIMITES.descripcion.max} value={v.descripcion} onChange={cambiar('descripcion')} />
            </Campo>
            <Campo id="pubUbicacion" etiqueta="Localidad">
                <div className="input-group">
                    <input id="pubUbicacion" className="form-control" value={v.ubicacion} placeholder="Ej.: Concepción"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setV(x => ({ ...x, ubicacion: e.target.value, lugar: null }))} />
                    {modo === 'crear' && (
                        <button type="button" className="btn btn-outline-secondary" onClick={buscarLocalidad} disabled={buscando}>{buscando ? 'Buscando...' : 'Buscar'}</button>
                    )}
                </div>
                {resultados.length > 0 && !v.lugar && (
                    <ul className="list-group mt-2" aria-label="Resultados de localidades">
                        {resultados.map(l => (
                            <li key={`${l.nombre}-${l.ubicacion.lat}`} className="list-group-item list-group-item-action">
                                <button type="button" className="btn btn-link p-0 text-start" onClick={() => { setV(x => ({ ...x, ubicacion: l.nombre, lugar: l })); setResultados([]); }}>{l.nombre}</button>
                            </li>
                        ))}
                    </ul>
                )}
                {v.lugar && <div className="form-text text-success">✔ Localidad confirmada.</div>}
            </Campo>
            {modo === 'crear' && (
                <>
                    <fieldset className="mb-3">
                        <legend className="form-label fs-6">Modalidades de entrega</legend>
                        {MODALIDADES.map(m => (
                            <div className="form-check" key={m.codigo}>
                                <input className="form-check-input" type="checkbox" id={`mod-${m.codigo}`} checked={v.modalidadesEntrega.includes(m.codigo)} onChange={() => alternarModalidad(m.codigo)} />
                                <label className="form-check-label" htmlFor={`mod-${m.codigo}`}>{m.nombre}</label>
                            </div>
                        ))}
                    </fieldset>
                    <Campo id="pubFotos" etiqueta="Fotos" ayuda={`De ${LIMITES.fotos.min} a ${LIMITES.fotos.max} fotos JPG, PNG o WEBP de hasta ${LIMITES.fotos.maxMB} MB.`}>
                        <input id="pubFotos" type="file" multiple accept="image/jpeg,image/png,image/webp" className="form-control"
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setV(x => ({ ...x, fotos: Array.from(e.target.files ?? []) }))} />
                    </Campo>
                </>
            )}
            <div className="d-flex justify-content-end gap-2">
                {onCancelar && <button type="button" className="btn btn-outline-secondary" onClick={onCancelar}>Cancelar</button>}
                <button id="btnPublicar" type="submit" className="btn btn-primary" disabled={enviando}>
                    {enviando ? 'Guardando...' : (modo === 'crear' ? 'Publicar' : 'Guardar cambios')}
                </button>
            </div>
        </form>
    );
}
