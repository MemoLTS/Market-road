package com.marketroad.publication.validacion;

import org.springframework.stereotype.Component;

/** Validación y limpieza de textos escritos por personas (título, descripción, mensajes). Bean de Spring: se inyecta con @Autowired. */
@Component
public class Textos {

    /**
     * Recorta el texto y rechaza caracteres de control (salvo salto de línea y tabulación cuando se permiten
     * varias líneas), el carácter nulo y los caracteres de dirección invisibles usados para falsear texto.
     */
    public String limpiar(String texto, boolean permiteSaltos, String campo) {
        String limpio = texto == null ? "" : texto.strip();
        for (int i = 0; i < limpio.length(); i++) {
            char c = limpio.charAt(i);
            boolean salto = c == '\n' || c == '\r' || c == '\t';
            boolean control = Character.isISOControl(c) && !(permiteSaltos && salto);
            boolean invisibleBidi = (c >= '\u202A' && c <= '\u202E') || (c >= '\u2066' && c <= '\u2069') || c == '\u200B';
            if (control || invisibleBidi) {
                throw new IllegalArgumentException(campo + " contiene caracteres no permitidos");
            }
        }
        if (permiteSaltos) {
            limpio = limpio.replace("\r\n", "\n").replace('\r', '\n').replaceAll("\n{4,}", "\n\n\n");
        }
        return limpio;
    }
}
