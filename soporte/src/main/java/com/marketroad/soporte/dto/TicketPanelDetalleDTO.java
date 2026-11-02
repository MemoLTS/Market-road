package com.marketroad.soporte.dto;

import java.util.List;

public record TicketPanelDetalleDTO(
        TicketPanelResumenDTO ticket,
        UsuarioTicketDTO usuario,
        List<MensajeTicketDTO> mensajes,
        boolean puedeResponder,
        /** Estados a los que el personal puede mover el ticket ahora. */
        List<String> estadosPermitidos,
        /** Un SOPORTE puede tomar un ticket sin asignar; ADMIN también puede reasignarlo. */
        boolean puedeTomar) {}
