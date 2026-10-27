package com.marketroad.soporte.dto;

import java.time.OffsetDateTime;

/** Vista del ticket para el personal de soporte. */
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
        /** Mensajes de la persona usuaria que el personal todavía no leyó. */
        long sinLeer,
        String ultimoMensaje,
        OffsetDateTime fechaCreacion,
        OffsetDateTime fechaActualizacion) {}
