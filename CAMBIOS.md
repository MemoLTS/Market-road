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

- **Prueba `ActualizarPublicacionServiceTest` corregida:** fallaba con `NullPointerException` porque la publicación de la prueba no tenía `id` y el servicio hace `List.of(p.getId())` para contar imágenes. Ahora la prueba le asigna el id 5 (no cambia el código de producción).

## Séptima ronda: el token de usuario entra solo al panel de soporte
- **Soporte-Api**: nueva ruta `POST /api/v1/soporte/panel/auth/sso`. `SoporteAuthFilter` la valida con el token de la persona usuaria (mismo `JWT_SECRET`); el resto de `/panel/**` sigue exigiendo el token del personal.
- `PersonalService.loginConUsuario`: solo un superusuario puede entrar. Se usa su cuenta del equipo por correo; si no existe se crea como ADMIN, con clave aleatoria. Una cuenta desactivada se rechaza. Devuelve el token del panel (8 h).
- **Frontend**: `soportePanelService.entrarConUsuario`. `SoportePanelPage` entra sola si hay sesión de superusuario; si falla, muestra el error y deja el acceso manual.
- Pruebas: `PersonalServiceSsoTest`, 2 casos nuevos en `SeguridadTest`, 4 en Jasmine (261 → 265).

## Octava ronda: diagramas de clases
- Se regeneraron `Market-Road.mdj` y las 22 vistas previas desde el código actual (incluye contraseñas, edición de usuarios por el admin, `ResumenPublicacionesDTO` y la entrada SSO del panel de soporte).
- Se restauró `Documentos/diagrama de clases/generador/` (faltaba), se corrigió su ruta por defecto y se quitaron los PNG duplicados con el nombre dañado.
- El paquete Frontend del modelo no se regeneró (no se genera desde el código Java). El .mdj no se pudo abrir en StarUML aquí; el script valida ids y referencias.

## Novena ronda: deshabilitar y eliminar cuentas, deshabilitar publicaciones, confirmaciones en la página
- **Superusuario → pestaña Usuarios**: columna *Estado* y botones **Deshabilitar/Habilitar** y **Eliminar** (no aparecen en superusuarios; el backend también lo impide). Todo pide confirmación en una ventana de la página.
- **Cuenta deshabilitada**: puede iniciar sesión pero solo usar **Soporte** para enviar un ticket (aviso rojo, menú reducido, rutas protegidas la llevan a `/soporte`). Publication-Api responde 403 a todo lo demás; sus publicaciones activas salen del catálogo (`DESHABILITADA`) y vuelven al habilitarla.
- **Cuenta eliminada**: deja de existir. No puede iniciar sesión (User-Api), su token deja de servir en Publication-Api y Soporte-Api (401), no envía ni recibe mensajes (sus publicaciones no vendidas pasan a `ELIMINADA`) y no puede escribir a soporte.
- Como el JWT es *stateless*, `ControlAccesoUsuariosFilter` (User-Api) revisa la cuenta en cada petición y Publication-Api/Soporte-Api la consultan a User-Api con `VerificadorCuenta` (se guarda 10 s; si User-Api no responde no se corta el servicio). Variable nueva: `USUARIOS_API_URL` (ya está en `docker-compose.yml`).
- **Superusuario → pestaña Publicaciones**: botón **Deshabilitar/Habilitar** por publicación (`PATCH /admin/publicaciones/{id}/estado`). Una publicación deshabilitada no está en el catálogo, no admite mensajes ni ofertas y muestra la etiqueta «Deshabilitada por la administración».
- **«Marcar como vendido»** (y de paso «Eliminar publicación» y «Cerrar ticket») ya no usan `window.confirm`, que bloqueaba el navegador: ahora es una ventana dentro de la página (`ConfirmarModal`).
- Base de datos: `usuarios.activo` (se agrega sola) y `publicaciones.estado` pasa de ENUM a VARCHAR(20) al iniciar Publication-Api (`PublicacionSchemaMigration`) para aceptar el estado nuevo.
- Pruebas: React 261 → 285 (`deshabilitadas.spec.tsx` y casos nuevos en `paginas.spec.tsx`); Java: `DeshabilitarUsuarioTest` (User-Api), `AdminEstadoPublicacionTest` y `CuentaDeshabilitadaFilterTest` (Publication-Api), `CuentaDeshabilitadaSoporteTest` (soporte).
- Diagramas de clases regenerados con las clases nuevas.

## Décima ronda: acciones sobre la cuenta en la ventana de edición y panel de soporte sin doble ingreso
- **Editar usuario**: *Deshabilitar/Habilitar usuario* y *Eliminar usuario* pasaron a la ventana de edición, abajo a la **izquierda** y en paralelo a *Cerrar* / *Guardar cambios* (derecha). La tabla solo conserva *Editar*. Siguen pidiendo confirmación y no aparecen en superusuarios.
- **Panel de soporte sin volver a ingresar**:
  - El superusuario entra solo (`POST /soporte/panel/auth/sso`). Antes, si esa llamada recibía un 401, la tienda lo tomaba como «sesión expirada» y **cerraba la sesión de la tienda** (por eso había que ingresar otra vez); ahora un rechazo de esa ruta nunca cierra la sesión.
  - La sesión del **personal de soporte** ahora se guarda en `localStorage` (8 h, lo que dura su token) en vez de `sessionStorage`: no se vuelve a pedir al recargar ni al abrir otra pestaña. Se borra al cerrar sesión en el panel **o en la tienda**.
  - No se usa el correo para dar acceso al equipo: cualquiera puede registrarse con cualquier correo (no hay verificación), así que eso permitiría entrar al panel haciéndose pasar por alguien del equipo.
