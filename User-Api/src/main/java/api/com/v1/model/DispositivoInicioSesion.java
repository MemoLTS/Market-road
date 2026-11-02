package api.com.v1.model;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "dispositivos_inicio_sesion", indexes = {
        @Index(name = "idx_dispositivos_usuario_fecha", columnList = "usuario_id, fecha_inicio")
})
@Getter
@Setter
@NoArgsConstructor
public class DispositivoInicioSesion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "dispositivo_id", nullable = false, length = 36)
    private String dispositivoId;

    @Column(nullable = false, length = 120)
    private String dispositivo;

    @Column(name = "fecha_inicio", nullable = false)
    private Instant fechaInicio;
}
