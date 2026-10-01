package com.marketroad.publication.mensajeria;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

class ReglasMensajeriaTest {
    @Test
    void normalizaYRechazaMensajes() {
        assertEquals("hola", ReglasMensajeria.normalizarContenido("  hola  "));
        assertThrows(IllegalArgumentException.class, () -> ReglasMensajeria.normalizarContenido("   "));
        assertThrows(IllegalArgumentException.class, () -> ReglasMensajeria.normalizarContenido(null));
        assertThrows(IllegalArgumentException.class, () -> ReglasMensajeria.normalizarContenido("a".repeat(1001)));
        assertThrows(IllegalArgumentException.class, () -> ReglasMensajeria.normalizarContenido("hola\u0000mundo"));
        assertThrows(IllegalArgumentException.class, () -> ReglasMensajeria.normalizarContenido("texto \u202E invertido"));
    }

    @Test
    void permiteSaltosDeLinea() {
        assertEquals("uno\ndos", ReglasMensajeria.normalizarContenido("uno\r\ndos"));
        assertEquals("a\n\n\nb", ReglasMensajeria.normalizarContenido("a\n\n\n\n\n\nb"));
    }

    @Test
    void validaMontos() {
        assertEquals(new BigDecimal("100.00"), ReglasMensajeria.validarMonto(new BigDecimal("100")));
        assertThrows(IllegalArgumentException.class, () -> ReglasMensajeria.validarMonto(BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class, () -> ReglasMensajeria.validarMonto(new BigDecimal("-5")));
        assertThrows(IllegalArgumentException.class, () -> ReglasMensajeria.validarMonto(new BigDecimal("10.999")));
        assertThrows(IllegalArgumentException.class, () -> ReglasMensajeria.validarMonto(new BigDecimal("99999999999")));
        assertThrows(IllegalArgumentException.class, () -> ReglasMensajeria.validarMonto(null));
    }

    @Test
    void determinaRol() {
        assertEquals(ReglasMensajeria.Rol.COMPRADOR, ReglasMensajeria.rolDe(1L, 1L, 2L));
        assertEquals(ReglasMensajeria.Rol.VENDEDOR, ReglasMensajeria.rolDe(2L, 1L, 2L));
        assertNull(ReglasMensajeria.rolDe(3L, 1L, 2L));
        assertNull(ReglasMensajeria.rolDe(null, 1L, 2L));
    }
}
