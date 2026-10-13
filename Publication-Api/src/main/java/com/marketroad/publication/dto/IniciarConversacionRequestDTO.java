package com.marketroad.publication.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record IniciarConversacionRequestDTO(
        @NotNull(message = "Debes indicar la publicación")
        @Positive(message = "La publicación indicada no es válida")
        Long publicacionId,

        @NotBlank(message = "El mensaje no puede estar vacío")
        @Size(max = 1000, message = "El mensaje puede tener como máximo 1000 caracteres")
        String contenido) {}
