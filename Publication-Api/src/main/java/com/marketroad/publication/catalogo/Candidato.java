package com.marketroad.publication.catalogo;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import com.marketroad.publication.model.CategoriaPublicacion;

/** Datos mínimos de una publicación para filtrar y ordenar (sin imágenes). */
public record Candidato(
        Long id,
        String titulo,
        String descripcion,
        CategoriaPublicacion categoria,
        BigDecimal precio,
        Double latitud,
        Double longitud,
        OffsetDateTime fecha) {}
