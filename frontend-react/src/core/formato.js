export function formatoPrecio(valor) {
    return '$' + Number(valor).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatoFechaCorta(iso) {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

export function mensajeDeError(error, porDefecto = 'Ocurrió un error inesperado.') {
    return error instanceof Error && error.message ? error.message : porDefecto;
}

/** Pide la ubicación al navegador. Resuelve {lat, lon} o rechaza con un mensaje legible. */
export function obtenerUbicacion() {
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
