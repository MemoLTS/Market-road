package com.marketroad.publication.dto;

import java.time.OffsetDateTime;

public record TicketSoporteDTO(
        Long id,
        Long usuarioId,
        String usuarioApodo,
        String categoria,
        String categoriaNombre,
        String asunto,
        String descripcion,
        String estado,
        String respuesta,
        OffsetDateTime fechaRespuesta,
        OffsetDateTime fechaCreacion) {}
