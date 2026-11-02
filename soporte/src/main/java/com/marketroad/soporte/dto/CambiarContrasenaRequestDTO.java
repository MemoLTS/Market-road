package com.marketroad.soporte.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CambiarContrasenaRequestDTO(
        @NotBlank(message = "Ingresa tu contraseña actual") @Size(max = 72, message = "La contraseña es demasiado larga") String actual,
        @NotBlank(message = "Ingresa la nueva contraseña") @Size(max = 72, message = "La contraseña es demasiado larga") String nueva) {}
