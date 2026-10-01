# Market-Road — Documentación técnica

## 1. Estado de esta entrega

Esta entrega mantiene los módulos existentes de Market-Road y agrega un microservicio independiente para publicaciones de venta.

### Módulos

| Módulo | Puerto | Función |
|---|---:|---|
| `User-Api` | 8081 | Registro, usuarios y autenticación JWT |
| `Publication-Api` | 8083 | Publicaciones de venta e imágenes |
| `Getaway-Spring` | 8080 interno / 8082 host | API Gateway |
| Frontend | 8080 interno / 3000 host | Interfaz web |
| PostgreSQL | 5432 interno / 5433 host | Persistencia |

El gateway expone públicamente las APIs mediante el puerto `8082` del host.

## 2. Nueva funcionalidad: publicaciones de venta

Un usuario autenticado puede crear una publicación con:

- Título del producto: entre 3 y 100 caracteres.
- Descripción: entre 10 y 1000 caracteres.
- Ubicación: entre 2 y 120 caracteres.
- Precio: mayor que 0, hasta 10 dígitos enteros y máximo 2 decimales.
- Fotografías: mínimo 1 y máximo 8.
- Formatos aceptados: JPG, PNG y WEBP.
- Tamaño máximo: 5 MB por fotografía.
- La primera fotografía se utiliza como imagen principal de la tarjeta.
- La tarjeta muestra debajo de la imagen el título y el precio.
- La publicación queda asociada al `usuarioId` obtenido desde el JWT.
- Solo el propietario puede eliminar su publicación.

Las imágenes se almacenan en PostgreSQL vinculadas a la publicación y se sirven mediante un endpoint independiente.

## 3. API de publicaciones

Base a través del Gateway:

`http://localhost:8082/api/v1/publicaciones`

### Crear publicación

`POST /api/v1/publicaciones`

Requiere `Authorization: Bearer <token>` y `multipart/form-data`.

Campos:

- `titulo`
- `precio`
- `descripcion`
- `ubicacion`
- `fotos` (repetido de 1 a 8 veces)

Ejemplo conceptual:

```text
titulo = Notebook usado
precio = 450000
fotos = foto1.jpg
fotos = foto2.jpg
```

### Catálogo (público, paginado)

`GET /api/v1/publicaciones`

| Parámetro | Descripción |
|---|---|
| `q` | Texto; todas las palabras deben aparecer en título, descripción o categoría |
| `categoria` | Código(s): repetido o separado por comas (`ELECTRONICA`, `HOGAR`, `MODA`, `DEPORTES`, `VEHICULOS`, `JUGUETES`, `LIBROS`, `HERRAMIENTAS`, `MASCOTAS`, `OTROS`) |
| `precioMin`, `precioMax` | Rango de precio |
| `lat`, `lon` | Ubicación del usuario (van juntas) |
| `radioKm` | Filtra por distancia; requiere `lat`/`lon` |
| `orden` | `RELEVANCIA` (defecto), `PRECIO_ASC`, `PRECIO_DESC`, `DISTANCIA` (requiere `lat`/`lon`), `RECIENTES` |
| `pagina`, `tamano` | Desde 0; tamaño 1–50 (defecto 12) |

Respuesta: `{contenido, pagina, tamano, total, totalPaginas}`. Cada publicación incluye `categoria`, `categoriaNombre`, `distanciaKm` (si hay ubicación) y `vendedorApodo`.
`GET /api/v1/publicaciones/categorias` devuelve las categorías disponibles.

Al crear una publicación ahora se envía además `categoria` (obligatoria) y `latitud`/`longitud` (opcionales).

### Mensajería y ofertas

Base: `/api/v1/conversaciones` (requiere sesión). Hay una conversación por (publicación, comprador).

- `GET /` — bandeja del usuario (`?publicacionId=` para filtrar). `GET /no-leidos` — contador.
- `POST /` `{publicacionId, contenido}` — el comprador escribe al vendedor.
- `GET /{id}` — conversación completa (marca como leídos los mensajes recibidos).
- `POST /{id}/mensajes` `{contenido}` — mensaje de texto (1–1000 caracteres).
- `POST /{id}/ofertas` `{monto}` — oferta del comprador (reemplaza la anterior).
- `POST /{id}/ofertas/{mensajeId}/aceptar|rechazar` — solo el vendedor.
- `POST /{id}/venta` — el vendedor cierra la venta; las demás conversaciones quedan avisadas.

Quien no participa de una conversación recibe 404. Acciones no permitidas por el estado reciben 409.

### Obtener publicaciones propias

`GET /api/v1/publicaciones/mias` (excluye eliminadas).

### Obtener una imagen

`GET /api/v1/publicaciones/{id}/imagenes/{posicion}`

### Eliminar publicación

`DELETE /api/v1/publicaciones/{id}`

Requiere autenticación y el usuario del JWT debe ser el propietario.

## 4. Relación entre publicaciones y usuarios

La arquitectura mantiene los servicios separados. `Publication-Api` no duplica la tabla de usuarios ni crea una relación JPA entre dos microservicios.

Cada publicación contiene:

```text
usuario_id
```

Ese valor corresponde al `subject` del JWT emitido por `User-Api`.

