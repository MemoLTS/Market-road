package api.com.v1.dto;

public record LoginResponseDTO(
        String token,
        long expiraEnMs,
        UsuarioResponseDTO usuario
) {
}
