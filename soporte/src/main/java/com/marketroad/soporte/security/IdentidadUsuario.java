package com.marketroad.soporte.security;

import com.marketroad.soporte.exception.NoAutorizadoException;

import jakarta.servlet.http.HttpServletRequest;

/** Persona usuaria de la plataforma, según el JWT emitido por User-Api (subject = id, claims "apodo", "correo" y "rol"). */
public record IdentidadUsuario(Long usuarioId, String apodo, String correo) {
    public static final String ATRIBUTO = "identidadUsuarioAutenticada";

    public static IdentidadUsuario de(HttpServletRequest request) {
        Object valor = request.getAttribute(ATRIBUTO);
        if (valor instanceof IdentidadUsuario identidad) {
            return identidad;
        }
        throw new NoAutorizadoException("Debes iniciar sesión para acceder a este recurso");
    }

    /** Nombre para mostrar en los tickets cuando la cuenta no tiene apodo. */
    public String nombreVisible() {
        return apodo == null || apodo.isBlank() ? "Usuario #" + usuarioId : apodo;
    }
}
