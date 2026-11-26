package com.marketroad.publication.security;

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

/** El JWT sigue valiendo hasta expirar: el filtro consulta a User-Api si la cuenta existe y está habilitada. */
class CuentaDeshabilitadaFilterTest {

    /** Verificador que responde un estado fijo y cuenta las consultas (no hace red). */
    static class VerificadorFijo extends VerificadorCuenta {
        final Estado estado;
        int consultas;

        VerificadorFijo(Estado estado) { this.estado = estado; }

        @Override
        protected Estado preguntar(Long usuarioId, String token) { consultas++; return estado; }
    }

    private JwtAuthFilter filtro(VerificadorCuenta verificador, Identidad identidad) {
        JwtUtil jwt = mock(JwtUtil.class);
        when(jwt.obtenerIdentidad("tok")).thenReturn(identidad);
        JwtAuthFilter f = new JwtAuthFilter();
        ReflectionTestUtils.setField(f, "jwtUtil", jwt);
        ReflectionTestUtils.setField(f, "mapper", new ObjectMapper());
        ReflectionTestUtils.setField(f, "verificador", verificador);
        return f;
    }

    private MockHttpServletResponse llamar(JwtAuthFilter f, MockFilterChain cadena) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/conversaciones");
        req.addHeader("Authorization", "Bearer tok");
        MockHttpServletResponse resp = new MockHttpServletResponse();
        f.doFilter(req, resp, cadena);
        return resp;
    }

    @Test
    void unaCuentaEliminadaRecibe401() throws Exception {
        MockFilterChain cadena = new MockFilterChain();
        MockHttpServletResponse r = llamar(filtro(new VerificadorFijo(VerificadorCuenta.Estado.ELIMINADA), new Identidad(5L, "ana", "USUARIO")), cadena);
        assertEquals(401, r.getStatus());
        assertTrue(r.getContentAsString().contains("ya no existe"));
        assertNull(cadena.getRequest());
    }

    @Test
    void unaCuentaDeshabilitadaRecibe403ConElMotivo() throws Exception {
        MockFilterChain cadena = new MockFilterChain();
        MockHttpServletResponse r = llamar(filtro(new VerificadorFijo(VerificadorCuenta.Estado.DESHABILITADA), new Identidad(5L, "ana", "USUARIO")), cadena);
        assertEquals(403, r.getStatus());
        assertTrue(r.getContentAsString().contains("deshabilitada"));
        assertNull(cadena.getRequest());
    }

    @Test
    void unaCuentaHabilitadaPasa() throws Exception {
        MockFilterChain cadena = new MockFilterChain();
        MockHttpServletResponse r = llamar(filtro(new VerificadorFijo(VerificadorCuenta.Estado.ACTIVA), new Identidad(5L, "ana", "USUARIO")), cadena);
        assertEquals(200, r.getStatus());
        assertNotNull(cadena.getRequest());
    }

    @Test
    void elSuperusuarioNoSeConsulta() throws Exception {
        VerificadorFijo v = new VerificadorFijo(VerificadorCuenta.Estado.ELIMINADA);
        MockFilterChain cadena = new MockFilterChain();
        assertEquals(200, llamar(filtro(v, new Identidad(1L, "admin", "SUPERUSUARIO")), cadena).getStatus());
        assertEquals(0, v.consultas);
    }

    @Test
    void elVerificadorGuardaElResultadoUnosSegundos() {
        VerificadorFijo v = new VerificadorFijo(VerificadorCuenta.Estado.DESHABILITADA);
        ReflectionTestUtils.setField(v, "cacheMs", 60_000L);
        assertEquals(VerificadorCuenta.Estado.DESHABILITADA, v.consultar(5L, "tok"));
        assertEquals(VerificadorCuenta.Estado.DESHABILITADA, v.consultar(5L, "tok"));
        assertEquals(1, v.consultas);
    }

    @Test
    void siUserApiNoRespondeNoSeCortaElServicio() {
        VerificadorCuenta v = new VerificadorCuenta() {
            @Override
            protected Estado preguntar(Long usuarioId, String token) { return null; }
        };
        ReflectionTestUtils.setField(v, "cacheMs", 60_000L);
        assertEquals(VerificadorCuenta.Estado.ACTIVA, v.consultar(5L, "tok"));
    }

    @Test
    void sinVerificadorConfiguradoElFiltroSigueComoAntes() throws Exception {
        MockFilterChain cadena = new MockFilterChain();
        assertEquals(200, llamar(filtro(null, new Identidad(5L, "ana", "USUARIO")), cadena).getStatus());
        assertNotNull(cadena.getRequest());
    }
}
