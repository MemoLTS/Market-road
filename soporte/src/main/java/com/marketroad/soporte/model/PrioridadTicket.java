package com.marketroad.soporte.model;

public enum PrioridadTicket {
    BAJA("Baja"),
    NORMAL("Normal"),
    ALTA("Alta"),
    URGENTE("Urgente");

    private final String nombre;

    PrioridadTicket(String nombre) { this.nombre = nombre; }

    public String getNombre() { return nombre; }

    public static PrioridadTicket desdeCodigo(String codigo) {
        try {
            return PrioridadTicket.valueOf(codigo == null ? "" : codigo.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("La prioridad indicada no es válida");
        }
    }
}
