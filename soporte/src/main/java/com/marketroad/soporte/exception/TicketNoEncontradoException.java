package com.marketroad.soporte.exception;

/** El ticket no existe o la persona no tiene acceso a él (no se distingue, para no revelar su existencia). */
public class TicketNoEncontradoException extends RuntimeException {
    public TicketNoEncontradoException(String mensaje) { super(mensaje); }
}
