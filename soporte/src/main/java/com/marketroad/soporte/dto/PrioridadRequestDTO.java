package com.marketroad.soporte.dto;

import jakarta.validation.constraints.NotBlank;

public record PrioridadRequestDTO(@NotBlank(message = "Indica la prioridad") String prioridad) {}
