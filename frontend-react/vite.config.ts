import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// `npm run dev`      -> el navegador llama a /api/v1 en el propio servidor de Vite y este lo reenvía (proxy) al gateway real.
//                       Por defecto el gateway es http://localhost:8081; se cambia con VITE_GATEWAY_URL en .env.
//                       Si se define VITE_API_URL con una URL completa, la app llama directamente a esa URL (sin proxy).
// `npm run dev:demo` -> modo demostración: usa la base de datos simulada de src/data/baseDatos.ts (sin backend).
export default defineConfig(({ mode }: { mode: string }) => {
    const env = loadEnv(mode, '.', '');
    const gateway = env.VITE_GATEWAY_URL || 'http://localhost:8081';
    const proxy = { '/api': { target: gateway, changeOrigin: true } };
    return {
        base: './',
        plugins: [react()],
        server: { port: 5173, proxy },
        preview: { port: 4173, proxy },
        define: mode === 'demo' ? { 'import.meta.env.VITE_USAR_MOCK': JSON.stringify('true') } : {},
    };
});
