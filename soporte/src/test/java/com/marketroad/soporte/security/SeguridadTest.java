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
}
