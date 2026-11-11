import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// `npm run dev`      -> habla con el gateway real (VITE_API_URL, por defecto http://localhost:8081/api/v1)
// `npm run dev:demo` -> modo demostración: usa la base de datos simulada de src/data/baseDatos.ts
export default defineConfig(({ mode }: { mode: string }) => ({
    base: './',
    plugins: [react()],
    server: { port: 5173 },
    define: mode === 'demo' ? { 'import.meta.env.VITE_USAR_MOCK': JSON.stringify('true') } : {},
}));
