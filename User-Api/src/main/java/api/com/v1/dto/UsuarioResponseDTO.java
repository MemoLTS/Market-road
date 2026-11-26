package api.com.v1.dto;

public record UsuarioResponseDTO(
        Long id,
        String nombre,
        String apellido,
        String apodo,
        String correo,
        String ciudad,
        String rol,
        boolean activo
) {
    /** Cuenta habilitada (el caso normal). */
    public UsuarioResponseDTO(Long id, String nombre, String apellido, String apodo, String correo,
            String ciudad, String rol) {
        this(id, nombre, apellido, apodo, correo, ciudad, rol, true);
    }
}
