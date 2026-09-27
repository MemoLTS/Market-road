package api.com.v1.model;

import jakarta.persistence.*;
import lombok.*;
import jakarta.validation.constraints.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "Usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre del usuario no puede estar vacío")
    @Size(min = 3, max = 32, message = "El nombre debe tener entre 3 y 32 caracteres")
    @Column(nullable = false)
    private String nombre;

    @NotBlank(message = "El apellido del usuario no puede estar vacío")
    @Size(min = 3, max = 32, message = "El apellido debe tener entre 3 y 32 caracteres")
    @Column(nullable = false)
    private String apellido;

    @NotBlank(message = "El apodo del usuario no puede estar vacío")
    @Size(min = 3, max = 20, message = "El apodo debe tener entre 3 y 20 caracteres")
    @Column(nullable = false)
    private String apodo;

    @NotBlank(message = "El correo del usuario no puede estar vacío")
    @Email(message = "El correo debe ser válido")
    @Column(nullable = false, unique = true)
    private String correo;

    @NotBlank(message = "La contraseña del usuario no puede estar vacía")
    @Column(nullable = false, length = 60)
    private String contrasena;

}
