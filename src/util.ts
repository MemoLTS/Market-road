export function escapeHtml(texto: unknown): string {
    const div = document.createElement('div');
    div.textContent = String(texto ?? '');
    return div.innerHTML;
}

export function formatoPrecio(valor: number): string {
    return '$' + Number(valor).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatoFechaCorta(iso: string): string {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

/** Obtiene un elemento por id con el tipo esperado; falla con un mensaje claro si no existe. */
export function porId<T extends HTMLElement = HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`No se encontró el elemento #${id}`);
    return el as T;
}

export function opcionalPorId<T extends HTMLElement = HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
}

export type TipoAlerta = 'danger' | 'success';

export function mostrarAlerta(elemento: HTMLElement | null, mensaje: string, tipo: TipoAlerta = 'danger'): void {
    if (!elemento) return;
    elemento.textContent = mensaje;
    elemento.classList.remove('d-none', 'alert-danger', 'alert-success');
    elemento.classList.add(`alert-${tipo}`);
}

export function ocultarAlerta(elemento: HTMLElement | null): void {
    if (!elemento) return;
    elemento.classList.add('d-none');
    elemento.textContent = '';
}

export function mensajeDeError(error: unknown, porDefecto = 'Ocurrió un error inesperado.'): string {
    return error instanceof Error && error.message ? error.message : porDefecto;
}

/** Evita enviar el mismo formulario dos veces mientras hay una petición en curso. */
export async function conBoton<T>(boton: HTMLButtonElement | null, textoEnCurso: string, tarea: () => Promise<T>): Promise<T> {
    if (!boton) return tarea();
    const original = boton.textContent;
    boton.disabled = true;
    boton.textContent = textoEnCurso;
    try {
        return await tarea();
    } finally {
        boton.disabled = false;
        boton.textContent = original;
    }
}

export interface Ubicacion {
    lat: number;
    lon: number;
}

/** Pide la ubicación al navegador. Resuelve {lat, lon} o rechaza con un mensaje legible. */
export function obtenerUbicacion(): Promise<Ubicacion> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Tu navegador no permite obtener la ubicación.'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            err => reject(new Error(err.code === err.PERMISSION_DENIED
                ? 'No diste permiso para usar tu ubicación.'
                : 'No se pudo obtener tu ubicación.')),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
    });
}
