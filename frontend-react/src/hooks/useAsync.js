import { useCallback, useEffect, useRef, useState } from 'react';
import { mensajeDeError } from '../core/formato.js';

/**
 * Ejecuta una función asíncrona y expone {datos, cargando, error, recargar}.
 * Ignora respuestas viejas si cambian las dependencias mientras hay una petición en curso.
 */
export function useAsync(funcion, dependencias = [], { inmediato = true } = {}) {
    const [estado, setEstado] = useState({ datos: null, cargando: inmediato, error: '' });
    const secuencia = useRef(0);
    const ref = useRef(funcion);
    ref.current = funcion;

    const ejecutar = useCallback(async () => {
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
        if (inmediato) ejecutar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependencias);

    return { ...estado, recargar: ejecutar };
}
