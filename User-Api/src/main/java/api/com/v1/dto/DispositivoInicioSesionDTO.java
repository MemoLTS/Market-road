package api.com.v1.dto;

import java.time.Instant;
import java.util.List;

public record DispositivoInicioSesionDTO(String dispositivo, List<Instant> sesiones) {
}
