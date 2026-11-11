package com.marketroad.publication.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record AdminPublicacionDTO(
                Long id,
                String titulo,
                BigDecimal precio,
                String categoria,
                String categoriaNombre,
                String ubicacion,
                String estado,
                Long usuarioId,
                String vendedorApodo,
                Long compradorId,
                BigDecimal precioVenta,
                OffsetDateTime fechaVenta,
                OffsetDateTime fechaCreacion,
                int cantidadImagenes,
                int unidades) {
}
