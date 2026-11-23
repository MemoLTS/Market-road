/**
 * «Volver a donde ibas»: si alguien abre una página protegida sin sesión, se guarda esa dirección unos minutos
 * (en sessionStorage, solo de esta pestaña) para llevarlo allí cuando termine de iniciar sesión.
 */
const CLAVE = 'mr_destino';
export const VIGENCIA_DESTINO_MS = 10 * 60 * 1000;

/** Solo se aceptan direcciones internas de la aplicación (empiezan con una sola «/»): evita redirecciones a otros sitios. */
export function esDestinoValido(ruta: unknown): ruta is string {
    return typeof ruta === 'string' && /^\/(?!\/)[^\s]*$/.test(ruta);
}

export function guardarDestino(ruta: string, ahora: number = Date.now()): void {
    if (!esDestinoValido(ruta) || ruta === '/') return;
    try { sessionStorage.setItem(CLAVE, JSON.stringify({ ruta, hasta: ahora + VIGENCIA_DESTINO_MS })); } catch { /* sin almacenamiento: se ignora */ }
}

/** Devuelve el destino pendiente (si sigue vigente) y lo borra: solo sirve una vez. */
export function tomarDestino(ahora: number = Date.now()): string | null {
    try {
        const crudo = sessionStorage.getItem(CLAVE);
        sessionStorage.removeItem(CLAVE);
        if (!crudo) return null;
        const dato = JSON.parse(crudo) as { ruta?: unknown; hasta?: unknown };
        return esDestinoValido(dato.ruta) && typeof dato.hasta === 'number' && dato.hasta >= ahora ? dato.ruta : null;
    } catch {
        return null;
    }
}

export function olvidarDestino(): void {
    try { sessionStorage.removeItem(CLAVE); } catch { /* se ignora */ }
}
