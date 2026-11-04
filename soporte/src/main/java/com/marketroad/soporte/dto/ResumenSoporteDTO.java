package com.marketroad.soporte.dto;

import java.util.Map;

public record ResumenSoporteDTO(
                long total,
                long sinAsignar,
                Map<String, Long> porEstado) {
}
