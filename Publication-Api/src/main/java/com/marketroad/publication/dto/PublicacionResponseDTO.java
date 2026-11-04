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
                String categoria,
                String categoriaNombre,
                List<ModalidadEntregaDTO> modalidadesEntrega,
                Double latitud,
                Double longitud,
                Double distanciaKm,
                Long usuarioId,
                String vendedorApodo,
                String estado,
                OffsetDateTime fechaCreacion,
                List<String> imagenUrls) {
}
