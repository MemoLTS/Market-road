# Diagramas de clases de Market-Road (StarUML)

Generados a partir del código fuente real del proyecto (Java y TypeScript).

## Cómo abrirlos

1. Abrir **StarUML** → `File → Open` → seleccionar `Market-Road.mdj`.
2. En el *Model Explorer* (panel izquierdo) cada servicio es un paquete; los diagramas cuelgan de él.
3. En `imagenes/` hay una vista previa PNG de cada diagrama, útil para consultar sin abrir StarUML.

## Contenido (17 diagramas)

| Paquete | Diagramas |
|---|---|
| **Vista general** | Arquitectura del sistema (frontend, gateway, microservicios, MySQL, puertos y rutas) |
| **User-Api** | Arquitectura por capas · DTOs · Excepciones |
| **Prod-Api** | Modelo de datos · Arquitectura por capas · Configuración y excepciones |
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

## Regenerar

Si el código cambia, los diagramas deben regenerarse (el generador lee `src/main/java` de cada servicio y `src/*.ts`).
