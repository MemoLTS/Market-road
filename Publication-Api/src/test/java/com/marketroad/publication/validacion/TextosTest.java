package com.marketroad.publication.validacion;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class TextosTest {
    @Test
    void recortaYAceptaTextoNormal() {
        assertEquals("Bicicleta ñandú", Textos.limpiar("  Bicicleta ñandú ", false, "El título"));
    }

    @Test
    void rechazaControlYSaltosCuandoNoSePermiten() {
        assertThrows(IllegalArgumentException.class, () -> Textos.limpiar("a\nb", false, "El título"));
        assertThrows(IllegalArgumentException.class, () -> Textos.limpiar("a\u0007b", true, "La descripción"));
        assertThrows(IllegalArgumentException.class, () -> Textos.limpiar("a\u200Bb", true, "La descripción"));
    }

    @Test
    void aceptaSaltosCuandoSePermiten() {
        assertEquals("a\nb", Textos.limpiar("a\nb", true, "La descripción"));
    }
}
