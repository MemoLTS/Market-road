package api.com.v1.dto;

public record UsuarioResponseDTO(
        Long id,
        String nombre,
        String apellido,
        String apodo,
        String correo
) {
}
