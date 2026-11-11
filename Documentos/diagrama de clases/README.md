# Diagramas de clases de Market-Road

Modelo StarUML (`Market-Road.mdj`) y vistas previas PNG (`imagenes/`) de los cuatro servicios del backend, el gateway y la arquitectura general.

## Cómo se usa

- Abrir `Market-Road.mdj` con [StarUML](https://staruml.io/): el árbol del modelo tiene un paquete por servicio y cada diagrama dentro de su paquete.
- Las vistas previas de `imagenes/` son las mismas vistas exportadas; sirven para el informe y para ver los diagramas sin abrir StarUML.

## Servicios modelados

| Paquete | Servicio | Puerto | Responsabilidad |
|---|---|---|---|
| Getaway-Spring | Gateway | 8081 | Punto de entrada único. Enruta `/auth`, `/usuarios`, `/admin/usuarios` a User-Api; `/publicaciones`, `/conversaciones`, `/admin/publicaciones` a Publication-Api; `/soporte` a Soporte-Api. |
| User-Api | usuarios | 8084 | Cuentas, JWT, perfil, dispositivos, administración de usuarios. |
| Publication-Api | publicaciones | 8083 | Publicaciones, catálogo, mensajería y ofertas entre comprador y vendedor. |
| Soporte-Api | soporte | 8086 | Tickets con chat, panel del personal y estadísticas (sesión del personal independiente). |

## Diagramas

| Paquete | Diagrama | Vista previa |
|---|---|---|
| Vista general | Arquitectura del sistema | `imagenes/Vista general - Arquitectura del sistema.png` |
| Frontend | Tipos de datos de la API | `imagenes/Frontend - Tipos de datos de la API.png` |
| Frontend | Módulos del frontend | `imagenes/Frontend - M#U00f3dulos del frontend.png` |
| Getaway-Spring | Arquitectura del gateway | `imagenes/Getaway-Spring - Arquitectura del gateway.png` |
| User-Api | Arquitectura por capas | `imagenes/User-Api - Arquitectura por capas.png` |
| User-Api | Seguridad y configuración | `imagenes/User-Api - Seguridad y configuración.png` |
| User-Api | DTOs | `imagenes/User-Api - DTOs.png` |
| User-Api | Excepciones | `imagenes/User-Api - Excepciones.png` |
| Publication-Api | Modelo de dominio | `imagenes/Publication-Api - Modelo de dominio.png` |
| Publication-Api | Publicaciones: capas | `imagenes/Publication-Api - Publicaciones - capas.png` |
| Publication-Api | Publicaciones: DTOs | `imagenes/Publication-Api - Publicaciones - DTOs.png` |
| Publication-Api | Mensajería y ofertas: capas | `imagenes/Publication-Api - Mensajería y ofertas - capas.png` |
| Publication-Api | Mensajería y ofertas: DTOs | `imagenes/Publication-Api - Mensajería y ofertas - DTOs.png` |
| Publication-Api | Catálogo y búsqueda | `imagenes/Publication-Api - Catálogo y búsqueda.png` |
| Publication-Api | Seguridad, validación y excepciones | `imagenes/Publication-Api - Seguridad, validación y excepciones.png` |
| Publication-Api | Soporte duplicado (legado) | `imagenes/Publication-Api - Soporte duplicado (legado).png` |
| Soporte-Api | Modelo de dominio | `imagenes/Soporte-Api - Modelo de dominio.png` |
| Soporte-Api | Tickets de usuario: capas | `imagenes/Soporte-Api - Tickets de usuario - capas.png` |
| Soporte-Api | Panel del personal: capas | `imagenes/Soporte-Api - Panel del personal - capas.png` |
| Soporte-Api | DTOs de tickets | `imagenes/Soporte-Api - DTOs de tickets.png` |
| Soporte-Api | DTOs del personal | `imagenes/Soporte-Api - DTOs del personal.png` |
| Soporte-Api | Seguridad, configuración y excepciones | `imagenes/Soporte-Api - Seguridad, configuración y excepciones.png` |

El paquete **Frontend** (módulos del frontend original y tipos de datos de la API) no se regenera: su contenido no cambió.

## Criterios de modelado

- Un paquete UML por servicio y, dentro, un subpaquete por paquete Java (`controller`, `service`, `repository`, `model`, `dto`, `security`, `exception`...).
- Estereotipos: `controller`, `service`, `repository`, `entity`, `configuration`, `filter`, `exceptionHandler`, `exception`, `dto`, `record`, `enumeration`. Los enum se modelan como clase con sus constantes como atributos.
- Se muestran los atributos no estáticos y los métodos públicos o protegidos; se omiten constructores, getters/setters y `equals`/`hashCode`/`toString`.
- En los controladores, la documentación de cada operación indica el método y la ruta HTTP (por ejemplo `GET /{id}`); la ruta base está en la documentación de la clase.
- Los campos y los componentes de `record` generan **asociaciones** (con el nombre del campo); las firmas de métodos y la entidad de cada repositorio generan **dependencias**; `extends`/`implements` generan generalizaciones y realizaciones.

## Cómo regenerar

Los diagramas se generan desde el código, así que no se desactualizan si se vuelve a ejecutar:

```bash
python3 "Documentos/diagrama de clases/generador/generar.py"   # requiere Python 3, Pillow y Graphviz (dot)
```

El script lee `src/main/java` de cada servicio y `Getaway-Spring/src/main/resources/application.yml`, reescribe `Market-Road.mdj` (conservando el paquete Frontend) y vuelve a dibujar los PNG.

## Cambios de esta versión

- **Se agregó el servicio de soporte** (Soporte-Api), que no estaba modelado, con 6 diagramas y su base de datos propia en la vista general.
- **User-Api**: ahora incluye dispositivos de inicio de sesión, foto de perfil, rol, administración de usuarios y el filtro `ControlAccesoUsuariosFilter`.
- **Publication-Api**: ahora incluye la administración de publicaciones, la edición (`ActualizarPublicacionDTO`, `PATCH /publicaciones/{id}`), los DTOs de mensajería y el catálogo.
- **Gateway**: el diagrama lee las rutas reales del `application.yml` (las tres rutas cubren los tres servicios).
- **Vista general**: agrega Soporte-Api, la base de datos `db_soporte` (instancia `mysql-soporte`) y el frontend React.

## Deuda técnica visible en los diagramas

- `Publication-Api - Soporte duplicado (legado)`: Publication-Api conserva una copia antigua del soporte (`SoporteController`, `TicketSoporte`...). El gateway no la enruta; conviene eliminarla junto con sus pruebas.
