import { useCallback, useEffect, useRef, useState } from 'react';
import { mensajeDeError } from '../core/formato';

export interface EstadoAsync<T> {
    datos: T | null;
    cargando: boolean;
    error: string;
    recargar: () => Promise<void>;
}

/**
 * Ejecuta una función asíncrona y expone {datos, cargando, error, recargar}.
 * Ignora respuestas viejas si cambian las dependencias mientras hay una petición en curso.
 */
export function useAsync<T>(funcion: () => Promise<T>, dependencias: readonly unknown[] = [], { inmediato = true } = {}): EstadoAsync<T> {
    const [estado, setEstado] = useState<{ datos: T | null; cargando: boolean; error: string }>({ datos: null, cargando: inmediato, error: '' });
    const secuencia = useRef(0);
    const ref = useRef(funcion);
    ref.current = funcion;

    const ejecutar = useCallback(async (): Promise<void> => {
        const mia = ++secuencia.current;
        setEstado(e => ({ ...e, cargando: true, error: '' }));
        try {
            const datos = await ref.current();
            if (mia === secuencia.current) setEstado({ datos, cargando: false, error: '' });
        } catch (e) {
            if (mia === secuencia.current) setEstado(s => ({ ...s, cargando: false, error: mensajeDeError(e, 'No se pudieron cargar los datos.') }));
        }
    }, []);

    useEffect(() => {
        if (inmediato) void ejecutar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependencias);

    return { ...estado, recargar: ejecutar };
}
