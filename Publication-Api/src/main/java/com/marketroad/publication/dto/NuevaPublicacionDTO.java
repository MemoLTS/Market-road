package com.marketroad.publication.dto;

import java.util.List;

/**
 * Datos para crear una publicación. `unidades` es opcional: si no se envía, la publicación queda con 1 unidad.
 */
public record NuevaPublicacionDTO(
                String titulo,
                String precio,
                String descripcion,
                String ubicacion,
                String categoria,
                List<String> modalidadesEntrega,
                Double latitud,
                Double longitud,
                Integer unidades) {

        /** Sin unidades indicadas (equivale a 1). */
        public NuevaPublicacionDTO(String titulo, String precio, String descripcion, String ubicacion,
                        String categoria, List<String> modalidadesEntrega, Double latitud, Double longitud) {
                this(titulo, precio, descripcion, ubicacion, categoria, modalidadesEntrega, latitud, longitud, null);
        }
}
