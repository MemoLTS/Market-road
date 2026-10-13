package com.marketroad.publication.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ConversacionResumenDTO(
        Long id,
        Long publicacionId,
        String publicacionTitulo,
        BigDecimal publicacionPrecio,
        /** ACTIVA, VENDIDA o ELIMINADA */
        String publicacionEstado,
        String imagenUrl,
        /** Rol del usuario autenticado en esta conversación: COMPRADOR o VENDEDOR */
        String rol,
        Long interlocutorId,
        String interlocutorApodo,
        BigDecimal montoAcordado,
        String ultimoMensaje,
        OffsetDateTime ultimaActividad,
        long noLeidos) {}
