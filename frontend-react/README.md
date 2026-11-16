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
  components/  common · layout · auth · publicaciones · chat · soporte
  pages/       Home, Categorías, Detalle, Mensajes, Perfil, Soporte, Panel de soporte, Admin, estáticas
tests/         11 archivos *.spec (Jasmine) + helpers
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

208 pruebas Jasmine (11 archivos en `tests/`) sobre componentes, formularios, páginas, servicios y lógica pura, ejecutadas con Karma en Chrome headless;
sin llamadas reales a la red (`spyOn(window, 'fetch')`, spies sobre servicios y un doble de Leaflet para el mapa).
Cobertura (Istanbul): 82,6 % de sentencias, 74,1 % de ramas, 80,0 % de funciones y 86,7 % de líneas; los umbrales de `karma.conf.cjs` hacen fallar la ejecución si bajan.

```bash
npm test             # una ejecución con informe de cobertura (coverage/html/index.html)
npm run typecheck    # tsc sobre src/ y tests/
```

Detalle y análisis en `../Documentos/Cobertura_Testing_Market-Road.docx`.

## Diseño (Bootstrap)

- **Bootstrap 5.3** para grilla, componentes y utilidades; `src/styles.css` agrega una capa de diseño que solo usa variables `--bs-*` (se adapta al tema claro/oscuro): radios y sombras consistentes, botones y formularios con tamaños uniformes, tarjetas con efecto al pasar el cursor, tablas y pestañas del panel, modales y pie de página.
- **Catálogo responsivo:** 2 columnas en móvil, 3 en tablet y 4 en escritorio; la portada apila sus botones a ancho completo en pantallas pequeñas.
- **Iconos:** Bootstrap Icons desde CDN (`index.html`); son decorativos, así que sin conexión la interfaz sigue siendo legible.

## Funcionalidades recientes

- **Unidades a la venta** en publicaciones (opcional, 1 por defecto) y marca "N unidades disponibles".
- **Editar publicaciones** (`PATCH /publicaciones/{id}`), disponible para quien publicó mientras la publicación esté activa.
- **Dashboard:** apartado *Actividad de publicaciones* (nuevas y cerradas en ventas en las últimas 24 h, 7 o 30 días).
- **Mapa** para elegir la ubicación (Leaflet cargado bajo demanda), **recorte de foto de perfil** con zoom y posición, y **alta/edición del equipo de soporte**.

## Limitaciones

- El mapa descarga Leaflet desde un CDN; sin conexión se puede elegir la ciudad o pueblo buscándolo por nombre.
- En modo demostración (`npm run dev:demo`) mensajería, soporte, foto de perfil y cambio de correo no están disponibles porque dependen del backend.
