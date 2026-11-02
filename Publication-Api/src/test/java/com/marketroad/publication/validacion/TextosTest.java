package com.marketroad.publication.validacion;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class TextosTest {
    private final Textos textos = new Textos();

    @Test
    void recortaYAceptaTextoNormal() {
        assertEquals("Bicicleta ñandú", textos.limpiar("  Bicicleta ñandú ", false, "El título"));
    }

    @Test
    void rechazaControlYSaltosCuandoNoSePermiten() {
        assertThrows(IllegalArgumentException.class, () -> textos.limpiar("a\nb", false, "El título"));
        assertThrows(IllegalArgumentException.class, () -> textos.limpiar("a\u0007b", true, "La descripción"));
        assertThrows(IllegalArgumentException.class, () -> textos.limpiar("a\u200Bb", true, "La descripción"));
    }

    @Test
    void aceptaSaltosCuandoSePermiten() {
        assertEquals("a\nb", textos.limpiar("a\nb", true, "La descripción"));
    }
}
