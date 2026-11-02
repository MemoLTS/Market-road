package api.com.v1.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.*;

@Data
@NoArgsConstructor
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

    @Size(max = 20, message = "El apodo puede tener como máximo 20 caracteres")
    @Column(unique = true)
    private String apodo;

    @NotBlank(message = "El correo del usuario no puede estar vacío")
    @Email(message = "El correo debe ser válido")
    @Column(nullable = false, unique = true)
    private String correo;

    @Size(max = 120, message = "La ciudad puede tener como máximo 120 caracteres")
    @Column(length = 120)
    private String ciudad;

    @NotBlank(message = "La contraseña del usuario no puede estar vacía")
    @Column(nullable = false, length = 60)
    private String contrasena;

    /**
     * Rol de la cuenta. El default en la columna permite agregarla a una tabla que ya tiene filas;
     * nunca se asigna desde los DTO de registro/edición, así nadie puede auto-promoverse.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, columnDefinition = "varchar(20) not null default 'USUARIO'")
    private Rol rol = Rol.USUARIO;

    public Usuario(Long id, String nombre, String apellido, String apodo, String correo, String contrasena) {
        this.id = id;
        this.nombre = nombre;
        this.apellido = apellido;
        this.apodo = apodo;
        this.correo = correo;
        this.contrasena = contrasena;
    }
}
