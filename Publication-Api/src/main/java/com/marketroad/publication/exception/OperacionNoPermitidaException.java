package com.marketroad.publication.exception;

/** La operación es válida pero el estado actual no la permite (HTTP 409). */
public class OperacionNoPermitidaException extends RuntimeException {
    public OperacionNoPermitidaException(String mensaje) { super(mensaje); }
}
