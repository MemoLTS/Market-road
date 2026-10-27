package com.marketroad.soporte.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.marketroad.soporte.dto.EstadisticasDTO;
import com.marketroad.soporte.security.IdentidadPersonal;
import com.marketroad.soporte.service.EstadisticasService;

import jakarta.servlet.http.HttpServletRequest;

/** Datos agregados del soporte. Solo ADMIN (lo exige el servicio). */
@RestController
@RequestMapping("/api/v1/soporte/panel/estadisticas")
public class PanelEstadisticasController {
    @Autowired
    private EstadisticasService service;

    @GetMapping
    public ResponseEntity<EstadisticasDTO> obtener(HttpServletRequest request) {
        return ResponseEntity.ok(service.obtener(IdentidadPersonal.de(request)));
    }
}
