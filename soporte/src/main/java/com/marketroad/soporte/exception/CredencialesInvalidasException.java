package com.marketroad.soporte.exception;

/** Correo o contraseña incorrectos, o cuenta desactivada (HTTP 401). */
public class CredencialesInvalidasException extends RuntimeException {
    public CredencialesInvalidasException(String mensaje) { super(mensaje); }
}
