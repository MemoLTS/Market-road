package com.marketroad.soporte.dto;

/** Datos de quien abrió el ticket. El id y el correo solo se informan al rol ADMIN (en SOPORTE llegan null). */
public record UsuarioTicketDTO(Long id, String apodo, String correo) {}
