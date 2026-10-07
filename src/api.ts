import type { LoginRespuesta, Sesion, Usuario } from './tipos.js';

export const API_BASE_URL = 'http://localhost:8081/api/v1';
const CLAVE_SESION = 'mr_session';
const TIMEOUT_MS = 20000;

/** Error de la API con el código HTTP, para poder distinguir 404, 409, 429, etc. */
export class ApiError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Guarda la sesión (token + usuario) en localStorage. Se usa localStorage (y no sessionStorage) a propósito:
 * el dispositivo queda "recordado" hasta que se llame a limpiarSesion() (logout).
 */
export function guardarSesion({ token, expiraEnMs, usuario }: LoginRespuesta): Sesion {
    const sesion: Sesion = { token, usuario, expiraEn: Date.now() + (expiraEnMs || 0) };
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    return sesion;
}

export function obtenerSesion(): Sesion | null {
    const raw = localStorage.getItem(CLAVE_SESION);
    if (!raw) return null;
    try {
        const sesion = JSON.parse(raw) as Partial<Sesion>;
        if (!sesion.token || !sesion.usuario) return null;
        // Token vencido: se limpia para no seguir mandando un Authorization inválido.
        if (sesion.expiraEn && Date.now() >= sesion.expiraEn) {
            limpiarSesion();
            return null;
        }
        return sesion as Sesion;
    } catch {
        limpiarSesion();
        return null;
    }
}

export function limpiarSesion(): void {
    localStorage.removeItem(CLAVE_SESION);
}

export function estaAutenticado(): boolean {
    return obtenerSesion() !== null;
}

export function usuarioActual(): Usuario | null {
    return obtenerSesion()?.usuario ?? null;
}

interface CuerpoError {
    error?: string;
    mensaje?: string;
    message?: string;
    [campo: string]: unknown;
}

function mensajeDeCuerpo(cuerpo: CuerpoError | null, status: number): string {
    if (cuerpo) {
        const directo = cuerpo.error ?? cuerpo.mensaje ?? cuerpo.message;
        if (typeof directo === 'string' && directo) return directo;
        // Errores de validación por campo: {campo: "mensaje"}
        const primero = Object.values(cuerpo).find((v): v is string => typeof v === 'string' && v.length > 0);
        if (primero) return primero;
    }
    if (status === 429) return 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.';
    if (status === 413) return 'El archivo es demasiado grande.';
    if (status >= 500) return 'El servidor tuvo un problema. Inténtalo más tarde.';
    return `Error HTTP: ${status}`;
}

export async function apiFetch<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const sesion = obtenerSesion();
    const esFormData = options.body instanceof FormData;

    const headers = new Headers(options.headers);
    if (!esFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (sesion?.token) headers.set('Authorization', `Bearer ${sesion.token}`);

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers, signal: controlador.signal });

        if (response.status === 401) {
            limpiarSesion();
            window.dispatchEvent(new CustomEvent('mr:sesion-expirada'));
        }
        if (!response.ok) {
            const cuerpo = (await response.json().catch(() => null)) as CuerpoError | null;
            throw new ApiError(mensajeDeCuerpo(cuerpo, response.status), response.status);
        }
        if (response.status === 204) return null as T;
        return (await response.json()) as T;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new ApiError('El servidor tardó demasiado en responder.', 0);
        }
        if (error instanceof TypeError) {
            throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión.', 0);
        }
        console.error(`[API Error] ${options.method ?? 'GET'} ${endpoint}:`, error instanceof Error ? error.message : error);
        throw error;
    } finally {
        clearTimeout(temporizador);
    }
}
