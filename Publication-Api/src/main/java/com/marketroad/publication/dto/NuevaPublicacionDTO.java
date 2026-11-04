package com.marketroad.publication.dto;

import java.util.List;

public record NuevaPublicacionDTO(
                String titulo,
                String precio,
                String descripcion,
                String ubicacion,
                String categoria,
                List<String> modalidadesEntrega,
                Double latitud,
                Double longitud) {
}
