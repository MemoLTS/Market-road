package com.marketroad.soporte.exception;

public class TicketNoEncontradoException extends RuntimeException {
    public TicketNoEncontradoException(String mensaje) {
        super(mensaje);
    }
}
