// Punto de entrada de Karma: carga automáticamente todos los archivos *.spec.ts / *.spec.tsx de esta carpeta.
const contexto = require.context('.', true, /\.spec\.tsx?$/);
contexto.keys().forEach(contexto);
