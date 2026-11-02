# Diagramas de clases de Market-Road (StarUML)

Generados a partir del código fuente real del proyecto (Java y TypeScript).

## Cómo abrirlos

1. Abrir **StarUML** → `File → Open` → seleccionar `Market-Road.mdj`.
2. En el *Model Explorer* (panel izquierdo) cada servicio es un paquete; los diagramas cuelgan de él.
3. En `imagenes/` hay una vista previa PNG de cada diagrama, útil para consultar sin abrir StarUML.

## Contenido (14 diagramas)

| Paquete | Diagramas |
|---|---|
| **Vista general** | Arquitectura del sistema (frontend, gateway, User-Api, Publication-Api y MySQL con sus dos esquemas) |
| **User-Api** | Arquitectura por capas · DTOs · Excepciones |
| **Publication-Api** | Modelo de dominio · Publicaciones: capas · Publicaciones: DTOs · Mensajería y ofertas: capas · Mensajería y ofertas: DTOs · Catálogo y búsqueda · Seguridad, validación y excepciones |
| **Getaway-Spring** | Clases |
| **Frontend** | Tipos de datos de la API · Módulos del frontend |

## Criterios de modelado

- **Estereotipos:** `«controller»`, `«service»`, `«repository»`, `«entity»`, `«dto»`, `«record»`, `«configuration»`, `«filter»`, `«exceptionHandler»`, `«enumeration»`, `«módulo»`.
- **Enumeraciones:** se modelan como clase con estereotipo `«enumeration»` y sus constantes como atributos.
- **Asociaciones:** nacen de los campos (`@Autowired`, `@ManyToOne`, `@OneToMany`, componentes de records, atributos de tipo enum). `Publicacion ◆── ImagenPublicacion` es una composición bidireccional.
- **Dependencias** (líneas punteadas): clases que usan a otras en su código; los repositorios dependen de la entidad que gestionan.
- **Realización:** `UsuarioServiceImpl` → `UsuarioService`, `PublicacionServiceImpl` → `PublicacionService`.
- **No se muestran:** métodos privados, constantes privadas ni getters/setters de campos existentes (para que los diagramas sean legibles). Los métodos de controladores llevan su ruta HTTP en la documentación del elemento.
- Cada clase aparece una sola vez en el modelo y puede dibujarse en varios diagramas.

## Enfoque: Market-Road es un intermediario

La plataforma es solo un **puente entre vendedor y comprador**. No gestiona stock, no regula ni fija precios,
no cobra, no entrega y no se hace responsable del producto. Por eso los diagramas se corrigieron así:

- **Se eliminó el paquete Prod-Api** (inventario con `Producto`, stock, descuento, `ProveedorLog`, `StockResponse`)
  y sus 3 diagramas. El producto no existe como entidad propia: sus datos viven dentro de `Publicacion`.
- **Vista general:** sin Prod-Api ni rutas `/productos`, `/inventario`; MySQL muestra sus dos esquemas
  (`db_usuarios` para User-Api y `marketroad_db` para Publication-Api); nota con el alcance de la plataforma.
- **Modelo de dominio (Publication-Api):** `Publicacion` es un aviso del vendedor. `precio`, `precioVenta` y
  `montoAcordado` quedan documentados como datos informados por las partes (referenciales, sin regulación ni
  verificación). Se agregó `ModalidadEntrega` (ya existía en el código y faltaba en el modelo): la entrega la
  coordinan las partes. Nota explicativa en el diagrama.

## Sincronización con el código (inyección de dependencias)

El código pasó de inyección por constructor a `@Autowired` / `@Value` en campos. Se actualizaron:

- `JwtAuthFilter` (User-Api y Publication-Api): sin constructor; campos `@Autowired`.
- `JwtUtil` (User-Api y Publication-Api): sin constructor; nuevo campo `secreto` / `secret` (`@Value`) y método
  `inicializar()` (`@PostConstruct`) que crea la clave de firma.

Diagramas afectados: *User-Api · Arquitectura por capas* y *Publication-Api · Seguridad, validación y excepciones*.

Las vistas previas de los 4 diagramas modificados en `imagenes/` fueron regeneradas a partir del `.mdj`; para el
estilo exacto de StarUML, ábrelo y usa `File → Export Diagrams as Images`.

## Regenerar

Si el código cambia, los diagramas deben regenerarse (el generador lee `src/main/java` de cada servicio y `src/*.ts`).
