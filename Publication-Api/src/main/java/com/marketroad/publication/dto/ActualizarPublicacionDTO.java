package com.marketroad.publication.dto;

/**
 * Cambios parciales de una publicación (PATCH /publicaciones/{id}).
 * Los campos en null no se modifican. Las coordenadas (latitud y longitud) deben venir juntas y se
 * guardan cuando la ubicación se elige en la lista o el mapa. No incluye fotos ni modalidades de entrega.
 */
public record ActualizarPublicacionDTO(
                String titulo,
                String precio,
                String descripcion,
                String ubicacion,
                String categoria,
                Integer unidades,
                Double latitud,
                Double longitud) {

        /** Sin cambio de unidades. */
        public ActualizarPublicacionDTO(String titulo, String precio, String descripcion, String ubicacion,
                        String categoria) {
                this(titulo, precio, descripcion, ubicacion, categoria, null, null, null);
        }

        /** Sin cambio de coordenadas. */
        public ActualizarPublicacionDTO(String titulo, String precio, String descripcion, String ubicacion,
                        String categoria, Integer unidades) {
                this(titulo, precio, descripcion, ubicacion, categoria, unidades, null, null);
        }
}
