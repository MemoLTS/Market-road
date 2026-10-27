package com.marketroad.soporte.reglas;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;

import com.marketroad.soporte.exception.DemasiadasSolicitudesException;

class LimitadorAccionesTest {
    private static Clock reloj(AtomicLong ms) {
        return new Clock() {
            @Override public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
            @Override public Clock withZone(java.time.ZoneId z) { return this; }
            @Override public Instant instant() { return Instant.ofEpochMilli(ms.get()); }
        };
    }

    @Test
    void bloqueaAlSuperarElMaximoYSeLiberaConElTiempo() {
        AtomicLong ahora = new AtomicLong(1_000);
        LimitadorAcciones limitador = new LimitadorAcciones(3, 60_000, "mucho", reloj(ahora));
        for (int i = 0; i < 3; i++) limitador.registrar("u:1");
        assertThrows(DemasiadasSolicitudesException.class, () -> limitador.registrar("u:1"));
        assertDoesNotThrow(() -> limitador.registrar("u:2")); // otra clave no se ve afectada
        ahora.addAndGet(60_001);
        assertDoesNotThrow(() -> limitador.registrar("u:1"));
    }

    @Test
    void verificarNoConsumeCupoPeroAnotarSi() {
        AtomicLong ahora = new AtomicLong(1_000);
        LimitadorAcciones limitador = new LimitadorAcciones(2, 60_000, "mucho", reloj(ahora));
        for (int i = 0; i < 10; i++) limitador.verificar("a@b.cl"); // revisar no cuenta como intento
        limitador.anotar("a@b.cl");
        assertDoesNotThrow(() -> limitador.verificar("a@b.cl"));
        limitador.anotar("a@b.cl");
        assertThrows(DemasiadasSolicitudesException.class, () -> limitador.verificar("a@b.cl"));
    }

    @Test
    void reiniciarLevantaElBloqueo() {
        AtomicLong ahora = new AtomicLong(1_000);
        LimitadorAcciones limitador = new LimitadorAcciones(1, 60_000, "mucho", reloj(ahora));
        limitador.anotar("x");
        assertThrows(DemasiadasSolicitudesException.class, () -> limitador.verificar("x"));
        limitador.reiniciar("x");
        assertDoesNotThrow(() -> limitador.verificar("x"));
    }

    @Test
    void elMensajeDeErrorEsElConfigurado() {
        LimitadorAcciones limitador = new LimitadorAcciones(1, 60_000, "Espera un momento");
        limitador.registrar("k");
        DemasiadasSolicitudesException ex = assertThrows(DemasiadasSolicitudesException.class, () -> limitador.registrar("k"));
        assertEquals("Espera un momento", ex.getMessage());
    }
}
