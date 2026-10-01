package com.marketroad.publication.security;

import com.marketroad.publication.exception.NoAutorizadoException;
import jakarta.servlet.http.HttpServletRequest;

/** Usuario autenticado según el JWT emitido por User-Api (subject = id, claim "apodo"). */
public record Identidad(Long usuarioId, String apodo) {
    public static final String ATRIBUTO = "identidadAutenticada";

    public static Identidad de(HttpServletRequest request) {
        Object valor = request.getAttribute(ATRIBUTO);
        if (valor instanceof Identidad identidad) {
            return identidad;
        }
        throw new NoAutorizadoException("Debes iniciar sesión para acceder a este recurso");
    }
}
