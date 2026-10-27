package com.marketroad.soporte.model;

/** Rol dentro del equipo de soporte. ADMIN tiene todos los accesos de SOPORTE y además gestiona el equipo y los datos. */
public enum RolPersonal {
    SOPORTE("Soporte"),
    ADMIN("Administrador");

    private final String nombre;

    RolPersonal(String nombre) { this.nombre = nombre; }

    public String getNombre() { return nombre; }

    public static RolPersonal desdeCodigo(String codigo) {
        try {
            return RolPersonal.valueOf(codigo == null ? "" : codigo.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("El rol indicado no es válido");
        }
    }
}
