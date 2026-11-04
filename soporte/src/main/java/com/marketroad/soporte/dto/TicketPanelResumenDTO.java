package com.marketroad.soporte.dto;

import java.time.OffsetDateTime;

public record TicketPanelResumenDTO(
                Long id,
                String asunto,
                String categoria,
                String categoriaNombre,
                String estado,
                String estadoNombre,
                String prioridad,
                String prioridadNombre,
                String usuarioApodo,
                Long asignadoId,
                String asignadoNombre,
                long sinLeer,
                String ultimoMensaje,
                OffsetDateTime fechaCreacion,
                OffsetDateTime fechaActualizacion) {
}
