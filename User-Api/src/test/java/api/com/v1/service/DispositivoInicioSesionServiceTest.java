package api.com.v1.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import api.com.v1.model.DispositivoInicioSesion;
import api.com.v1.repository.DispositivoInicioSesionRepository;

class DispositivoInicioSesionServiceTest {

    @Test
    void identificaNavegadorYSistemaOperativo() {
        assertEquals("Chrome en Windows", DispositivoInicioSesionService.describirDispositivo(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"));
        assertEquals("Safari en iPhone", DispositivoInicioSesionService.describirDispositivo(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1"));
    }

    @Test
    void toleraAgenteDeUsuarioAusente() {
        assertEquals("Navegador desconocido en dispositivo no identificado",
                DispositivoInicioSesionService.describirDispositivo(null));
    }

    @Test
    void muestraComoMaximoCincoDispositivosYTresSesionesPorDispositivo() {
        DispositivoInicioSesionRepository repository = org.mockito.Mockito.mock(DispositivoInicioSesionRepository.class);
        List<DispositivoInicioSesion> historial = new ArrayList<>();
        Instant ahora = Instant.now();
        long id = 1;
        for (int dispositivo = 0; dispositivo < 6; dispositivo++) {
            for (int sesion = 0; sesion < 5; sesion++) {
                historial.add(registro(id++, "device-" + dispositivo, "Equipo " + dispositivo,
                        ahora.minusSeconds(dispositivo * 100L + sesion)));
            }
        }
        historial.sort(Comparator.comparing(DispositivoInicioSesion::getFechaInicio).reversed()
                .thenComparing(DispositivoInicioSesion::getId, Comparator.reverseOrder()));
        when(repository.findAllByUsuarioIdOrderByFechaInicioDescIdDesc(1L)).thenReturn(historial);

        List<api.com.v1.dto.DispositivoInicioSesionDTO> resultado =
                new DispositivoInicioSesionService(repository).obtenerHistorial(1L);

        assertEquals(5, resultado.size());
        assertFalse(resultado.stream().anyMatch(dispositivo -> dispositivo.dispositivo().equals("Equipo 5")));
        resultado.forEach(dispositivo -> assertEquals(3, dispositivo.sesiones().size()));
    }

    @Test
    void eliminaLasSesionesMasAntiguasDelMismoDispositivo() {
        DispositivoInicioSesionRepository repository = org.mockito.Mockito.mock(DispositivoInicioSesionRepository.class);
        List<DispositivoInicioSesion> historial = new ArrayList<>();
        String dispositivoId = "123e4567-e89b-42d3-a456-426614174000";
        Instant ahora = Instant.now();
        historial.add(registro(1L, dispositivoId, "Chrome en Windows", ahora.minusSeconds(30)));
        historial.add(registro(2L, dispositivoId, "Chrome en Windows", ahora.minusSeconds(20)));
        historial.add(registro(3L, dispositivoId, "Chrome en Windows", ahora.minusSeconds(10)));
        when(repository.save(any())).thenAnswer(invocacion -> {
            DispositivoInicioSesion nuevo = invocacion.getArgument(0);
            nuevo.setId(4L);
            historial.add(nuevo);
            return nuevo;
        });
        when(repository.findAllByUsuarioIdOrderByFechaInicioDescIdDesc(1L)).thenAnswer(invocacion -> historial.stream()
                .sorted(Comparator.comparing(DispositivoInicioSesion::getFechaInicio).reversed()
                        .thenComparing(DispositivoInicioSesion::getId, Comparator.reverseOrder()))
                .toList());

        new DispositivoInicioSesionService(repository).registrar(1L, dispositivoId, "Chrome/126 Windows");

        ArgumentCaptor<Iterable> captor = ArgumentCaptor.forClass(Iterable.class);
        verify(repository).deleteAll(captor.capture());
        List<Object> eliminadas = new ArrayList<>();
        captor.getValue().forEach(eliminada -> eliminadas.add(eliminada));
        assertEquals(1, eliminadas.size());
        assertEquals(1L, ((DispositivoInicioSesion) eliminadas.get(0)).getId());
    }

    private DispositivoInicioSesion registro(Long id, String dispositivoId, String etiqueta, Instant fecha) {
        DispositivoInicioSesion registro = new DispositivoInicioSesion();
        registro.setId(id);
        registro.setUsuarioId(1L);
        registro.setDispositivoId(dispositivoId);
        registro.setDispositivo(etiqueta);
        registro.setFechaInicio(fecha);
        return registro;
    }
}
