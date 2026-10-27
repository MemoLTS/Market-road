package com.marketroad.soporte.exception;

/** La persona está autenticada pero no tiene permiso para la acción (HTTP 403). */
public class NoAutorizadoException extends RuntimeException {
    public NoAutorizadoException(String mensaje) { super(mensaje); }
}
