
# Marketplace
=====================

Proyecto academico fullstack

Proyecto de pagina web que funciona como mercado entre personas (como marketplace)

## Bases de datos locales con Docker Compose y phpMyAdmin

Las APIs guardan sus datos en bases MySQL independientes: `db_usuarios` (User-Api) y
`marketroad_db` (Publication-Api). El MySQL del proyecto vive en la red interna de Docker: no publica el
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

Para revisar errores de inicio: `docker compose logs -f --tail 100 user-api publication-api`.
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
