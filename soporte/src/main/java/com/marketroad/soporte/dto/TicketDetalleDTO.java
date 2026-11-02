package com.marketroad.soporte.dto;

import java.util.List;

public record TicketDetalleDTO(TicketResumenDTO ticket, List<MensajeTicketDTO> mensajes, boolean puedeEscribir) {}
