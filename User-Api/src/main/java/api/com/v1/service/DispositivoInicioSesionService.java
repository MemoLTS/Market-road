package api.com.v1.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import api.com.v1.dto.DispositivoInicioSesionDTO;
import api.com.v1.model.DispositivoInicioSesion;
import api.com.v1.repository.DispositivoInicioSesionRepository;

@Service
public class DispositivoInicioSesionService {

    @Autowired
    private DispositivoInicioSesionRepository repository;

    /** Cuántos dispositivos y sesiones por dispositivo se recuerdan: se configuran en application.yml (sesiones.*). */
    @Value("${sesiones.maximo-dispositivos:5}")
    private int maximoDispositivos;
    @Value("${sesiones.maximo-por-dispositivo:3}")
    private int maximoSesionesPorDispositivo;

    @Transactional
    public void registrar(Long usuarioId, String dispositivoId, String agenteUsuario) {
        DispositivoInicioSesion registro = new DispositivoInicioSesion();
        registro.setUsuarioId(usuarioId);
        registro.setDispositivoId(dispositivoId == null || dispositivoId.isBlank()
                ? UUID.randomUUID().toString()
                : UUID.fromString(dispositivoId).toString());
        registro.setDispositivo(describirDispositivo(agenteUsuario));
        registro.setFechaInicio(Instant.now());
        repository.save(registro);

        List<DispositivoInicioSesion> historial = repository.findAllByUsuarioIdOrderByFechaInicioDescIdDesc(usuarioId);
        Set<Long> idsConservar = new HashSet<>();
        Map<String, Integer> sesionesPorDispositivo = new LinkedHashMap<>();
        for (DispositivoInicioSesion sesion : historial) {
            String id = sesion.getDispositivoId();
            if (!sesionesPorDispositivo.containsKey(id) && sesionesPorDispositivo.size() == maximoDispositivos) {
                continue;
            }
            int sesionesConservadas = sesionesPorDispositivo.getOrDefault(id, 0);
            if (sesionesConservadas < maximoSesionesPorDispositivo) {
                idsConservar.add(sesion.getId());
                sesionesPorDispositivo.put(id, sesionesConservadas + 1);
            }
        }
        List<DispositivoInicioSesion> obsoletas = historial.stream()
                .filter(sesion -> !idsConservar.contains(sesion.getId()))
                .toList();
        if (!obsoletas.isEmpty()) {
            repository.deleteAll(obsoletas);
        }
    }

    @Transactional(readOnly = true)
    public List<DispositivoInicioSesionDTO> obtenerHistorial(Long usuarioId) {
        Map<String, String> etiquetas = new LinkedHashMap<>();
        Map<String, List<Instant>> sesionesPorDispositivo = new LinkedHashMap<>();
        for (DispositivoInicioSesion sesion : repository.findAllByUsuarioIdOrderByFechaInicioDescIdDesc(usuarioId)) {
            String id = sesion.getDispositivoId();
            if (!sesionesPorDispositivo.containsKey(id) && sesionesPorDispositivo.size() == maximoDispositivos) {
                continue;
            }
            List<Instant> sesiones = sesionesPorDispositivo.computeIfAbsent(id, key -> new ArrayList<>());
            if (sesiones.size() < maximoSesionesPorDispositivo) {
                etiquetas.putIfAbsent(id, sesion.getDispositivo());
                sesiones.add(sesion.getFechaInicio());
            }
        }
        return sesionesPorDispositivo.entrySet().stream()
                .map(entry -> new DispositivoInicioSesionDTO(etiquetas.get(entry.getKey()), entry.getValue()))
                .toList();
    }

    String describirDispositivo(String agenteUsuario) {
        String agente = agenteUsuario == null ? "" : agenteUsuario;
        String navegador;
        if (agente.contains("Edg/")) {
            navegador = "Edge";
        } else if (agente.contains("OPR/")) {
            navegador = "Opera";
        } else if (agente.contains("Firefox/")) {
            navegador = "Firefox";
        } else if (agente.contains("Chrome/")) {
            navegador = "Chrome";
        } else if (agente.contains("Safari/")) {
            navegador = "Safari";
        } else {
            navegador = "Navegador desconocido";
        }

        String sistema;
        if (agente.contains("iPhone")) {
            sistema = "iPhone";
        } else if (agente.contains("iPad")) {
            sistema = "iPad";
        } else if (agente.contains("Android")) {
            sistema = "Android";
        } else if (agente.contains("Windows")) {
            sistema = "Windows";
        } else if (agente.contains("Mac OS")) {
            sistema = "macOS";
        } else if (agente.contains("Linux")) {
            sistema = "Linux";
        } else {
            sistema = "dispositivo no identificado";
        }
        return navegador + " en " + sistema;
    }
}
