
const env: Record<string, string | undefined> = import.meta.env ?? {};

export interface Configuracion {
    apiBaseUrl: string;
    usarMock: boolean;
    timeoutMs: number;
}

const origen = typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost';

export const config: Configuracion = {
    apiBaseUrl: new URL(
        env.VITE_API_URL || '/api/v1',
        origen
    ).href.replace(/\/+$/, ''),
    usarMock: env.VITE_USAR_MOCK === 'true',
    timeoutMs: 20000,
};
