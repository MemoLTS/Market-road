package com.marketroad.soporte.security;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

class JwtUtilTest {
    @Test
    void jwtUsuarioUtilGeneraYExtraeLaIdentidad() {
        JwtUsuarioUtil util = new JwtUsuarioUtil();
        ReflectionTestUtils.setField(util, "secret", "12345678901234567890123456789012");
        util.inicializar();

        String token = Jwts.builder()
                .subject("42")
                .claim("apodo", "Ana")
                .claim("correo", "ana@marketroad.cl")
                .claim("rol", "CLIENTE")
                .signWith(Keys.hmacShaKeyFor("12345678901234567890123456789012".getBytes()))
                .compact();

        IdentidadUsuario identidad = util.obtenerIdentidad(token);

        assertEquals(42L, identidad.usuarioId());
        assertEquals("Ana", identidad.apodo());
        assertEquals("CLIENTE", identidad.rol());
    }

    @Test
    void jwtPersonalUtilGeneraYValidaToken() {
        JwtPersonalUtil util = new JwtPersonalUtil();
        ReflectionTestUtils.setField(util, "secret", "12345678901234567890123456789012");
        ReflectionTestUtils.setField(util, "expiracionMs", 60000L);
        util.inicializar();

        String token = util.generarToken(15L);
        assertEquals(15L, util.obtenerPersonalId(token));
        assertEquals(60000L, util.getExpiracionMs());
    }

    @Test
    void jwtUtilFallaConSecretCorta() {
        JwtUsuarioUtil util = new JwtUsuarioUtil();
        ReflectionTestUtils.setField(util, "secret", "short");

        assertThrows(IllegalArgumentException.class, util::inicializar);
    }
}
