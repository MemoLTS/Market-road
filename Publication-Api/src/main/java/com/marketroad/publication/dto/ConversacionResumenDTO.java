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
                long noLeidos,
                String ventaEstado,
                String ventaDetalle) {

        /** Sin datos de venta (la publicación no se marcó vendida a esta persona). */
        public ConversacionResumenDTO(Long id, Long publicacionId, String publicacionTitulo, BigDecimal publicacionPrecio,
                        String publicacionEstado, String imagenUrl, String rol, Long interlocutorId,
                        String interlocutorApodo, BigDecimal montoAcordado, String ultimoMensaje,
                        OffsetDateTime ultimaActividad, long noLeidos) {
                this(id, publicacionId, publicacionTitulo, publicacionPrecio, publicacionEstado, imagenUrl, rol,
                                interlocutorId, interlocutorApodo, montoAcordado, ultimoMensaje, ultimaActividad,
                                noLeidos, null, null);
        }
}
