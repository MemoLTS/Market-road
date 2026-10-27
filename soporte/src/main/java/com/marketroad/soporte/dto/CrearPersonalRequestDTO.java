package com.marketroad.soporte.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CrearPersonalRequestDTO(
        @NotBlank(message = "Ingresa el nombre") @Size(max = 80, message = "El nombre puede tener como máximo 80 caracteres") String nombre,
        @NotBlank(message = "Ingresa el correo") @Size(max = 150, message = "El correo es demasiado largo") String correo,
        @NotBlank(message = "Ingresa la contraseña") @Size(max = 72, message = "La contraseña es demasiado larga") String contrasena,
        @NotBlank(message = "Elige el rol") String rol) {}
