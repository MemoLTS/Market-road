# Publication-Api

Microservicio Spring Boot de publicaciones de venta para Market-Road.

## Características

- Crear publicaciones autenticadas.
- Entre 1 y 8 imágenes por publicación.
- JPG, PNG y WEBP.
- Máximo 5 MB por imagen.
- Título de 3 a 100 caracteres.
- Precio positivo con hasta 2 decimales.
- Asociación con el usuario mediante el `subject` del JWT.
- Consulta pública de publicaciones activas.
- Eliminación restringida al propietario.

Puerto: `8083`.

La API se expone normalmente mediante `Getaway-Spring` en `http://localhost:8082/api/v1/publicaciones`.


## Catálogo y mensajería

- Catálogo paginado con búsqueda, categorías, rango de precio, radio y orden por relevancia, precio, distancia o recientes.
- Mensajería comprador-vendedor por publicación, con ofertas de precio, aceptación/rechazo y cierre de venta.
- Detalle de endpoints en `Documentos/Documentacion_Proyecto.md`.
