package com.marketroad.publication.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record PublicacionResponseDTO(
        Long id,
        String titulo,
        BigDecimal precio,
        String descripcion,
        String ubicacion,
        /** Código de la categoría (ej. ELECTRONICA) y su nombre para mostrar. */
        String categoria,
        String categoriaNombre,
        Double latitud,
        Double longitud,
        /** Solo cuando la consulta incluye la ubicación del usuario y la publicación tiene coordenadas. */
        Double distanciaKm,
        Long usuarioId,
        String vendedorApodo,
        String estado,
        OffsetDateTime fechaCreacion,
        List<String> imagenUrls) {}
