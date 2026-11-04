package com.marketroad.soporte.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.marketroad.soporte.dto.PaginaDTO;
import com.marketroad.soporte.dto.ResumenSoporteDTO;
import com.marketroad.soporte.dto.TicketPanelDetalleDTO;
import com.marketroad.soporte.dto.TicketPanelResumenDTO;
import com.marketroad.soporte.security.IdentidadUsuario;
import com.marketroad.soporte.service.TicketService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Positive;

@Validated
@RestController
@RequestMapping("/api/v1/soporte/admin/tickets")
public class AdminTicketController {
    @Autowired
    private TicketService service;

    @GetMapping
    public ResponseEntity<PaginaDTO<TicketPanelResumenDTO>> listar(
            @RequestParam(value = "estado", required = false) String estado,
            @RequestParam(value = "prioridad", required = false) String prioridad,
            @RequestParam(value = "categoria", required = false) String categoria,
            @RequestParam(value = "asignacion", required = false) String asignacion,
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "pagina", defaultValue = "0") int pagina,
            @RequestParam(value = "tamano", defaultValue = "20") int tamano,
            HttpServletRequest request) {
        IdentidadUsuario.de(request).exigirSuperusuario();
        return ResponseEntity
                .ok(service.listarParaSuperusuario(estado, prioridad, categoria, asignacion, q, pagina, tamano));
    }

    @GetMapping("/resumen")
    public ResponseEntity<ResumenSoporteDTO> resumen(HttpServletRequest request) {
        IdentidadUsuario.de(request).exigirSuperusuario();
        return ResponseEntity.ok(service.resumenParaSuperusuario());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketPanelDetalleDTO> obtener(
            @PathVariable @Positive(message = "El identificador indicado no es válido") Long id,
            HttpServletRequest request) {
        IdentidadUsuario.de(request).exigirSuperusuario();
        return ResponseEntity.ok(service.obtenerParaSuperusuario(id));
    }
}
