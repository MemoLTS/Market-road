package api.com.v1.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/**
 * Todos los campos son opcionales: solo se actualizan los que llegan con valor.
 * Si un campo viene presente, igual se valida su formato.
 */
public record UsuarioUpdateDTO(

        @Size(min = 3, max = 32, message = "El nombre debe tener entre 3 y 32 caracteres")
        String nombre,

        @Size(min = 3, max = 32, message = "El apellido debe tener entre 3 y 32 caracteres")
        String apellido,

        @Size(min = 3, max = 20, message = "El apodo debe tener entre 3 y 20 caracteres")
        String apodo,

        @Email(message = "El correo debe ser válido")
        String correo,

        @Size(min = 8, max = 32, message = "La contraseña debe tener entre 8 y 32 caracteres")
        String contrasena
) {
}
