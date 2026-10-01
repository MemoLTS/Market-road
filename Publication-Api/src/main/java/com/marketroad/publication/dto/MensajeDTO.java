package com.marketroad.publication.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record MensajeDTO(
        Long id,
        Long remitenteId,
        /** TEXTO, OFERTA o SISTEMA */
        String tipo,
        String contenido,
        /** Solo en ofertas */
        BigDecimal monto,
        /** Solo en ofertas: PENDIENTE, ACEPTADA, RECHAZADA o REEMPLAZADA */
        String estadoOferta,
        boolean leido,
        OffsetDateTime fechaEnvio) {}
