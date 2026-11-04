
# Marketplace
=====================

Proyecto academico fullstack

Proyecto de pagina web que funciona como mercado entre personas (como marketplace)

## Bases de datos locales con Docker Compose y phpMyAdmin

Cada API guarda sus datos en su propia base MySQL: `db_usuarios` (User-Api) y `marketroad_db` (Publication-Api) viven en
el servidor `mysql-db`; **Soporte tiene su propio servidor MySQL** (`mysql-soporte`, base `db_soporte`, volumen
`market-road_mysql_soporte_data`, usuario `soporte_app` que solo ve esa base; ver [`soporte/database/init.sql`](soporte/database/init.sql)).
Los MySQL viven en la red interna de Docker: no publican el puerto `3306` ni requieren abrirlo en el firewall.

Desde PowerShell, en la raíz del proyecto:

```powershell
docker compose up --build -d
docker compose ps
```

Compose inicia phpMyAdmin para administrar el MySQL del proyecto. En phpMyAdmin elige el servidor
`mysql-db` (inicia sesión con `marketroad_app` / `marketroad_local_dev`) o `mysql-soporte` (con `soporte_app` / `soporte_local_dev`). Compose
crea las bases y ese usuario con
[`database/init.sql`](database/init.sql), incluso si reutiliza el volumen existente.
Para navegar las bases, abre [phpMyAdmin](http://localhost:8085); para probar la aplicación,
abre [el frontend](http://localhost:8080). phpMyAdmin solo se publica en la propia computadora.

Para revisar errores de inicio: `docker compose logs -f --tail 100 user-api publication-api soporte-api`.
Para detener los servicios: `docker compose down`. Los datos MySQL permanecen en el volumen.
Las credenciales predeterminadas son solo para desarrollo local; puedes configurarlas en `.env`.

## Alcance: Market-Road es un intermediario

La plataforma solo conecta a vendedor y comprador. No gestiona inventario ni stock, no fija precios,
no cobra, no entrega y no se responsabiliza del producto, por lo que no existe un servicio de
productos: los datos del artículo viven dentro de cada publicación (`Publication-Api`).

## Superusuario

`user-api` crea al iniciar un superusuario predeterminado (`admin@marketroad.local` /
`Admin12345`, configurable con `SUPERUSUARIO_CORREO` y `SUPERUSUARIO_CONTRASENA` en `.env`).
Solo esta cuenta ve el enlace "Panel de superusuario" y puede abrir `admin.html`, que tiene tres pestañas:
Usuarios, Publicaciones y **Soporte** (todos los tickets y sus chats, con búsqueda y filtro por estado; es de solo lectura:
para responder o gestionar se usa el panel de soporte, al que lleva el botón "Panel de soporte").
Cambia la contraseña y `JWT_SECRET` antes de desplegar.

## Soporte (tickets y chat)

`soporte/` es un microservicio Spring Boot propio (puerto `8086`, base `db_soporte`, ruta `/api/v1/soporte/**`
en el gateway). Tiene dos tipos de cuenta, con tokens y secretos **distintos**:

| Quién | Cómo entra | Qué puede hacer |
| --- | --- | --- |
| Persona usuaria de la tienda | Su sesión normal (token de `user-api`, `JWT_SECRET`) | Abrir un ticket y conversar por chat **solo en sus propios tickets**; cerrarlos. Página `soporte.html` (menú de usuario → Soporte). |
| Personal `SOPORTE` | Cuenta propia del servicio en `soporte-panel.html` (token firmado con `SOPORTE_JWT_SECRET`) | Ver y responder los tickets **sin asignar y los suyos**; tomar tickets; cambiar estado y prioridad. No ve el correo ni el id de quien escribe. |
| Personal `ADMIN` | Igual que `SOPORTE` | Todo lo de `SOPORTE` **más**: ver todos los tickets y chats (también los de otras personas), ver los datos de quien escribe (id y correo), reasignar, reabrir tickets cerrados, gestionar el equipo (crear, cambiar rol, desactivar, restablecer contraseña) y ver las estadísticas. |

El personal **no** existe en `user-api`: sus cuentas viven en `db_soporte`. Un token de usuario común no sirve en el
panel y uno del personal no sirve en el resto de la plataforma. El rol y el estado activo se consultan en la base
en cada petición, así que desactivar o degradar a alguien surte efecto de inmediato.

Al iniciar, el servicio crea dos cuentas iniciales si no existen (se entra en `soporte-panel.html`):

| Cuenta | Rol | Correo / contraseña por defecto | Variables en `.env` |
| --- | --- | --- | --- |
| Administrador | `ADMIN` | `soporte-admin@marketroad.local` / `Soporte12345` | `SOPORTE_ADMIN_CORREO`, `SOPORTE_ADMIN_CONTRASENA` |
| Usuario de soporte | `SOPORTE` | `soporte@marketroad.local` / `Agente12345` | `SOPORTE_AGENTE_CORREO`, `SOPORTE_AGENTE_CONTRASENA` |

**Cambia esas contraseñas y `SOPORTE_JWT_SECRET` antes de desplegar.** Desde el panel (pestaña Equipo) el administrador crea al resto.

Ciclo de un ticket: `ABIERTO` → `EN_PROGRESO` (al tomarlo o responderlo) → `RESUELTO` → `CERRADO`.
Si la persona usuaria escribe en un ticket resuelto, se reabre. Un ticket cerrado solo lo reabre un administrador.
Límites: 3 tickets en curso por persona, 5 tickets nuevos por hora, 20 mensajes por minuto, 1000 caracteres
por mensaje, 300 mensajes por ticket y 5 intentos fallidos de login por correo cada 10 minutos.

Endpoints principales (todos bajo `/api/v1/soporte`):

- Usuarios: `GET /categorias`, `GET|POST /tickets`, `GET /tickets/no-leidos`, `GET /tickets/{id}`,
  `POST /tickets/{id}/mensajes`, `POST /tickets/{id}/cierre`.
- Panel: `POST /panel/auth/login`, `GET /panel/auth/yo`, `POST /panel/auth/contrasena`,
  `GET /panel/tickets` (filtros `estado`, `prioridad`, `categoria`, `asignacion`, `q`, `pagina`, `tamano`),
  `GET /panel/tickets/{id}`, `POST /panel/tickets/{id}/{mensajes|tomar|estado|prioridad|asignacion}`,
  y solo `ADMIN`: `GET|POST /panel/personal`, `PATCH /panel/personal/{id}`, `GET /panel/estadisticas`.
- Superusuario de la plataforma (token de `user-api`, solo lectura): `GET /admin/tickets` (mismos filtros que el panel),
  `GET /admin/tickets/resumen`, `GET /admin/tickets/{id}`.

Pruebas: `cd soporte && mvn test` (reglas del servicio) y `npm test` (frontend, incluye la sesión del panel).

## Configuración inyectada con `@Value`

Los límites operativos ya no son constantes `static final`; se leen de `application.yml` (y se pueden sobrescribir con
variables de entorno): `publicaciones.fotos.*` y `mensajeria.*` (Publication-Api), `sesiones.*` y `usuarios.foto.max-bytes`
(User-Api). Los colaboradores (`Textos`, `ReglasTicket`, `ReglasMensajeria`, `CatalogoProcesador`, `PublicacionMapper`) son
beans de Spring que los servicios reciben con `@Autowired`.

## Frontend React (Evaluación Parcial 2)

La versión 2 del frontend está en [`frontend-react/`](frontend-react/README.md): React + Bootstrap, nuevas vistas y rutas, capa de datos con CRUD y pruebas Jasmine + Karma.
La documentación de la entrega (ERS V2, cobertura de testing y planilla Scrum) está en [`Documentos/`](Documentos/).
El frontend original (HTML + TypeScript) se mantiene en la raíz del repositorio y sus 28 pruebas con `node --test` siguen vigentes.