- Pruebas de React: 285 → 290.

## Undécima ronda: mensaje al entrar al panel de soporte
- El mensaje «Tu sesión no es válida o expiró…» al abrir el panel como superusuario lo devuelve un **soporte-api sin actualizar**: la versión antigua aplica la validación del personal a todas las rutas `/panel/**`, también a `/panel/auth/sso`. Hay que reconstruir y recrear el contenedor: `docker compose build soporte-api` y `docker compose up -d --force-recreate soporte-api`.
- El frontend ya no muestra ese texto engañoso cuando falla la entrada automática (401/404/sin conexión): dice «No se pudo entrar automáticamente al panel. Ingresa con una cuenta del equipo de soporte.»; un 403 sigue mostrando el motivo real (por ejemplo, cuenta de soporte desactivada). Pruebas de React: 291.

## Duodécima ronda: error al deshabilitar una publicación
- «Ocurrió un error inesperado en el servidor» al deshabilitar: Publication-Api convertía **cualquier** ruta inexistente en un 500 genérico (`NoResourceFoundException` caía en el manejador `Exception`). Con un contenedor `publication-api` sin actualizar (que aún no tiene `PATCH /admin/publicaciones/{id}/estado`) salía ese mensaje. Ahora una ruta inexistente responde 404 y un método no permitido 405, con un texto claro.
- Si el contenedor sí está actualizado pero falla, la causa más probable es la columna `estado` en MySQL (ENUM antiguo): `PublicacionSchemaMigration` la pasa a VARCHAR(20) al iniciar y ahora deja el resultado (o el error) en el log de `publication-api`.
- **Reactivar**: en la pestaña Publicaciones, una publicación `DESHABILITADA` (etiqueta amarilla) muestra el botón verde **Reactivar**, con su confirmación; vuelve al catálogo y admite mensajes y ofertas.

## Decimotercera ronda: error al deshabilitar/eliminar usuarios
- Mismo origen que el de publicaciones: User-Api también convertía una ruta inexistente en el 500 «Ocurrió un error inesperado». Un contenedor `user-api` sin actualizar no tiene `PATCH /admin/usuarios/{id}/estado` ni `DELETE /admin/usuarios/{id}`. Ahora responde 404/405 con un texto claro.
- Para aplicar los cambios hay que reconstruir los tres servicios del backend: `docker compose build user-api publication-api soporte-api` y `docker compose up -d --force-recreate user-api publication-api soporte-api`.

## Decimocuarta ronda
- Requisitos funcionales: se agregaron HU-49 a HU-60 (Sprint 3) en `Documentos/Gestion_Requerimientos_Scrum_Market-Road (2).xlsx` sobre usuarios, soporte y publicaciones (deshabilitar/eliminar usuarios, deshabilitar/reactivar publicaciones, SSO a soporte, confirmaciones en la página, etc.) y se actualizaron las observaciones de EP-01, EP-02, EP-04 y EP-05.
- `http.ts`: los GET se reintentan hasta 2 veces (1,5 s) ante 502/503/504, 500 sin `mensaje` (gateway o servicio arrancando) o falta de conexión.
- Usuarios → publicaciones desde el servidor: `User-Api` (`PublicacionesCliente`, `PUBLICACIONES_API_URL`) avisa a Publication-Api al deshabilitar/habilitar (las publicaciones activas se ocultan/vuelven) y al eliminar una cuenta (se retiran), reenviando el token del superusuario. El navegador ya no es el único que lo dispara.
- `GET /publicaciones/{id}` responde 404 para publicaciones DESHABILITADAS o ELIMINADAS (antes solo ELIMINADAS), de modo que quedan invisibles para todos.
- Tests nuevos en `DeshabilitarUsuarioTest` y `AdminEstadoPublicacionTest` (Java sin ejecutar: Maven sin red).

## Decimoquinta ronda: venta con confirmación y ocultar publicaciones
- Marcar vendido ahora exige elegir quién compró (`ElegirCompradorModal`, entre quienes escribieron por la publicación). La venta queda `PENDIENTE_CONFIRMACION`.
- La persona señalada como compradora responde desde su conversación (`POST /conversaciones/{id}/venta/respuesta`): `COMPRADO` confirma; `NO_COMPRADO` anula la venta y la publicación vuelve a ACTIVA; `OTRO` exige describir lo ocurrido (mín. 10 caracteres), deja la venta `EN_REVISION` y el frontend crea un ticket de soporte (categoría PUBLICACIONES).
- Nuevo estado de publicación `OCULTA` (`PATCH /publicaciones/{id}/visibilidad`): sale del catálogo y del detalle público; el dueño la vuelve a mostrar desde Mi perfil. Eliminar sigue disponible (excepto vendidas).
- Modelo: `EstadoVenta`, `Publicacion.ventaEstado/ventaDetalle`, `ConversacionResumenDTO.ventaEstado/ventaDetalle`, `RespuestaVentaDTO`, `VisibilidadDTO`.
- Tests: `VentaConfirmacionTest` (Java, sin ejecutar: Maven sin red) y `tests/ventas.spec.tsx` (Karma 300/300).
- Requisitos: HU-61 a HU-67 en el xlsx.
