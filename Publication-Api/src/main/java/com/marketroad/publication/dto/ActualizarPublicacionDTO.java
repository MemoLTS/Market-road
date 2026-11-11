package com.marketroad.publication.dto;

/**
 * Cambios parciales de una publicación (PATCH /publicaciones/{id}).
 * Los campos en null no se modifican. No incluye fotos, modalidades de entrega ni coordenadas:
 * esos datos se fijan al crear la publicación.
 */
public record ActualizarPublicacionDTO(
                String titulo,
                String precio,
                String descripcion,
                String ubicacion,
                String categoria,
                Integer unidades) {

        /** Sin cambio de unidades. */
        public ActualizarPublicacionDTO(String titulo, String precio, String descripcion, String ubicacion,
                        String categoria) {
                this(titulo, precio, descripcion, ubicacion, categoria, null);
        }
}
