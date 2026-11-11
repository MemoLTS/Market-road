# Market-Road · Frontend React (V2)

Frontend de Market-Road con **React 19**, **TypeScript**, **Bootstrap 5.3** y pruebas unitarias con **Jasmine + Karma**.
Reemplaza al frontend HTML/TypeScript original (que sigue en la raíz del repositorio).

## Ejecutar

```bash
cd frontend-react
npm install
npm run dev        # contra el backend real (gateway en http://localhost:8081/api/v1)
npm run dev:demo   # sin backend: usa la base de datos simulada (src/data/baseDatos.ts)
npm test           # Karma + Jasmine (Chrome headless) y reporte de cobertura en coverage/
npm run typecheck  # tsc: verifica los tipos de src/ y tests/
npm run build      # tsc + empaquetado de producción en dist/
```

Para otra URL del gateway copia `.env.example` a `.env` y cambia `VITE_API_URL`.

**Cuentas del modo demostración:** `demo@marketroad.cl` / `demo1234` · superusuario `admin@marketroad.cl` / `admin1234`.
En modo demo no están disponibles mensajería, soporte, foto de perfil ni cambio de correo (dependen del backend).

## Estructura

```
src/
  types/       tipos de la API (api.ts, soporte.ts) y del frontend (app.ts)
  core/        validaciones, formato, geocodificación, router (hash)
  services/    http, sesión, publicaciones, auth, mensajes, soporte, admin
  data/        baseDatos.ts  → "base de datos" JS con CRUD y persistencia en localStorage
  context/     AuthContext (sesión) y UiContext (modales de acceso)
  hooks/       useAsync, usePublicaciones
  components/  common · layout · auth · publicaciones · chat
  pages/       Home, Categorías, Detalle, Mensajes, Perfil, Soporte, Panel de soporte, Admin, estáticas
tests/         8 archivos *.spec (Jasmine) + helpers
```

## Rutas

`/` · `/categorias` · `/categorias/:codigo` · `/publicaciones/:id` · `/nosotros` · `/contacto` · `/soporte` · `/soporte-panel` ·
`/perfil` · `/mensajes` · `/mensajes/:id` · `/admin` (las tres últimas, protegidas).

## Decisiones

- **Props y estado:** componentes de presentación sin estado (PublicationCard, PublicationList, Pagination, Alert); formularios con `useState`; sesión compartida con `AuthContext`.
- **Datos:** cada servicio usa la API o `baseDatos.ts` según `config.usarMock`; ambos devuelven la misma forma de datos.
- **Router propio** (`core/router.tsx`) con la API de react-router; cambiar a `react-router-dom` es solo cambiar los imports.
- **Bootstrap:** grilla por breakpoints, navbar colapsable bajo `lg`, `table-responsive`, paneles lista/detalle alternados en móvil.

## Pruebas

128 pruebas Jasmine sobre componentes, formularios, páginas, servicios y lógica; sin llamadas reales a la red (`spyOn(window, 'fetch')`, spies sobre servicios).
Detalle y análisis en `../Documentos/Cobertura_Testing_Market-Road.docx`.
Antes de entregar, ejecuta `npm test` y revisa `coverage/html/index.html` para completar las cifras oficiales de cobertura.

## Limitaciones

- El backend no ofrece `PATCH /publicaciones/{id}`: editar solo funciona en modo demo.
- No se portó el recorte de foto de perfil ni el mapa para elegir ubicación.
- El panel de soporte React muestra el equipo en solo lectura; crear y editar personal sigue en `soporte-panel.html`.
