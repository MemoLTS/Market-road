# Correcciones realizadas

Resumen de lo corregido sobre el proyecto entregado. Las pruebas unitarias existentes (Java y Jasmine) no se revisaron ni se cambiaron en su lógica.

## 1. Frontend React ahora es TypeScript
- `frontend-react/` pasó de JavaScript (`.js/.jsx`) a TypeScript (`.ts/.tsx`) con `strict` activado: tipos de la API en `src/types/` (reutilizan los del frontend original), componentes, hooks, contextos, servicios y pruebas.
- Nuevo `tsconfig.json` (app) y `tests/tsconfig.json`; `vite.config.ts`; Karma usa `@babel/preset-typescript`; scripts `npm run typecheck` y `npm run build` (que ejecuta `tsc` antes de empaquetar).
- Se eliminó una carpeta basura (`src/{core,services,...`) creada por error en una entrega anterior.
- El frontend original (`src/*.ts` → `Js/`) no se tocó en esta ronda (se eliminó después; ver «Tercera y cuarta ronda»).

## 2. Servicios (backend)
- **User-Api — seguridad:** `DELETE /usuarios/{id}` lo podía ejecutar cualquier cuenta con sesión contra cualquier otra, y `GET /usuarios` y `GET /usuarios/{id}` devolvían los correos de todas las cuentas a cualquier persona autenticada. Se agregó `ControlAccesoUsuariosFilter` (Order 2, después de `JwtAuthFilter`): solo la propia persona o un superusuario puede borrar/consultar una cuenta, y solo el superusuario puede listar. El frontend no usa esas rutas (el listado administrativo es `/admin/usuarios`), y no se cambió la firma de ningún método de los controladores.
- **User-Api — apodo:** `PATCH /usuarios/{id}` guardaba el apodo sin recortar espacios (crear y actualizar sí); ahora usa `normalizarApodo`.
- **Publication-Api — editar publicación:** la historia "Editar mi publicación" estaba bloqueada porque no existía el endpoint. Se agregó `PATCH /publicaciones/{id}` (`ActualizarPublicacionDTO`): solo la persona dueña, solo si la publicación está activa, con las mismas reglas de título, descripción, ubicación, categoría y precio que al crear.
- **Publication-Api — ventas:** una publicación vendida se podía eliminar y su registro de venta desaparecía de las estadísticas; ahora responde 400. El frontend React oculta el botón en ese caso.
- No se pudo compilar ni ejecutar Maven en este entorno: los archivos Java nuevos y modificados se revisaron con `javac` solo a nivel de sintaxis. Conviene correr `mvn test` en cada servicio.

## 3. Gateway
- `Getaway-Spring/src/main/resources/application.yml` está correcto: tiene las tres rutas (`user-service` → auth/usuarios/admin/usuarios, `publication-service` → publicaciones/conversaciones/admin/publicaciones, `soporte-service` → soporte), con los puertos 8084, 8083 y 8086 de `docker-compose.yml`. No requirió cambios.

## 4. Diagramas de clases (`Documentos/diagrama de clases/`)
- Estaban desactualizados: **no existía el servicio de soporte**, y a User-Api y Publication-Api les faltaban clases (dispositivos, foto, administración, mensajería, catálogo...).
- Se regeneró `Market-Road.mdj` y las 22 vistas previas desde el código real: Vista general (ahora con Soporte-Api, `db_soporte` y el frontend React), Getaway-Spring, User-Api (4 diagramas), Publication-Api (8) y Soporte-Api (6). El paquete Frontend se conservó.
- El generador está en `Documentos/diagrama de clases/generador/` para volver a ejecutarlo cuando cambie el código. No se pudo abrir el `.mdj` en StarUML aquí; el script valida que los ids sean únicos y que todas las referencias existan.

## 5. Pendiente que conviene decidir
- **Soporte duplicado en Publication-Api:** quedan compiladas allí las clases del soporte antiguo (`SoporteController`, `AdminSoporteController`, `TicketSoporte`...). El gateway no las enruta (el soporte real es Soporte-Api), pero tienen pruebas propias, por eso no se eliminaron. Aparecen en el diagrama "Soporte duplicado (legado)".


# Segunda ronda

## Unidades a la venta
- **Publication-Api:** nueva columna `unidades` (`int not null default 1`; `ddl-auto: update` la agrega a las filas existentes con 1).
  `POST /publicaciones` acepta el campo multipart opcional `unidades`; `PATCH /publicaciones/{id}` acepta `unidades` en el JSON.
  Validación: entero entre 1 y 9999; sin valor = 1. Los DTO (`NuevaPublicacionDTO`, `ActualizarPublicacionDTO`, `PublicacionResponseDTO`)
  conservan un constructor con la forma anterior, y la firma de `PublicacionController.crear` no cambió (el campo se lee del request),
  de modo que las pruebas Java existentes siguen compilando sin modificarse.
