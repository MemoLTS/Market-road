package com.marketroad.soporte.validacion;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class TextosTest {
    private final Textos textos = new Textos();

    @Test
    void recortaYRechazaCaracteresDeControl() {
        assertEquals("hola", textos.limpiar("  hola ", false, "El texto"));
        assertEquals("", textos.limpiar(null, false, "El texto"));
        assertThrows(IllegalArgumentException.class, () -> textos.limpiar("a\u0000b", true, "El texto"));
        assertThrows(IllegalArgumentException.class, () -> textos.limpiar("a\nb", false, "El texto"));
        assertEquals("a\nb", textos.limpiar("a\nb", true, "El texto"));
    }

    @Test
    void rechazaCaracteresDeDireccionInvisibles() {
        assertThrows(IllegalArgumentException.class, () -> textos.limpiar("ok\u202Eso", true, "El texto"));
        assertThrows(IllegalArgumentException.class, () -> textos.limpiar("ok\u200Bso", true, "El texto"));
    }
}
