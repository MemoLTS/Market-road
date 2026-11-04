package com.marketroad.publication.model;

/** Motivo por el que una persona escribe a soporte. */
public enum CategoriaSoporte {
    CUENTA("Mi cuenta"),
    PUBLICACIONES("Publicaciones"),
    MENSAJES("Mensajes y ofertas"),
    DENUNCIA("Denunciar un problema o a un usuario"),
    SUGERENCIA("Sugerencia"),
    OTRO("Otro");

    private final String nombre;

    CategoriaSoporte(String nombre) { this.nombre = nombre; }

    public String getNombre() { return nombre; }
}
