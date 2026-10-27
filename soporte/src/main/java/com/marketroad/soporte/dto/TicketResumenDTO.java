package com.marketroad.soporte.dto;

import java.time.OffsetDateTime;

/** Vista del ticket para la persona usuaria que lo abrió. */
public record TicketResumenDTO(
        Long id,
        String asunto,
        String categoria,
        String categoriaNombre,
        String estado,
        String estadoNombre,
        String ultimoMensaje,
        /** Respuestas del equipo de soporte que todavía no leyó. */
        long noLeidos,
        OffsetDateTime fechaCreacion,
        OffsetDateTime fechaActualizacion) {}
