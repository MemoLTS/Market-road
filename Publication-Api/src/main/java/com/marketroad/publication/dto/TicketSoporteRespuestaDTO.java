package com.marketroad.publication.dto;

import com.marketroad.publication.model.EstadoTicket;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TicketSoporteRespuestaDTO(
                @NotNull(message = "Indica el estado de la solicitud") EstadoTicket estado,

                @Size(max = 1000, message = "La respuesta puede tener como máximo 1000 caracteres") String respuesta) {
}
