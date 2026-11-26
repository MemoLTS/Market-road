package com.marketroad.publication.security;

import java.io.IOException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.*;
import jakarta.servlet.http.*;

@Component
@Order(1)
public class JwtAuthFilter extends HttpFilter {
    @Autowired
    private JwtUtil jwtUtil;
    @Autowired
    private ObjectMapper mapper;
    @Autowired(required = false)
    private VerificadorCuenta verificador;

    @Override
    protected void doFilter(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod()) || esPublica(request)) {
            chain.doFilter(request, response);
            return;
        }
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            noAutorizado(response, "Debes iniciar sesión para acceder a este recurso");
            return;
        }
        try {
            String token = header.substring(7).trim();
            Identidad identidad = jwtUtil.obtenerIdentidad(token);
            if (verificador != null && !identidad.esSuperusuario()) {
                VerificadorCuenta.Estado cuenta = verificador.consultar(identidad.usuarioId(), token);
                if (cuenta == VerificadorCuenta.Estado.ELIMINADA) {
                    noAutorizado(response, "Tu cuenta ya no existe");
                    return;
                }
                if (cuenta == VerificadorCuenta.Estado.DESHABILITADA) {
                    prohibido(response, "Tu cuenta está deshabilitada. Solo puedes escribir a soporte");
                    return;
                }
            }
            request.setAttribute(Identidad.ATRIBUTO, identidad);
            chain.doFilter(request, response);
        } catch (JwtException | IllegalArgumentException ex) {
            noAutorizado(response, "Tu sesión no es válida o expiró, inicia sesión nuevamente");
        }
    }

    private boolean esPublica(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        return "GET".equalsIgnoreCase(method)
                && (path.equals("/api/v1/publicaciones") || path.equals("/api/v1/publicaciones/categorias")
                    || path.matches("/api/v1/publicaciones/[0-9]+")
                    || path.matches("/api/v1/publicaciones/[0-9]+/imagenes/[0-9]+"));
    }

    private void prohibido(HttpServletResponse response, String mensaje) throws IOException {
        response.setStatus(403);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(mapper.writeValueAsString(Map.of("mensaje", mensaje)));
    }

    private void noAutorizado(HttpServletResponse response, String mensaje) throws IOException {
        response.setStatus(401);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(mapper.writeValueAsString(Map.of("mensaje", mensaje)));
    }
}
