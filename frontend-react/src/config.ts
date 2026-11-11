/**
 * Configuración central. `usarMock` decide si los servicios hablan con la API real (gateway Spring)
 * o con la base de datos simulada de src/data/baseDatos.ts. Es un objeto mutable para poder
 * cambiarlo en las pruebas unitarias sin recompilar.
 */
const env: Record<string, string | undefined> = import.meta.env ?? {};

export interface Configuracion {
    apiBaseUrl: string;
    usarMock: boolean;
    timeoutMs: number;
}

export const config: Configuracion = {
    apiBaseUrl: env.VITE_API_URL || 'http://localhost:8081/api/v1',
    usarMock: env.VITE_USAR_MOCK === 'true',
    timeoutMs: 20000,
};
