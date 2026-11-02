package com.marketroad.publication.mensajeria;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;

import com.marketroad.publication.exception.DemasiadasSolicitudesException;

class LimitadorMensajesTest {
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
        final int maximo = 20;
        final long ventanaMs = 60_000;
        LimitadorMensajes limitador = new LimitadorMensajes(reloj(ahora), maximo, ventanaMs);
        for (int i = 0; i < maximo; i++) limitador.registrar(1L);
        assertThrows(DemasiadasSolicitudesException.class, () -> limitador.registrar(1L));
        assertDoesNotThrow(() -> limitador.registrar(2L)); // otro usuario no se ve afectado
        ahora.addAndGet(ventanaMs + 1);
        assertDoesNotThrow(() -> limitador.registrar(1L));
    }
}
