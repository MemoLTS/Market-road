import { useState } from 'react';
import { mensajeDeError } from '../../core/formato.js';
import { buscarLugares } from '../../core/geocodificacion.js';
import {
    LIMITES, primerError, validarCoordenadas, validarDescripcion, validarFotos, validarMonto, validarTitulo, validarUbicacion,
} from '../../core/validaciones.js';
import Alert from '../common/Alert.jsx';
import Campo from '../common/Campo.jsx';

const MODALIDADES = [
    { codigo: 'ENTREGA_PERSONAL', nombre: 'Entrega en persona' },
    { codigo: 'ENVIO', nombre: 'Envío' },
    { codigo: 'ENCUENTRO_PUBLICO', nombre: 'Encuentro en lugar público' },
];

/**
 * Validación pura del formulario (se exporta para probarla sin renderizar).
 * En modo "editar" solo se revisan los campos de texto y el precio.
 */
export function validarPublicacion(v, { modo = 'crear', exigirLugar = true } = {}) {
    const base = [
        validarTitulo(v.titulo.trim()),
        validarMonto(v.precio),
        validarDescripcion(v.descripcion.trim()),
        validarUbicacion(v.ubicacion.trim()),
        v.categoria ? null : 'Selecciona una categoría.',
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
export default function PublicationForm({ categorias, onEnviar, onCancelar, modo = 'crear', exigirLugar = true, inicial = null }) {
    const [v, setV] = useState({
        titulo: inicial?.titulo ?? '', precio: inicial ? String(inicial.precio) : '', descripcion: inicial?.descripcion ?? '',
        ubicacion: inicial?.ubicacion ?? '', categoria: inicial?.categoria ?? '', modalidadesEntrega: [], fotos: [], lugar: null,
    });
    const [resultados, setResultados] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    const cambiar = campo => e => setV(x => ({ ...x, [campo]: e.target.value }));
    const alternarModalidad = codigo => setV(x => ({
        ...x,
        modalidadesEntrega: x.modalidadesEntrega.includes(codigo) ? x.modalidadesEntrega.filter(m => m !== codigo) : [...x.modalidadesEntrega, codigo],
    }));

    async function buscarLocalidad() {
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

    async function enviar(e) {
        e.preventDefault();
        const invalido = validarPublicacion(v, { modo, exigirLugar });
        if (invalido) { setError(invalido); return; }
        setError('');
        setEnviando(true);
        try {
            await onEnviar({
                titulo: v.titulo, precio: v.precio, descripcion: v.descripcion, ubicacion: v.ubicacion, categoria: v.categoria,
                modalidadesEntrega: v.modalidadesEntrega, fotos: v.fotos,
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
                <Campo id="pubPrecio" etiqueta="Precio (CLP)" className="col-12 col-sm-6 mb-3">
                    <input id="pubPrecio" inputMode="decimal" className="form-control" value={v.precio} onChange={cambiar('precio')} />
                </Campo>
                <Campo id="pubCategoria" etiqueta="Categoría" className="col-12 col-sm-6 mb-3">
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
                        onChange={e => setV(x => ({ ...x, ubicacion: e.target.value, lugar: null }))} />
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
                            onChange={e => setV(x => ({ ...x, fotos: Array.from(e.target.files ?? []) }))} />
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