- **React:** campo *Unidades a la venta* (vacío = 1) en el formulario, marca “N unidades” en tarjeta y detalle, validación y pruebas nuevas.

## Dashboard
- `GET /api/v1/admin/publicaciones/resumen?dias=N` (solo superusuario): `nuevas`, `cerradasVentas`, `activas`, `totalVendidas`.
- React: apartado *Actividad de publicaciones* con selector Hoy / 7 / 30 días.

## React → Spring Boot → SQL
- Verificado por lectura de código: todos los endpoints que llama React existen en un controlador y están cubiertos por una ruta del gateway.
- La edición de publicaciones en React estaba oculta fuera del modo demo aunque `PATCH /publicaciones/{id}` ya existía; ahora el botón *Editar* aparece para la persona dueña de una publicación activa.
- Aviso amarillo en React cuando está en modo demostración (datos solo en el navegador).
- `docker-compose.yml`: MySQL publicado solo en `127.0.0.1` (3307 y 3308) para clientes SQL; colección Postman y consultas SQL en `Documentos/`.

# Tercera y cuarta ronda: solo TypeScript y React

- **Eliminado el JavaScript y el frontend original:** carpeta `Js/`, las páginas `.html` de la raíz, `src/*.ts` (frontend sin framework), `Css/`, `Assets/`, `package.json` y `tsconfig.json` de la raíz y la carpeta `tests/` de la raíz (sus 28 pruebas eran de ese frontend y había copias sueltas de otros archivos). React cubre todas sus funciones.
- **Funciones del frontend original que faltaban en React y ahora existen:** cambiar la contraseña del personal de soporte (pestaña «Mi cuenta»), elegir la ciudad del perfil con búsqueda de ciudades y pueblos, y ver el detalle de un ticket desde la administración (solo lectura).
- **Karma en TypeScript:** `karma.conf.cjs` pasó a `frontend-react/karma/karma.conf.ts` (cargado con `ts-node`; `karma/package.json` lo declara CommonJS porque el paquete principal es `"type": "module"`). Perfil `ChromeHeadlessSinSandbox` para contenedores o integración continua.
- **Direcciones:**
  - `vite.config.ts` reenvía `/api` al gateway en desarrollo (antes, sin `.env`, las llamadas iban al servidor de Vite y fallaban); `.env.example` actualizado.
  - Tras iniciar sesión se vuelve a la página protegida que se había pedido (`core/destino.ts`; solo direcciones internas, vigencia de 10 minutos, se cancela al cerrar el ingreso).
- **Postman:** se quitaron los scripts de prueba (JavaScript); el token del login se copia a la variable `token` del entorno.
- Tras actualizar `package.json` de `frontend-react`, ejecutar `npm install` (nueva dependencia de desarrollo: `ts-node`). 231 pruebas Jasmine, 0 fallas.



# Quinta ronda: ubicación, perfil, primer mensaje y contraseñas de usuario

Todo en TypeScript + React (frontend) y servicios Spring Boot (backend). No hay archivos JavaScript.

## Validación de ubicación unificada (perfil = publicaciones)
- `core/localidad.ts` → `validarLocalidad(texto, lugar, {obligatoria, original, de})`: **una sola regla** para toda localidad. Si el texto cambió, hay que elegirlo en la lista de resultados (Nominatim) o marcarlo en el mapa; así siempre es una ciudad o pueblo real con coordenadas válidas. Si no cambió (localidad ya guardada) se acepta sin volver a buscar.
- `components/common/SelectorLocalidad.tsx` reemplaza a `BuscadorCiudad` (eliminado) y lo usan el **formulario de publicaciones** y el **perfil** (buscar, lista de resultados, «Elegir en el mapa», «✔ Localidad confirmada»).
- Editar una publicación ahora también envía `latitud`/`longitud` al elegir otra localidad: `Publication-Api` (`ActualizarPublicacionDTO` + `PublicacionServiceImpl.actualizar`) las guarda solo si vienen juntas y son válidas (`Geo.coordenadasValidas`). Prueba: `ActualizarPublicacionServiceTest`.

