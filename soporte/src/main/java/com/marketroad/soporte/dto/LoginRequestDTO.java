package com.marketroad.soporte.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequestDTO(
        @NotBlank(message = "Ingresa tu correo") @Size(max = 150, message = "El correo es demasiado largo") String correo,
        @NotBlank(message = "Ingresa tu contraseña") @Size(max = 72, message = "La contraseña es demasiado larga") String contrasena) {}
