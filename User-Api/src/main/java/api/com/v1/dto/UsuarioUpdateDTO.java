package api.com.v1.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Todos los campos son opcionales: solo se actualizan los que llegan con valor.
 * Si un campo viene presente, igual se valida su formato.
 */
public record UsuarioUpdateDTO(

        @Size(min = 3, max = 32, message = "El nombre debe tener entre 3 y 32 caracteres")
        @Pattern(regexp = "^[\\p{L}][\\p{L} '.-]*$", message = "El nombre solo puede contener letras, espacios, apóstrofes, puntos y guiones")
        String nombre,

        @Size(min = 3, max = 32, message = "El apellido debe tener entre 3 y 32 caracteres")
        @Pattern(regexp = "^[\\p{L}][\\p{L} '.-]*$", message = "El apellido solo puede contener letras, espacios, apóstrofes, puntos y guiones")
        String apellido,

        @Size(max = 20, message = "El apodo puede tener como máximo 20 caracteres")
        @Pattern(regexp = "^(?:[A-Za-z0-9][A-Za-z0-9_.-]*)?$", message = "El apodo solo puede contener letras, números, guion, guion bajo y punto, sin espacios")
        String apodo,

        @Size(max = 120, message = "La ciudad puede tener como máximo 120 caracteres")
        String ciudad,

        @Size(min = 8, max = 32, message = "La contraseña debe tener entre 8 y 32 caracteres")
        @Pattern(regexp = "^(?=.*\\p{L})(?=.*\\d)\\S+$", message = "La contraseña debe incluir al menos una letra y un número, y no tener espacios")
        String contrasena
) {
}
