package com.marketroad.publication.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

public record OfertaRequestDTO(
        @NotNull(message = "Debes indicar el monto de la oferta")
        @DecimalMin(value = "0.01", message = "La oferta debe ser mayor que 0")
        @Digits(integer = 10, fraction = 2, message = "La oferta admite hasta 10 dígitos enteros y 2 decimales")
        BigDecimal monto) {}
