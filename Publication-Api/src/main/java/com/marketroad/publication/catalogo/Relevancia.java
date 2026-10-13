package com.marketroad.publication.catalogo;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Puntaje de coincidencia entre un texto de búsqueda y una publicación. */
final class Relevancia {
    private Relevancia() {}

    /** Minúsculas, sin tildes ni signos; palabras separadas por un espacio. */
    static String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        String sinTildes = Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return sinTildes.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }

    static List<String> terminos(String texto) {
        String limpio = normalizar(texto);
        List<String> terminos = new ArrayList<>();
        if (!limpio.isEmpty()) {
            for (String t : limpio.split(" ")) {
                terminos.add(t);
            }
        }
        return terminos;
    }

    /**
     * @return -1 si algún término no aparece en título, descripción o categoría (la publicación no coincide);
     *         en otro caso un puntaje positivo: más alto = mejor coincidencia.
     */
    static int puntaje(List<String> terminos, Candidato c) {
        String titulo = normalizar(c.titulo());
        String descripcion = normalizar(c.descripcion());
        String categoria = normalizar(c.categoria().getNombre());
        List<String> palabrasTitulo = List.of(titulo.split(" "));

        int total = 0;
        for (String t : terminos) {
            int pts = 0;
            if (palabrasTitulo.contains(t)) {
                pts += 10;
            } else if (palabrasTitulo.stream().anyMatch(p -> p.startsWith(t))) {
                pts += 6;
            } else if (titulo.contains(t)) {
                pts += 4;
            }
            if (descripcion.contains(t)) {
                pts += 2;
            }
            if (categoria.contains(t)) {
                pts += 2;
            }
            if (pts == 0) {
                return -1;
            }
            total += pts;
        }

        String frase = String.join(" ", terminos);
        if (titulo.startsWith(frase)) {
            total += 5;
        } else if (titulo.contains(frase)) {
            total += 3;
        }
        return total;
    }
}
