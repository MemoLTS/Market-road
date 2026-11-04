package com.marketroad.publication.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ConversacionResumenDTO(
                Long id,
                Long publicacionId,
                String publicacionTitulo,
                BigDecimal publicacionPrecio,
                String publicacionEstado,
                String imagenUrl,
                String rol,
                Long interlocutorId,
                String interlocutorApodo,
                BigDecimal montoAcordado,
                String ultimoMensaje,
                OffsetDateTime ultimaActividad,
                long noLeidos) {
}
