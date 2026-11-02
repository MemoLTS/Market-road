package com.marketroad.soporte.security;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketroad.soporte.model.PersonalSoporte;
import com.marketroad.soporte.repository.PersonalSoporteRepository;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Filtro liviano (sin Spring Security completo) con dos "mundos" de autenticación separados:
 * <ul>
 *   <li>{@code /api/v1/soporte/panel/**}: exige token del PERSONAL de soporte. Además de la firma, se comprueba en la
 *       base de datos que la cuenta siga activa y se toma el rol de ahí, así desactivar o degradar a alguien
 *       surte efecto de inmediato aunque su token no haya vencido.</li>
 *   <li>El resto de {@code /api/v1/soporte/**}: exige token de una persona usuaria de la plataforma (emitido por User-Api).</li>
 * </ul>
 * Públicos: preflight CORS, {@code GET /categorias} y {@code POST /panel/auth/login}.
 */
@Component
@Order(1)
public class SoporteAuthFilter extends HttpFilter {
    private static final String BASE = "/api/v1/soporte";
    private static final String PANEL = BASE + "/panel/";

    @Autowired
    private JwtUsuarioUtil jwtUsuario;
    @Autowired
    private JwtPersonalUtil jwtPersonal;
    @Autowired
    private PersonalSoporteRepository personalRepository;
    @Autowired
    private ObjectMapper mapper;

    @Override
    protected void doFilter(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        String path = request.getRequestURI();
        if ("OPTIONS".equalsIgnoreCase(request.getMethod()) || !path.startsWith(BASE) || esPublica(request)) {
            chain.doFilter(request, response);
            return;
        }
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            noAutorizado(response, "Debes iniciar sesión para acceder a este recurso");
            return;
        }
        String token = header.substring(7).trim();
        // La autenticación va en su propio try: así un error de un controlador nunca se confunde con un token inválido.
        try {
            if (path.startsWith(PANEL)) {
                Long personalId = jwtPersonal.obtenerPersonalId(token);
                Optional<PersonalSoporte> personal = personalRepository.findById(personalId);
                if (personal.isEmpty() || !personal.get().isActivo()) {
                    noAutorizado(response, "Tu cuenta de soporte no está activa");
                    return;
                }
                PersonalSoporte p = personal.get();
                request.setAttribute(IdentidadPersonal.ATRIBUTO, new IdentidadPersonal(p.getId(), p.getNombre(), p.getRol()));
            } else {
                request.setAttribute(IdentidadUsuario.ATRIBUTO, jwtUsuario.obtenerIdentidad(token));
            }
        } catch (JwtException | IllegalArgumentException ex) {
            noAutorizado(response, "Tu sesión no es válida o expiró, inicia sesión nuevamente");
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean esPublica(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        return ("GET".equalsIgnoreCase(method) && path.equals(BASE + "/categorias"))
                || ("POST".equalsIgnoreCase(method) && path.equals(PANEL + "auth/login"));
    }

    private void noAutorizado(HttpServletResponse response, String mensaje) throws IOException {
        response.setStatus(401);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(mapper.writeValueAsString(Map.of("mensaje", mensaje)));
    }
}
