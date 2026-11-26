package api.com.v1.dto;

import jakarta.validation.constraints.NotNull;

/** Cuerpo de PATCH /admin/usuarios/{id}/estado: true habilita la cuenta, false la deshabilita. */
public record EstadoUsuarioDTO(@NotNull(message = "Indica si la cuenta queda activa") Boolean activo) {
}
