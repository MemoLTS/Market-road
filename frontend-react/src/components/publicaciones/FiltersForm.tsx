import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { mensajeDeError, obtenerUbicacion } from '../../core/formato';
import type { Ubicacion } from '../../core/formato';
import { validarRangoPrecios } from '../../core/validaciones';
import type { Categoria, OrdenCatalogo } from '../../types/api';
import Alert from '../common/Alert';

export const ORDENES: { codigo: OrdenCatalogo; nombre: string }[] = [
    { codigo: 'RELEVANCIA', nombre: 'Relevancia' },
    { codigo: 'RECIENTES', nombre: 'Más recientes' },
    { codigo: 'PRECIO_ASC', nombre: 'Precio: menor a mayor' },
    { codigo: 'PRECIO_DESC', nombre: 'Precio: mayor a menor' },
    { codigo: 'DISTANCIA', nombre: 'Más cercanas' },
];
const RADIOS = ['5', '10', '25', '50', '100'];

/**
 * Filtros del catálogo. Mantiene un borrador local y solo avisa al padre (onAplicar) al enviar,
 * para no consultar la API en cada tecla.
 */
/** Valores del formulario de filtros (todos presentes, a diferencia de FiltrosCatalogo). */
export interface ValoresFiltros {
    q: string;
    categorias: string[];
    precioMin: string;
    precioMax: string;
    ubicacion: Ubicacion | null;
    radioKm: string;
    orden: OrdenCatalogo;
}

export interface PropsFiltersForm {
    categorias: Categoria[];
    valores: ValoresFiltros;
    onAplicar: (valores: ValoresFiltros) => void;
    onLimpiar: () => void;
    permitirUbicacion?: boolean;
}

export default function FiltersForm({ categorias, valores, onAplicar, onLimpiar, permitirUbicacion = true }: PropsFiltersForm) {
    const [borrador, setBorrador] = useState<ValoresFiltros>(valores);
    const [error, setError] = useState('');

    const cambiar = (campo: 'q' | 'precioMin' | 'precioMax' | 'orden' | 'radioKm') => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => setBorrador(b => ({ ...b, [campo]: e.target.value }));
    const alternarCategoria = (codigo: string): void => setBorrador(b => ({
        ...b,
        categorias: b.categorias.includes(codigo) ? b.categorias.filter(c => c !== codigo) : [...b.categorias, codigo],
    }));

    async function usarUbicacion(): Promise<void> {
        setError('');
        try {
            const ubicacion = await obtenerUbicacion();
            setBorrador(b => ({ ...b, ubicacion, radioKm: b.radioKm || '25', orden: 'DISTANCIA' }));
        } catch (e) {
            setError(mensajeDeError(e));
        }
    }

    function enviar(e: FormEvent<HTMLFormElement>): void {
        e.preventDefault();
        const invalido = validarRangoPrecios(borrador.precioMin, borrador.precioMax);
        if (invalido) { setError(invalido); return; }
        setError('');
        onAplicar({ ...borrador, q: borrador.q.trim() });
    }

    function limpiar(): void {
        setError('');
        onLimpiar();
    }

    return (
        <form onSubmit={enviar} className="card card-body shadow-sm mb-4" aria-label="Filtros del catálogo" noValidate>
            <Alert mensaje={error} />
            <div className="row g-2 align-items-end">
                <div className="col-12 col-md-6 col-lg-4">
                    <label htmlFor="filtroTexto" className="form-label mb-1">Buscar</label>
                    <input id="filtroTexto" type="search" className="form-control" placeholder="¿Qué estás buscando?" value={borrador.q} onChange={cambiar('q')} />
                </div>
                <div className="col-6 col-md-3 col-lg-2">
                    <label htmlFor="filtroPrecioMin" className="form-label mb-1">Precio mín.</label>
                    <input id="filtroPrecioMin" type="number" min="0" className="form-control" value={borrador.precioMin} onChange={cambiar('precioMin')} />
                </div>
                <div className="col-6 col-md-3 col-lg-2">
                    <label htmlFor="filtroPrecioMax" className="form-label mb-1">Precio máx.</label>
                    <input id="filtroPrecioMax" type="number" min="0" className="form-control" value={borrador.precioMax} onChange={cambiar('precioMax')} />
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                    <label htmlFor="filtroOrden" className="form-label mb-1">Ordenar por</label>
                    <select id="filtroOrden" className="form-select" value={borrador.orden} onChange={cambiar('orden')}>
                        {ORDENES.filter(o => o.codigo !== 'DISTANCIA' || borrador.ubicacion).map(o => <option key={o.codigo} value={o.codigo}>{o.nombre}</option>)}
                    </select>
                </div>
            </div>

            <fieldset className="mt-3">
                <legend className="form-label fs-6 mb-1">Categorías</legend>
                <div className="d-flex flex-wrap gap-2" role="group" aria-label="Categorías">
                    {categorias.map(c => (
                        <span key={c.codigo}>
                            <input type="checkbox" className="btn-check" id={`cat-${c.codigo}`} autoComplete="off"
                                checked={borrador.categorias.includes(c.codigo)} onChange={() => alternarCategoria(c.codigo)} />
                            <label className="btn btn-sm btn-outline-secondary" htmlFor={`cat-${c.codigo}`}>{c.nombre}</label>
                        </span>
                    ))}
                </div>
            </fieldset>

            {permitirUbicacion && (
                <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={usarUbicacion}>📍 Cerca de mí</button>
                    {borrador.ubicacion && (
                        <>
                            <label htmlFor="filtroRadio" className="small mb-0">Radio</label>
                            <select id="filtroRadio" className="form-select form-select-sm w-auto" value={borrador.radioKm} onChange={cambiar('radioKm')}>
                                {RADIOS.map(r => <option key={r} value={r}>{r} km</option>)}
                            </select>
                            <button type="button" className="btn btn-sm btn-link" onClick={() => setBorrador(b => ({ ...b, ubicacion: null, radioKm: '', orden: 'RELEVANCIA' }))}>Quitar ubicación</button>
                        </>
                    )}
                </div>
            )}

            <div className="d-flex gap-2 mt-3">
                <button type="submit" className="btn btn-primary">Aplicar filtros</button>
                <button type="button" className="btn btn-outline-secondary" onClick={limpiar}>Limpiar</button>
            </div>
        </form>
    );
}
