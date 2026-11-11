package com.marketroad.publication;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.boot.SpringApplication;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketroad.publication.exception.GlobalExceptionHandler;
import com.marketroad.publication.exception.NoAutorizadoException;
import com.marketroad.publication.security.Identidad;
import com.marketroad.publication.security.JwtAuthFilter;
import com.marketroad.publication.security.JwtUtil;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;

class PublicationApiSmokeTest {

    @Test
    void main_invocaSpringRun() {
        String[] args = { "--server.port=0" };
        try (MockedStatic<SpringApplication> spring = mockStatic(SpringApplication.class)) {
            PublicationApi.main(args);
            spring.verify(() -> SpringApplication.run(PublicationApi.class, args));
        }
    }

    @Test
    void jwtUtil_cargaIdentidadDelToken() {
        String secreto = "12345678901234567890123456789012";
        JwtUtil util = new JwtUtil();
        ReflectionTestUtils.setField(util, "secret", secreto);
        util.inicializar();

        String token = Jwts.builder()
                .subject("42")
                .claim("apodo", "Ana")
                .claim("rol", Identidad.ROL_SUPERUSUARIO)
                .signWith(Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8)))
                .compact();

        Identidad identidad = util.obtenerIdentidad(token);
        assertEquals(42L, identidad.usuarioId());
        assertEquals("Ana", identidad.apodo());
        assertTrue(identidad.esSuperusuario());
    }

    @Test
    void jwtAuthFilter_permiteRutasPublicasYRechazaSinToken() throws Exception {
        JwtUtil jwtUtil = mock(JwtUtil.class);
        JwtAuthFilter filter = new JwtAuthFilter();
        ReflectionTestUtils.setField(filter, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(filter, "mapper", new ObjectMapper());

        MockHttpServletRequest publicRequest = new MockHttpServletRequest("GET", "/api/v1/publicaciones");
        MockHttpServletResponse publicResponse = new MockHttpServletResponse();
        FilterChain publicChain = mock(FilterChain.class);

        filter.doFilter(publicRequest, publicResponse, publicChain);
        verify(publicChain).doFilter(publicRequest, publicResponse);

        MockHttpServletRequest protectedRequest = new MockHttpServletRequest("GET", "/api/v1/soporte/tickets");
        MockHttpServletResponse protectedResponse = new MockHttpServletResponse();
        FilterChain protectedChain = mock(FilterChain.class);

        when(jwtUtil.obtenerIdentidad("abc")).thenThrow(new IllegalArgumentException("bad token"));
        protectedRequest.addHeader("Authorization", "Bearer abc");

        filter.doFilter(protectedRequest, protectedResponse, protectedChain);
        assertEquals(401, protectedResponse.getStatus());
        assertTrue(protectedResponse.getContentAsString().contains("Tu sesión no es válida"));
        verify(protectedChain, never()).doFilter(protectedRequest, protectedResponse);
    }

    @Test
    void identidadYHandler_devuelvenErroresEsperados() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        assertThrows(NoAutorizadoException.class, () -> Identidad.de(request));

        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        assertEquals("mensaje de prueba",
                handler.argumento(new IllegalArgumentException("mensaje de prueba")).get("mensaje"));
        assertEquals("sin acceso", handler.noAutorizado(new NoAutorizadoException("sin acceso")).get("mensaje"));
        assertEquals("La solicitud no es válida: revisa los parámetros enviados",
                handler.peticionInvalida(new IllegalArgumentException("x")).get("mensaje"));
        assertEquals("Ocurrió un error inesperado en el servidor",
                handler.generico(new RuntimeException("boom")).get("mensaje"));
    }
}
