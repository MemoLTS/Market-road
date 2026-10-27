package com.marketroad.soporte.dto;

import java.util.List;
import java.util.Map;

public record EstadisticasDTO(
        long totalTickets,
        long sinAsignar,
        long creadosUltimos7Dias,
        long personalActivo,
        Map<String, Long> porEstado,
        Map<String, Long> porCategoria,
        Map<String, Long> porPrioridad,
        List<CargaPersonalDTO> carga) {}
