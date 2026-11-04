package com.marketroad.soporte.dto;

import java.time.OffsetDateTime;

public record TicketResumenDTO(
                Long id,
                String asunto,
                String categoria,
                String categoriaNombre,
                String estado,
                String estadoNombre,
                String ultimoMensaje,
                long noLeidos,
                OffsetDateTime fechaCreacion,
                OffsetDateTime fechaActualizacion) {
}
