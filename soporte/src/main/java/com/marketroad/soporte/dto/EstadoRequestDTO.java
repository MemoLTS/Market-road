package com.marketroad.soporte.dto;

import jakarta.validation.constraints.NotBlank;

public record EstadoRequestDTO(@NotBlank(message = "Indica el estado") String estado) {}
