package com.marketroad.publication.dto;

import com.marketroad.publication.model.CategoriaSoporte;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TicketSoporteRequestDTO(
        @NotNull(message = "Elige el motivo de tu consulta")
        CategoriaSoporte categoria,

        @NotBlank(message = "El asunto no puede estar vacío")
        @Size(min = 3, max = 100, message = "El asunto debe tener entre 3 y 100 caracteres")
        String asunto,

        @NotBlank(message = "La descripción no puede estar vacía")
        @Size(min = 10, max = 1000, message = "La descripción debe tener entre 10 y 1000 caracteres")
        String descripcion) {}
