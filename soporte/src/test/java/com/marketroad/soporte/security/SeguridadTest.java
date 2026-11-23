package com.marketroad.soporte.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketroad.soporte.exception.NoAutorizadoException;
import com.marketroad.soporte.model.RolPersonal;
import com.marketroad.soporte.repository.PersonalSoporteRepository;

class SeguridadTest {
    @Test
    void identidadUsuarioLeeLaPeticionYExigeSuperusuario() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(IdentidadUsuario.ATRIBUTO,
                new IdentidadUsuario(12L, "Ana", "ana@marketroad.cl", "SUPERUSUARIO"));

        IdentidadUsuario identidad = IdentidadUsuario.de(request);

        assertEquals(12L, identidad.usuarioId());
        assertTrue(identidad.esSuperusuario());
        assertDoesNotThrow(identidad::exigirSuperusuario);
        assertThrows(NoAutorizadoException.class, () -> new IdentidadUsuario(13L, "Luis", "luis@marketroad.cl", "CLIENTE").exigirSuperusuario());
    }

    @Test
    void identidadPersonalExigeAdmin() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(IdentidadPersonal.ATRIBUTO, new IdentidadPersonal(21L, "Patricia", RolPersonal.ADMIN));

        IdentidadPersonal identidad = IdentidadPersonal.de(request);

        assertEquals(21L, identidad.personalId());
        assertTrue(identidad.esAdmin());
        assertDoesNotThrow(identidad::exigirAdmin);
        assertThrows(NoAutorizadoException.class,
                () -> new IdentidadPersonal(22L, "Ana", RolPersonal.SOPORTE).exigirAdmin());
    }

    @Test
    void filterRechazaSolicitudesSinToken() throws Exception {
        SoporteAuthFilter filter = new SoporteAuthFilter();
        ReflectionTestUtils.setField(filter, "jwtUsuario", mock(JwtUsuarioUtil.class));
        ReflectionTestUtils.setField(filter, "jwtPersonal", mock(JwtPersonalUtil.class));
        ReflectionTestUtils.setField(filter, "personalRepository", mock(PersonalSoporteRepository.class));
        ReflectionTestUtils.setField(filter, "mapper", new ObjectMapper());

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/soporte/tickets");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Debes iniciar sesión"));
    }

    @Test
    void laRutaSsoDelPanelSeValidaConElTokenDeUsuarioYNoConElDelPersonal() throws Exception {
        JwtUsuarioUtil jwtUsuario = mock(JwtUsuarioUtil.class);
        JwtPersonalUtil jwtPersonal = mock(JwtPersonalUtil.class);
        IdentidadUsuario identidad = new IdentidadUsuario(23L, "superadmin", "admin@marketroad.local", "SUPERUSUARIO");
        org.mockito.Mockito.when(jwtUsuario.obtenerIdentidad("token-usuario")).thenReturn(identidad);
        SoporteAuthFilter filter = new SoporteAuthFilter();
        ReflectionTestUtils.setField(filter, "jwtUsuario", jwtUsuario);
        ReflectionTestUtils.setField(filter, "jwtPersonal", jwtPersonal);
        ReflectionTestUtils.setField(filter, "personalRepository", mock(PersonalSoporteRepository.class));
        ReflectionTestUtils.setField(filter, "mapper", new ObjectMapper());

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/soporte/panel/auth/sso");
        request.addHeader("Authorization", "Bearer token-usuario");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
        assertEquals(identidad, request.getAttribute(IdentidadUsuario.ATRIBUTO));
        org.mockito.Mockito.verifyNoInteractions(jwtPersonal);
    }

    @Test
    void lasDemasRutasDelPanelSiguenExigiendoElTokenDelPersonal() throws Exception {
        JwtUsuarioUtil jwtUsuario = mock(JwtUsuarioUtil.class);
        JwtPersonalUtil jwtPersonal = mock(JwtPersonalUtil.class);
        org.mockito.Mockito.when(jwtPersonal.obtenerPersonalId("token-usuario"))
                .thenThrow(new IllegalArgumentException("El token no es del personal de soporte"));
        SoporteAuthFilter filter = new SoporteAuthFilter();
        ReflectionTestUtils.setField(filter, "jwtUsuario", jwtUsuario);
        ReflectionTestUtils.setField(filter, "jwtPersonal", jwtPersonal);
        ReflectionTestUtils.setField(filter, "personalRepository", mock(PersonalSoporteRepository.class));
        ReflectionTestUtils.setField(filter, "mapper", new ObjectMapper());

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/soporte/panel/tickets");
        request.addHeader("Authorization", "Bearer token-usuario");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(401, response.getStatus());
        org.mockito.Mockito.verifyNoInteractions(jwtUsuario);
    }
}
