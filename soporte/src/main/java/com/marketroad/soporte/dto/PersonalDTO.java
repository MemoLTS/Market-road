package com.marketroad.soporte.dto;

import java.time.OffsetDateTime;

public record PersonalDTO(
        Long id,
        String nombre,
        String correo,
        /** SOPORTE o ADMIN */
        String rol,
        String rolNombre,
        boolean activo,
        OffsetDateTime fechaCreacion,
        OffsetDateTime ultimoAcceso,
        /** Tickets en curso que lleva (solo se informa en el listado del administrador). */
        long ticketsEnCurso) {}
