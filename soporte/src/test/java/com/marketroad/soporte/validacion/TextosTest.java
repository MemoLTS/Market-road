package com.marketroad.soporte.validacion;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class TextosTest {
    @Test
    void recortaYRechazaCaracteresDeControl() {
        assertEquals("hola", Textos.limpiar("  hola ", false, "El texto"));
        assertEquals("", Textos.limpiar(null, false, "El texto"));
        assertThrows(IllegalArgumentException.class, () -> Textos.limpiar("a\u0000b", true, "El texto"));
        assertThrows(IllegalArgumentException.class, () -> Textos.limpiar("a\nb", false, "El texto"));
        assertEquals("a\nb", Textos.limpiar("a\nb", true, "El texto"));
    }

    @Test
    void rechazaCaracteresDeDireccionInvisibles() {
        assertThrows(IllegalArgumentException.class, () -> Textos.limpiar("ok\u202Eso", true, "El texto"));
        assertThrows(IllegalArgumentException.class, () -> Textos.limpiar("ok\u200Bso", true, "El texto"));
    }
}
