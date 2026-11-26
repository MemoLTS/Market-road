package com.marketroad.publication.dto;

import jakarta.validation.constraints.NotNull;

/** Cuerpo de PATCH /publicaciones/{id}/visibilidad: true la muestra, false la oculta. */
public record VisibilidadDTO(@NotNull(message = "Indica si la publicación queda visible") Boolean visible) {}
