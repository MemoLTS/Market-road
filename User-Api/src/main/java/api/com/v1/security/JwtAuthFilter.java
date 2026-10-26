package api.com.v1.security;

import java.io.IOException;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Filtro liviano (no usa Spring Security completo) que exige un JWT válido
 * en el header Authorization para las rutas protegidas de /api/v1/usuarios.
 *
 * Quedan SIN protección (no requieren token):
 * - POST /api/v1/usuarios        -> registro de un usuario nuevo
 * - POST /api/v1/auth/login      -> inicio de sesión
 * - cualquier request OPTIONS    -> preflight CORS
 *
 * Si el token es válido, se guarda el id del usuario autenticado en el
 * request como atributo "usuarioAutenticadoId" para que los controllers
 * puedan usarlo si lo necesitan.
 */
@Component
@Order(1)
public class JwtAuthFilter extends HttpFilter {

    private static final String PREFIJO_USUARIOS = "/api/v1/usuarios";
    private static final String BEARER = "Bearer ";

    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilter(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        String metodo = request.getMethod();
        String path = request.getRequestURI();

        if (esRutaPublica(metodo, path)) {
            chain.doFilter(request, response);
            return;
        }

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith(BEARER)) {
            responderNoAutorizado(response, "Debes iniciar sesión para acceder a este recurso");
            return;
        }

        String token = header.substring(BEARER.length()).trim();

        try {
            Long usuarioId = jwtUtil.obtenerUsuarioId(token);
            request.setAttribute("usuarioAutenticadoId", usuarioId);
            chain.doFilter(request, response);
        } catch (JwtException | IllegalArgumentException ex) {
            responderNoAutorizado(response, "Tu sesión no es válida o expiró, inicia sesión nuevamente");
        }
    }

    private boolean esRutaPublica(String metodo, String path) {
        if ("OPTIONS".equalsIgnoreCase(metodo)) {
            return true;
        }
        if (path.startsWith("/api/v1/auth")) {
            return true;
        }
        // Registro de usuario nuevo: POST exacto a /api/v1/usuarios
        if ("POST".equalsIgnoreCase(metodo) && PREFIJO_USUARIOS.equals(path)) {
            return true;
        }
        // Rutas fuera de /api/v1/usuarios (ej. actuator, health) no se tocan
        return !path.startsWith(PREFIJO_USUARIOS);
    }

    private void responderNoAutorizado(HttpServletResponse response, String mensaje) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(java.util.Map.of("mensaje", mensaje)));
    }
}