Esto permite mantener la separación entre servicios y, al mismo tiempo, saber quién creó cada publicación.

## 5. Persistencia

Se crean automáticamente mediante JPA:

- `publicaciones`
- `publicacion_imagenes`
- `conversaciones` y `mensajes_conversacion` (la tabla antigua `mensajes_publicacion` ya no se usa)

Una publicación posee varias imágenes y cada imagen tiene una posición de `0` a `7`.

El estado inicial es `ACTIVA`.

## 6. Seguridad

El servicio de publicaciones valida el mismo JWT utilizado por `User-Api`.

Rutas públicas:

- `GET /api/v1/publicaciones`
- `GET /api/v1/publicaciones/{id}`
- `GET /api/v1/publicaciones/{id}/imagenes/{posicion}`

Las operaciones de creación y eliminación requieren un token válido.

El secreto JWT debe mantenerse igual entre `User-Api` y `Publication-Api`. En producción se debe proporcionar mediante la variable `JWT_SECRET` y no utilizar el valor de desarrollo incluido por defecto.

## 7. Validaciones implementadas

### Frontend

Se validan antes de enviar:

- sesión iniciada;
- título;
- precio;
- cantidad de fotos;
- tipo de archivo;
- tamaño de archivo.

### Backend

El backend vuelve a validar todas las reglas, porque las validaciones del navegador no son una medida de seguridad.

También se controla:

- usuario autenticado válido;
- formato real de la imagen mediante firma de archivo;
- imágenes JPG/PNG válidas y hasta 10000x10000 píxeles;
- máximo de 8 imágenes;
- máximo de 5 MB por imagen;
- monto positivo y con formato numérico controlado;
- contenido de mensajes entre 1 y 1000 caracteres;
- token JWT válido;
- título vacío o fuera de rango;
- precio inválido;
- cantidad de imágenes;
- archivos vacíos;
- MIME permitido;
- tamaño máximo;
- posición de imagen;
- propietario de la publicación al eliminar.

## 8. Ejecución con Docker Compose

Desde la raíz:

```bash
docker compose up --build
```

Luego:

- Frontend: `http://localhost:3000`
- Gateway: `http://localhost:8082`
- User API directa: `http://localhost:8081`
- Publication API directa: `http://localhost:8083`

La base PostgreSQL queda disponible desde el host en `localhost:5433`.

## 9. Frontend en TypeScript, validaciones y verificación

### TypeScript
- Código fuente en `src/*.ts`; se compila a `js/` (lo que carga el navegador). **No edites `js/` a mano.**
- Comandos (desde la raíz): `npm install`, `npm run build`, `npm run typecheck`, `npm test` (compila y corre `tests/`).
- `tsconfig.json` usa `strict`. Módulos: `tipos.ts` (tipos de la API), `validaciones.ts` (reglas puras), `api.ts` (fetch con timeout y `ApiError`), `util.ts`, `auth.ts`, `usuarios.ts`, `publicaciones.ts` (catálogo), `contacto.ts` (panel del detalle y contador de no leídos), `mensajes.ts` (página de chat), `theme.ts`.
- El `Dockerfile` compila el TypeScript en una etapa de Node y sirve el resultado con Nginx.

### Página de mensajes (`mensajes.html`)
Bandeja con búsqueda y filtros (Todas, Compras, Ventas, Sin leer), chat con confirmación de lectura, respuestas rápidas, ofertas con formulario propio, aceptar/rechazar, marcar como vendido y actualización automática. Enlaces directos: `mensajes.html?c=<conversación>` y `mensajes.html?p=<publicación>`.

### Validaciones agregadas
- **Navegador:** mismas reglas que el servidor (títulos, descripciones, montos, fotos, coordenadas, rango de precios, registro con apodo y contraseña), caracteres de control rechazados, doble envío bloqueado, descarte de respuestas atrasadas en el catálogo y timeout de red.
- **Publication-Api:** texto sin caracteres de control ni de dirección invisibles (`Textos`), ids de ruta positivos (`@Validated`/`@Positive`, error 400), límite de 20 mensajes u ofertas por minuto por usuario (error 429).
- **User-Api:** nombre y apellido solo letras; apodo sin espacios (letras, números, `_`, `.`, `-`); contraseña con al menos una letra y un número y sin espacios; correo de hasta 100 caracteres. Aplica a cuentas nuevas o campos que se modifican; las cuentas existentes siguen funcionando.

### Verificación realizada
- TypeScript compila en modo `strict` sin errores; 8 pruebas de validaciones pasan (`node --test`).
- Prueba en navegador (Chromium con API simulada): chat, oferta, validaciones y escape de HTML sin errores de JS.
- Java: **no se pudo ejecutar Maven** en el entorno de revisión. Antes de entregar ejecuta `./mvnw clean verify` en `Publication-Api`, `User-Api` y `Getaway-Spring`.

## 10. Próximos puntos recomendados

- Añadir edición de publicaciones.
- Añadir marcado como vendido.
- Incorporar compresión/redimensionamiento de imágenes.
- Añadir pruebas de integración con PostgreSQL/Testcontainers.
- Incorporar autorización más granular si se agregan roles.

