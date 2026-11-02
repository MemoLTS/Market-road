package com.marketroad.soporte.dto;

import java.util.Map;

/** Totales de tickets para el panel del superusuario de la plataforma. */
public record ResumenSoporteDTO(
        long total,
        /** Tickets que necesitan atención (abiertos o en progreso) y nadie lleva todavía. */
        long sinAsignar,
        /** Cantidad por estado (todos los estados, con 0 si no hay). */
        Map<String, Long> porEstado) {}
