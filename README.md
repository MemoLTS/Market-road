
# Marketplace
=====================

Proyecto academico fullstack

Proyecto de pagina web que funciona como mercado entre personas (como marketplace)

## Bases de datos locales con Docker Compose y phpMyAdmin

Las APIs guardan sus datos en bases MySQL independientes: `db_usuarios`, `inventario` y
`marketroad_db`. El MySQL del proyecto vive en la red interna de Docker: no publica el
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

Para revisar errores de inicio: `docker compose logs -f --tail 100 user-api prod-api publication-api`.
Para detener los servicios: `docker compose down`. Los datos MySQL permanecen en el volumen.
Las credenciales predeterminadas son solo para desarrollo local; puedes configurarlas en `.env`.