
# Marketplace
=====================

Proyecto academico fullstack

Proyecto de pagina web que funciona como mercado entre personas (como marketplace)

## Bases de datos locales con Docker Compose y phpMyAdmin

Las APIs guardan sus datos en bases MySQL independientes: `db_usuarios` (User-Api),
`marketroad_db` (Publication-Api) y `db_soporte` (Soporte). El MySQL del proyecto vive en la red interna de Docker: no publica el
puerto `3306` ni requiere abrirlo en el firewall.

Desde PowerShell, en la raíz del proyecto:

```powershell
docker compose up --build -d
docker compose ps
```

Compose inicia phpMyAdmin para administrar el MySQL del proyecto. En phpMyAdmin selecciona
el servidor `mysql-db` e inicia sesión con `marketroad_app` / `marketroad_local_dev`. Compose
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
Solo esta cuenta ve el enlace "Panel de superusuario" y puede abrir `admin.html`.
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

Al iniciar, el servicio crea un administrador inicial (`soporte-admin@marketroad.local` / `Soporte12345`,
configurable con `SOPORTE_ADMIN_CORREO` y `SOPORTE_ADMIN_CONTRASENA` en `.env`). **Cambia esa contraseña y
`SOPORTE_JWT_SECRET` antes de desplegar.** Desde el panel (pestaña Equipo) el administrador crea al resto.

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

Pruebas: `cd soporte && mvn test` (reglas del servicio) y `npm test` (frontend, incluye la sesión del panel).
