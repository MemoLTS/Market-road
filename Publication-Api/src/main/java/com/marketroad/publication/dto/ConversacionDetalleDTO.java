package com.marketroad.publication.dto;

import java.util.List;

public record ConversacionDetalleDTO(ConversacionResumenDTO conversacion, List<MensajeDTO> mensajes) {}
