package com.marketroad.publication.dto;

import jakarta.validation.constraints.NotNull;

/** Cuerpo de PATCH /admin/publicaciones/{id}/estado: true la vuelve a publicar, false la deshabilita. */
public record EstadoPublicacionAdminDTO(@NotNull(message = "Indica si la publicación queda habilitada") Boolean habilitada) {
}
