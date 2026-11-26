package com.marketroad.soporte.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketroad.soporte.repository.PersonalSoporteRepository;

/**
 * Una cuenta deshabilitada SÍ puede usar el soporte (es su único canal para escribir un ticket);
 * una cuenta eliminada ya no existe y no puede crear ni leer tickets.
 */
class CuentaDeshabilitadaSoporteTest {

    private SoporteAuthFilter filtro(VerificadorCuenta.Estado estado) {
        JwtUsuarioUtil jwtUsuario = mock(JwtUsuarioUtil.class);
        when(jwtUsuario.obtenerIdentidad("tok")).thenReturn(new IdentidadUsuario(5L, "ana", "ana@correo.cl", "USUARIO"));
        VerificadorCuenta verificador = new VerificadorCuenta() {
            @Override
            protected Estado preguntar(Long usuarioId, String token) { return estado; }
        };
        SoporteAuthFilter f = new SoporteAuthFilter();
        ReflectionTestUtils.setField(f, "jwtUsuario", jwtUsuario);
        ReflectionTestUtils.setField(f, "jwtPersonal", mock(JwtPersonalUtil.class));
        ReflectionTestUtils.setField(f, "personalRepository", mock(PersonalSoporteRepository.class));
        ReflectionTestUtils.setField(f, "mapper", new ObjectMapper());
        ReflectionTestUtils.setField(f, "verificador", verificador);
        return f;
    }

    private MockHttpServletResponse crearTicket(SoporteAuthFilter f, MockFilterChain cadena) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/soporte/tickets");
        req.addHeader("Authorization", "Bearer tok");
        MockHttpServletResponse resp = new MockHttpServletResponse();
        f.doFilter(req, resp, cadena);
        return resp;
    }

    @Test
    void unaCuentaDeshabilitadaPuedeEscribirUnTicket() throws Exception {
        MockFilterChain cadena = new MockFilterChain();
        assertEquals(200, crearTicket(filtro(VerificadorCuenta.Estado.DESHABILITADA), cadena).getStatus());
        assertNotNull(cadena.getRequest());
    }

    @Test
    void unaCuentaHabilitadaTambienPuede() throws Exception {
        MockFilterChain cadena = new MockFilterChain();
        assertEquals(200, crearTicket(filtro(VerificadorCuenta.Estado.ACTIVA), cadena).getStatus());
        assertNotNull(cadena.getRequest());
    }

    @Test
    void unaCuentaEliminadaNoExisteYNoPuedeEnviarTickets() throws Exception {
        MockFilterChain cadena = new MockFilterChain();
        MockHttpServletResponse r = crearTicket(filtro(VerificadorCuenta.Estado.ELIMINADA), cadena);
        assertEquals(401, r.getStatus());
        assertTrue(r.getContentAsString().contains("ya no existe"));
        assertNull(cadena.getRequest());
    }
}
