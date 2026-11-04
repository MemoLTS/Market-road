package com.marketroad.publication.security;

import com.marketroad.publication.exception.NoAutorizadoException;
import jakarta.servlet.http.HttpServletRequest;

public record Identidad(Long usuarioId, String apodo, String rol) {
    public static final String ATRIBUTO = "identidadAutenticada";
    public static final String ROL_SUPERUSUARIO = "SUPERUSUARIO";

    public Identidad(Long usuarioId, String apodo) {
        this(usuarioId, apodo, null);
    }

    public boolean esSuperusuario() {
        return ROL_SUPERUSUARIO.equals(rol);
    }

    public static Identidad de(HttpServletRequest request) {
        Object valor = request.getAttribute(ATRIBUTO);
        if (valor instanceof Identidad identidad) {
            return identidad;
        }
        throw new NoAutorizadoException("Debes iniciar sesión para acceder a este recurso");
    }
}
