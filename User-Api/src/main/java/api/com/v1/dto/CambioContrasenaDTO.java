package api.com.v1.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Cambio de la propia contraseña: exige la actual (igual que el cambio de correo). */
public record CambioContrasenaDTO(

        @NotBlank(message = "La contraseña actual es obligatoria")
        @Size(max = 72, message = "La contraseña actual no es válida")
        String contrasenaActual,

        @NotBlank(message = "La contraseña nueva es obligatoria")
        @Size(min = 8, max = 32, message = "La contraseña debe tener entre 8 y 32 caracteres")
        @Pattern(regexp = "^(?=.*\\p{L})(?=.*\\d)\\S+$",
                message = "La contraseña debe incluir letras y números, sin espacios")
        String contrasenaNueva
) {
}
