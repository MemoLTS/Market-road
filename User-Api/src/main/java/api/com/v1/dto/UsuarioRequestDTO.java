package api.com.v1.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UsuarioRequestDTO(

        @NotBlank(message = "El nombre del usuario no puede estar vacío")
        @Size(min = 3, max = 32, message = "El nombre debe tener entre 3 y 32 caracteres")
        String nombre,

        @NotBlank(message = "El apellido del usuario no puede estar vacío")
        @Size(min = 3, max = 32, message = "El apellido debe tener entre 3 y 32 caracteres")
        String apellido,

        @NotBlank(message = "El apodo del usuario no puede estar vacío")
        @Size(min = 3, max = 20, message = "El apodo debe tener entre 3 y 20 caracteres")
        String apodo,

        @NotBlank(message = "El correo del usuario no puede estar vacío")
        @Email(message = "El correo debe ser válido")
        String correo,

        @NotBlank(message = "La contraseña del usuario no puede estar vacía")
        @Size(min = 8, max = 32, message = "La contraseña debe tener entre 8 y 32 caracteres")
        String contrasena
) {
}
