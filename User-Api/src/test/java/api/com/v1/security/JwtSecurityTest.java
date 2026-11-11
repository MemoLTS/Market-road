package api.com.v1.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.ObjectMapper;

import api.com.v1.model.Rol;
import io.jsonwebtoken.Claims;

class JwtSecurityTest {

    @Test
    void jwtUtil_inicializarConSecretoCortoLanzaError() {
        JwtUtil jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secreto", "corta");
        ReflectionTestUtils.setField(jwtUtil, "expiracionMs", 60000L);

        IllegalStateException ex = assertThrows(IllegalStateException.class, jwtUtil::inicializar);

        assertTrue(ex.getMessage().contains("jwt.secret"));
    }

    @Test
    void jwtUtil_generarYValidarToken() {
        JwtUtil jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secreto", "12345678901234567890123456789012");
        ReflectionTestUtils.setField(jwtUtil, "expiracionMs", 60000L);
        jwtUtil.inicializar();

        String token = jwtUtil.generarToken(7L, "user@correo.cl", "alex", Rol.USUARIO);
        Claims claims = jwtUtil.validarYObtenerClaims(token);

        assertEquals("7", claims.getSubject());
        assertEquals("user@correo.cl", claims.get("correo"));
        assertEquals("alex", claims.get("apodo"));
        assertEquals("USUARIO", claims.get("rol"));
        assertEquals(60000L, jwtUtil.getExpiracionMs());
        assertFalse(jwtUtil.estaExpirado(token));
    }

    @Test
    void jwtAuthFilter_rutaPublicaNoRequiereToken() throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter();
        JwtUtil jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secreto", "12345678901234567890123456789012");
        ReflectionTestUtils.setField(jwtUtil, "expiracionMs", 60000L);
        jwtUtil.inicializar();
        ReflectionTestUtils.setField(filter, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(filter, "objectMapper", new ObjectMapper());

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(200, response.getStatus());
        assertNull(request.getAttribute("usuarioAutenticadoId"));
    }

    @Test
    void jwtAuthFilter_sinTokenEnRutaProtegidaDevuelve401() throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter();
        ReflectionTestUtils.setField(filter, "jwtUtil", new JwtUtil());
        ReflectionTestUtils.setField(filter, "objectMapper", new ObjectMapper());

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/usuarios/1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Debes iniciar sesión"));
    }

    @Test
    void jwtAuthFilter_conTokenValidoSeteaUsuarioAutenticado() throws Exception {
        JwtUtil jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secreto", "12345678901234567890123456789012");
        ReflectionTestUtils.setField(jwtUtil, "expiracionMs", 60000L);
        jwtUtil.inicializar();

        JwtAuthFilter filter = new JwtAuthFilter();
        ReflectionTestUtils.setField(filter, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(filter, "objectMapper", new ObjectMapper());

        String token = jwtUtil.generarToken(11L, "test@correo.cl", "tester", Rol.USUARIO);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/usuarios/11");
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(11L, request.getAttribute("usuarioAutenticadoId"));
        assertEquals(200, response.getStatus());
    }
}
