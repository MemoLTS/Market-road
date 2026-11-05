package com.marketroad.publication.mensajeria;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.marketroad.publication.exception.DemasiadasSolicitudesException;
import com.marketroad.publication.validacion.Textos;

class PublicationMensajeriaTest {

    @Test
    void reglasMensajeria_normalizaMensajesYFormateaMontos() {
        ReglasMensajeria reglas = new ReglasMensajeria();
        ReflectionTestUtils.setField(reglas, "textos", new Textos());
        ReflectionTestUtils.setField(reglas, "montoMaximo", new BigDecimal("9999999999.99"));

        assertEquals("Hola mundo", reglas.normalizarContenido("   Hola mundo\t "));
        assertEquals("$450.000", reglas.formatearMonto(new BigDecimal("450000")));
        assertEquals("Usuario #12", reglas.apodoODefecto(null, 12L));
        assertEquals("Aparece desde el título", reglas.vistaPrevia("Aparece desde el título"));
        assertEquals(ReglasMensajeria.Rol.COMPRADOR, reglas.rolDe(10L, 10L, 20L));
        assertEquals(ReglasMensajeria.Rol.VENDEDOR, reglas.rolDe(20L, 10L, 20L));
        assertEquals(null, reglas.rolDe(99L, 10L, 20L));

        assertThrows(IllegalArgumentException.class, () -> reglas.validarMonto(null));
        assertThrows(IllegalArgumentException.class, () -> reglas.validarMonto(new BigDecimal("0.00")));
    }

    @Test
    void limitadorMensajes_rechazaSolicitudesRapidas() {
        Clock reloj = Clock.fixed(Instant.parse("2024-01-01T10:00:00Z"), ZoneOffset.UTC);
        LimitadorMensajes limitador = new LimitadorMensajes(reloj, 2, 60_000L);

        limitador.registrar(7L);
        limitador.registrar(7L);
        assertThrows(DemasiadasSolicitudesException.class, () -> limitador.registrar(7L));

        LimitadorMensajes otro = new LimitadorMensajes();
        assertTrue(otro != null);
    }
}
