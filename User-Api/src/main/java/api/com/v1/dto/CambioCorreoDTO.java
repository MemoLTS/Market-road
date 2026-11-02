package api.com.v1.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CambioCorreoDTO(

        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "El correo debe ser válido")
        @Size(max = 100, message = "El correo puede tener como máximo 100 caracteres")
        String correo,

        @NotBlank(message = "La contraseña actual es obligatoria")
        @Size(max = 72, message = "La contraseña actual no es válida")
        String contrasenaActual
) {
}
