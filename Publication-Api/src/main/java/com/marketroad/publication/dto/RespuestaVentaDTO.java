package com.marketroad.publication.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de POST /conversaciones/{id}/venta/respuesta. `respuesta` es COMPRADO, NO_COMPRADO u OTRO;
 * con OTRO el detalle es obligatorio y la venta pasa a revisión de soporte.
 */
public record RespuestaVentaDTO(
        @NotBlank(message = "Indica si compraste el artículo")
        String respuesta,

        @Size(max = 1000, message = "El detalle no puede superar 1000 caracteres")
        String detalle) {}
