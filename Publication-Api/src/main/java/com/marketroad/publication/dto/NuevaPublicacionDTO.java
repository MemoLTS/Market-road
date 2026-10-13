package com.marketroad.publication.dto;

import java.util.List;

/** Datos de texto para crear una publicación (las fotos se envían aparte). */
public record NuevaPublicacionDTO(
        String titulo,
        String precio,
        String descripcion,
        String ubicacion,
        String categoria,
        List<String> modalidadesEntrega,
        Double latitud,
        Double longitud) {}
