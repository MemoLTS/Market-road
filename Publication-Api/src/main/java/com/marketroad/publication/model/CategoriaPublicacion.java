package com.marketroad.publication.model;

import java.text.Normalizer;
import java.util.Locale;

public enum CategoriaPublicacion {
    ELECTRONICA("Electrónica"),
    HOGAR("Hogar y jardín"),
    MODA("Moda y accesorios"),
    DEPORTES("Deportes y ocio"),
    VEHICULOS("Vehículos y repuestos"),
    JUGUETES("Juguetes y bebés"),
    LIBROS("Libros y música"),
    HERRAMIENTAS("Herramientas"),
    MASCOTAS("Mascotas"),
    OTROS("Otros");

    private final String nombre;

    CategoriaPublicacion(String nombre) {
        this.nombre = nombre;
    }

    public String getNombre() {
        return nombre;
    }

    /**
     * Interpreta un código enviado por el cliente (sin distinguir mayúsculas ni
     * tildes).
     */
    public static CategoriaPublicacion desdeCodigo(String codigo) {
        if (codigo == null || codigo.isBlank()) {
            throw new IllegalArgumentException("La categoría es obligatoria");
        }
        String limpio = Normalizer.normalize(codigo.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT);
        for (CategoriaPublicacion c : values()) {
            if (c.name().equals(limpio)) {
                return c;
            }
        }
        throw new IllegalArgumentException("Categoría inválida: " + codigo.trim());
    }
}
