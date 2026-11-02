package com.marketroad.publication.catalogo;

import java.util.Locale;

public enum OrdenCatalogo {
    /** Con texto de búsqueda: mejor coincidencia primero. Sin texto: más recientes primero. */
    RELEVANCIA,
    PRECIO_ASC,
    PRECIO_DESC,
    /** Requiere la ubicación del usuario. Las publicaciones sin coordenadas quedan al final. */
    DISTANCIA,
    RECIENTES;

    public static OrdenCatalogo desdeTexto(String texto) {
        if (texto == null || texto.isBlank()) {
            return RELEVANCIA;
        }
        String limpio = texto.trim().toUpperCase(Locale.ROOT).replace('-', '_');
        if (limpio.equals("PRECIO")) {
            return PRECIO_ASC;
        }
        for (OrdenCatalogo o : values()) {
            if (o.name().equals(limpio)) {
                return o;
            }
        }
        throw new IllegalArgumentException("Orden inválido: " + texto.trim());
    }
}
