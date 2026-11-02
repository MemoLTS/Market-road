package com.marketroad.soporte.model;

public enum EstadoTicket {
    ABIERTO("Abierto"),
    EN_PROGRESO("En progreso"),
    RESUELTO("Resuelto"),
    CERRADO("Cerrado");

    private final String nombre;

    EstadoTicket(String nombre) { this.nombre = nombre; }

    public String getNombre() { return nombre; }

    public static EstadoTicket desdeCodigo(String codigo) {
        try {
            return EstadoTicket.valueOf(codigo == null ? "" : codigo.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("El estado indicado no es válido");
        }
    }
}
