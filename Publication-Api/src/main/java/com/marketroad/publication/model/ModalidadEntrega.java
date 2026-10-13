package com.marketroad.publication.model;

public enum ModalidadEntrega {
    ENTREGA_PERSONAL("Entrega en persona"),
    ENVIO("Envío"),
    ENCUENTRO_PUBLICO("Encuentro en lugar público");

    private final String nombre;

    ModalidadEntrega(String nombre) {
        this.nombre = nombre;
    }

    public String getNombre() {
        return nombre;
    }

    public static ModalidadEntrega desdeCodigo(String codigo) {
        if (codigo == null || codigo.isBlank()) {
            throw new IllegalArgumentException("Selecciona al menos una modalidad de entrega");
        }
        try {
            return valueOf(codigo.trim());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("La modalidad de entrega no es válida: " + codigo.trim());
        }
    }
}
