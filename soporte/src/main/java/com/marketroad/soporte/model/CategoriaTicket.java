package com.marketroad.soporte.model;

public enum CategoriaTicket {
    CUENTA("Mi cuenta"),
    PUBLICACIONES("Publicaciones"),
    MENSAJES("Mensajes y ofertas"),
    DENUNCIA("Denuncia o seguridad"),
    TECNICO("Problema técnico"),
    OTRO("Otro");

    private final String nombre;

    CategoriaTicket(String nombre) { this.nombre = nombre; }

    public String getNombre() { return nombre; }

    public static CategoriaTicket desdeCodigo(String codigo) {
        try {
            return CategoriaTicket.valueOf(codigo == null ? "" : codigo.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("La categoría indicada no es válida");
        }
    }
}
