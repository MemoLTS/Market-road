package com.marketroad.publication.dto;

/** Datos de texto para crear una publicación (las fotos se envían aparte). */
public record NuevaPublicacionDTO(
        String titulo,
        String precio,
        String descripcion,
        String ubicacion,
        String categoria,
        Double latitud,
        Double longitud) {}
