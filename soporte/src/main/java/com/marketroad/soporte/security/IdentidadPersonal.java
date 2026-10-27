package com.marketroad.soporte.security;

import com.marketroad.soporte.exception.NoAutorizadoException;
import com.marketroad.soporte.model.RolPersonal;

import jakarta.servlet.http.HttpServletRequest;

/** Integrante del equipo de soporte autenticado. El rol sale de la base de datos (no del token) en cada petición. */
public record IdentidadPersonal(Long personalId, String nombre, RolPersonal rol) {
    public static final String ATRIBUTO = "identidadPersonalAutenticada";

    public static IdentidadPersonal de(HttpServletRequest request) {
        Object valor = request.getAttribute(ATRIBUTO);
        if (valor instanceof IdentidadPersonal identidad) {
            return identidad;
        }
        throw new NoAutorizadoException("Debes iniciar sesión en el panel de soporte");
    }

    public boolean esAdmin() {
        return rol == RolPersonal.ADMIN;
    }

    public void exigirAdmin() {
        if (!esAdmin()) {
            throw new NoAutorizadoException("Solo un administrador de soporte puede realizar esta acción");
        }
    }
}
