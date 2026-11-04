package com.marketroad.publication.catalogo;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import com.marketroad.publication.model.CategoriaPublicacion;

public record Candidato(
                Long id,
                String titulo,
                String descripcion,
                CategoriaPublicacion categoria,
                BigDecimal precio,
                Double latitud,
                Double longitud,
                OffsetDateTime fecha) {
}
