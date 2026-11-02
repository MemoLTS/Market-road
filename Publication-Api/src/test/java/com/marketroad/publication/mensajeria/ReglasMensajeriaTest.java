package com.marketroad.publication.mensajeria;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.marketroad.publication.validacion.Textos;

class ReglasMensajeriaTest {
    private final ReglasMensajeria reglas = nuevas();

    /** Arma la regla igual que Spring: con sus colaboradores y su configuración inyectados. */
    private static ReglasMensajeria nuevas() {
        ReglasMensajeria reglas = new ReglasMensajeria();
        ReflectionTestUtils.setField(reglas, "textos", new Textos());
        ReflectionTestUtils.setField(reglas, "montoMaximo", new BigDecimal("9999999999.99"));
        return reglas;
    }

    @Test
    void normalizaYRechazaMensajes() {
        assertEquals("hola", reglas.normalizarContenido("  hola  "));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarContenido("   "));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarContenido(null));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarContenido("a".repeat(1001)));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarContenido("hola\u0000mundo"));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarContenido("texto \u202E invertido"));
    }

    @Test
    void permiteSaltosDeLinea() {
        assertEquals("uno\ndos", reglas.normalizarContenido("uno\r\ndos"));
        assertEquals("a\n\n\nb", reglas.normalizarContenido("a\n\n\n\n\n\nb"));
    }

    @Test
    void validaMontos() {
        assertEquals(new BigDecimal("100.00"), reglas.validarMonto(new BigDecimal("100")));
        assertThrows(IllegalArgumentException.class, () -> reglas.validarMonto(BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class, () -> reglas.validarMonto(new BigDecimal("-5")));
        assertThrows(IllegalArgumentException.class, () -> reglas.validarMonto(new BigDecimal("10.999")));
        assertThrows(IllegalArgumentException.class, () -> reglas.validarMonto(new BigDecimal("99999999999")));
        assertThrows(IllegalArgumentException.class, () -> reglas.validarMonto(null));
    }

    @Test
    void determinaRol() {
        assertEquals(ReglasMensajeria.Rol.COMPRADOR, reglas.rolDe(1L, 1L, 2L));
        assertEquals(ReglasMensajeria.Rol.VENDEDOR, reglas.rolDe(2L, 1L, 2L));
        assertNull(reglas.rolDe(3L, 1L, 2L));
        assertNull(reglas.rolDe(null, 1L, 2L));
    }
}
