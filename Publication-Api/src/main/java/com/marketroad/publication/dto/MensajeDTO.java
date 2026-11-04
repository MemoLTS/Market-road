package com.marketroad.publication.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record MensajeDTO(
                Long id,
                Long remitenteId,
                String tipo,
                String contenido,
                BigDecimal monto,
                String estadoOferta,
                boolean leido,
                OffsetDateTime fechaEnvio) {
}
