package com.marketroad.soporte.dto;

import jakarta.validation.constraints.Size;

public record ActualizarPersonalRequestDTO(
                @Size(max = 80, message = "El nombre puede tener como máximo 80 caracteres") String nombre,
                String rol,
                Boolean activo,
                @Size(max = 72, message = "La contraseña es demasiado larga") String contrasena) {
}
