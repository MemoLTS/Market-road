package com.marketroad.soporte.security;

import com.marketroad.soporte.exception.NoAutorizadoException;

import jakarta.servlet.http.HttpServletRequest;

public record IdentidadUsuario(Long usuarioId, String apodo, String correo, String rol) {
    public static final String ATRIBUTO = "identidadUsuarioAutenticada";
    public static final String ROL_SUPERUSUARIO = "SUPERUSUARIO";

    public boolean esSuperusuario() {
        return ROL_SUPERUSUARIO.equals(rol);
    }

    public void exigirSuperusuario() {
        if (!esSuperusuario()) {
            throw new NoAutorizadoException("Acceso restringido al superusuario");
        }
    }

    public static IdentidadUsuario de(HttpServletRequest request) {
        Object valor = request.getAttribute(ATRIBUTO);
        if (valor instanceof IdentidadUsuario identidad) {
            return identidad;
        }
        throw new NoAutorizadoException("Debes iniciar sesión para acceder a este recurso");
    }

    public String nombreVisible() {
        return apodo == null || apodo.isBlank() ? "Usuario #" + usuarioId : apodo;
    }
}
