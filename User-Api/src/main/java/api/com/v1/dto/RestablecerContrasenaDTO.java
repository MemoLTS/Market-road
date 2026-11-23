package api.com.v1.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Cuerpo de la petición con la que el superusuario fija una contraseña nueva a un usuario. */
public record RestablecerContrasenaDTO(

        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, max = 32, message = "La contraseña debe tener entre 8 y 32 caracteres")
        @Pattern(regexp = "^(?=.*\\p{L})(?=.*\\d)\\S+$",
                message = "La contraseña debe incluir letras y números, sin espacios")
        String contrasena
) {
}