## Perfil con un único botón «Guardar cambios»
- `PerfilPage` tiene **un solo formulario y un solo botón de guardado**: apodo, ciudad, foto (con recorte) y cambio de correo (opcional, pide la contraseña actual). Solo se llama a los servicios de lo que cambió: `PATCH /usuarios/{id}`, `PATCH /usuarios/{id}/correo`, `PUT /usuarios/{id}/foto`.
- `FotoPerfil` ya no tiene botón propio: entrega al formulario una función que genera el JPEG 512×512 al guardar.
- Los demás formularios (publicar/editar, registro, inicio de sesión, tickets, personal de soporte, cambio de contraseña, primer mensaje, contraseña de usuario) tienen su botón de guardado/envío.

## Mensajes: primer mensaje en ventana emergente + autocompletado
- `components/chat/CampoMensaje.tsx`: cuadro de texto con **autocompletado** (filtra sin distinguir tildes/mayúsculas; flechas + Enter o clic; Escape cierra).
- `core/mensajesPredeterminados.ts`: lista `PRIMER_MENSAJE` (primer contacto) y `RESPUESTAS_RAPIDAS` por rol (dentro del chat), más `sugerirMensajes`.
- `components/chat/PrimerMensajeModal.tsx`: ventana emergente (Bootstrap) abierta con «Enviar mensaje» en la publicación, con mensajes predeterminados y autocompletado. Al enviar el primer mensaje (`POST /conversaciones`) **la ventana se cierra y se abre el chat**; como la conversación ya existe, la publicación deja de ofrecerla y muestra «Ya hablaste con el vendedor: ver conversación».
- `ChatThread` usa el mismo autocompletado con las respuestas predeterminadas del rol.

## Administración: cambiar la contraseña de un usuario
- Backend `User-Api`: `PATCH /api/v1/admin/usuarios/{id}/contrasena` (`RestablecerContrasenaDTO`, `UsuarioService.restablecerContrasena`, BCrypt). Solo superusuario; 403 si el objetivo es **otro** superusuario (la propia cuenta sí se puede); 404 si no existe; 204 si sale bien. Pruebas en `ControllerTest` y `UsuarioServiceImplTest`.
- Frontend: `adminService.restablecerContrasena`, modal `CambiarContrasenaUsuarioModal` en la pestaña **Usuarios** (botón «Cambiar contraseña» por fila) y atajo en el Dashboard. Valida igual que el registro (8–32, letras y números) y exige repetirla. El modo simulado (`baseDatos.restablecerContrasena`) replica las reglas.

## Pruebas
- Jasmine/Karma: **255 pruebas, todas pasan** (antes 231). `npx tsc --noEmit` y `npx tsc --noEmit -p tests` sin errores.
- Java: no se pudo ejecutar Maven en este entorno (sin red); los archivos nuevos solo se revisaron con `javac` a nivel de sintaxis. Conviene correr `mvn test` en `User-Api` y `Publication-Api`.


# Sexta ronda: perfil con un solo botón, edición de usuarios por el administrador y menú del perfil

- **Perfil (`PerfilPage`)**: un solo formulario y un solo botón «Guardar cambios» que cubre apodo, ciudad, foto, correo **y cambio de contraseña propia** (contraseña actual + nueva + repetición). Nuevo endpoint `PATCH /usuarios/{id}/contrasena` (`CambioContrasenaDTO`, exige la contraseña actual; solo la propia cuenta).
- **Administración → Usuarios**: cada fila tiene «Editar», que abre una ventana (modal) con nombre, apellido, apodo, correo, ciudad (misma regla de localidad que publicaciones) y contraseña nueva opcional, con un único «Guardar cambios». Nuevo endpoint `PATCH /admin/usuarios/{id}` (`AdminActualizarUsuarioDTO`, solo superusuario; 403 sobre otro superusuario; 409 si el correo o apodo ya existen). El atajo del Dashboard ahora dice «Editar usuarios».
- **Menú del perfil**: «Búsqueda» aparecía corrido porque tenía un ícono de Bootstrap Icons que, sin la fuente cargada, dejaba un hueco; se quitó el ícono y todos los ítems quedan alineados.
- Se eliminó el componente `BuscadorCiudad.tsx` (reemplazado por `SelectorLocalidad`) y la carpeta `frontend-react/dist` (compilado viejo: si ves pantallas sin estos cambios, vuelve a compilar con `npm run build` o `docker compose build frontend`).
- Pruebas: Jasmine/Karma 259 pasan; en Java se agregaron pruebas para los dos endpoints y los dos métodos de servicio (no se pudo ejecutar Maven aquí).

- **Repetir la contraseña al crear usuario:** el registro (`RegisterForm`) tiene ahora el campo «Repite la contraseña» (se valida al salir del campo y al enviar: «Las contraseñas no coinciden.») y lo mismo el alta de personal de soporte (`FormularioPersonal`). Pruebas: 261 pasan.
