package com.marketroad.soporte.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CrearTicketRequestDTO(
        @NotBlank(message = "El asunto no puede estar vacío")
        @Size(max = 120, message = "El asunto puede tener como máximo 120 caracteres")
        String asunto,
        @NotBlank(message = "Elige una categoría")
        String categoria,
        @NotBlank(message = "Cuéntanos qué necesitas")
        @Size(max = 1000, message = "El mensaje puede tener como máximo 1000 caracteres")
        String mensaje) {}
