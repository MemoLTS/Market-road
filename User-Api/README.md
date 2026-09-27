# servicio-usuarios

API REST de usuarios (Spring Boot 4.1.1 + Java 25 + PostgreSQL).

## Levantar todo con Docker

```bash
cp .env.example .env      # opcional, ya trae valores por defecto
docker compose up --build
```

Esto levanta:
- `db`: PostgreSQL 16 en el puerto 5432
- `app`: la API en el puerto 8081, con `ddl-auto: update` (crea/actualiza la tabla `Usuarios` automáticamente)

Para detener y borrar datos: `docker compose down -v`

## Endpoints (base path: `/api/v1/usuarios`)

| Método | Ruta                    | Descripción                          |
|--------|-------------------------|---------------------------------------|
| POST   | `/api/v1/usuarios`      | Crear usuario                         |
| GET    | `/api/v1/usuarios`      | Listar todos                          |
| GET    | `/api/v1/usuarios/{id}` | Obtener uno por id                    |
| PUT    | `/api/v1/usuarios/{id}` | Actualizar completo (todos los campos)|
| PATCH  | `/api/v1/usuarios/{id}` | Actualizar parcial (campos opcionales)|
| DELETE | `/api/v1/usuarios/{id}` | Eliminar                              |

### Ejemplo: crear usuario

```bash
curl -X POST http://localhost:8081/api/v1/usuarios \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "apellido": "Pérez",
    "apodo": "juanp",
    "correo": "juan@correo.com",
    "contrasena": "claveSegura123"
  }'
```

La contraseña se guarda con hash BCrypt (nunca en texto plano) y nunca se devuelve en las respuestas.

## Notas

- Validaciones (`@NotBlank`, `@Size`, `@Email`) devuelven `400` con el detalle de cada campo.
- Correo o apodo duplicados devuelven `409 Conflict`.
- Usuario inexistente devuelve `404 Not Found`.
- Para correr localmente sin Docker, sobrescribe las variables de entorno `SPRING_DATASOURCE_URL`,
  `SPRING_DATASOURCE_USERNAME` y `SPRING_DATASOURCE_PASSWORD`, o edita los valores por defecto en
  `application.yml`.
