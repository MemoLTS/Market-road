// Punto de entrada de Karma: carga automáticamente todos los archivos *.spec.js / *.spec.jsx de esta carpeta.
const contexto = require.context('.', true, /\.spec\.jsx?$/);
contexto.keys().forEach(contexto);
