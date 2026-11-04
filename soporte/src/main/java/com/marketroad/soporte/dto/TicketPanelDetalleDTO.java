package com.marketroad.soporte.dto;

import java.util.List;

public record TicketPanelDetalleDTO(
                TicketPanelResumenDTO ticket,
                UsuarioTicketDTO usuario,
                List<MensajeTicketDTO> mensajes,
                boolean puedeResponder,
                List<String> estadosPermitidos,
                boolean puedeTomar) {
}
