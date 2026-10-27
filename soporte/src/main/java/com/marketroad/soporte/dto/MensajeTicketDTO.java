package com.marketroad.soporte.dto;

import java.time.OffsetDateTime;

public record MensajeTicketDTO(
        Long id,
        /** USUARIO, PERSONAL o SISTEMA */
        String autorTipo,
        String autorNombre,
        String contenido,
        OffsetDateTime fecha) {}
