package api.com.v1.dto;

import jakarta.validation.constraints.Email;
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

        @Size(min = 3, max = 20, message = "El apodo debe tener entre 3 y 20 caracteres")
        @Pattern(regexp = "^[A-Za-z0-9][A-Za-z0-9_.-]*$", message = "El apodo solo puede contener letras, números, guion, guion bajo y punto, sin espacios")
        String apodo,

        @Email(message = "El correo debe ser válido")
        @Size(max = 100, message = "El correo puede tener como máximo 100 caracteres")
        String correo,

        @Size(min = 8, max = 32, message = "La contraseña debe tener entre 8 y 32 caracteres")
        @Pattern(regexp = "^(?=.*\\p{L})(?=.*\\d)\\S+$", message = "La contraseña debe incluir al menos una letra y un número, y no tener espacios")
        String contrasena
) {
}
