package com.marketroad.soporte.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.marketroad.soporte.dto.AsignacionRequestDTO;
import com.marketroad.soporte.dto.EstadoRequestDTO;
import com.marketroad.soporte.dto.MensajeRequestDTO;
import com.marketroad.soporte.dto.PaginaDTO;
import com.marketroad.soporte.dto.PrioridadRequestDTO;
import com.marketroad.soporte.dto.TicketPanelDetalleDTO;
import com.marketroad.soporte.dto.TicketPanelResumenDTO;
import com.marketroad.soporte.security.IdentidadPersonal;
import com.marketroad.soporte.service.TicketService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;

/** Tickets y chats vistos desde el panel. Qué tickets se ven y qué se puede hacer depende del rol (ver TicketService). */
@Validated
@RestController
@RequestMapping("/api/v1/soporte/panel/tickets")
public class PanelTicketController {
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
        return ResponseEntity.ok(service.listarPanel(IdentidadPersonal.de(request), estado, prioridad, categoria,
                asignacion, q, pagina, tamano));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketPanelDetalleDTO> obtener(
            @PathVariable @Positive(message = "El identificador indicado no es válido") Long id, HttpServletRequest request) {
        return ResponseEntity.ok(service.obtenerPanel(id, IdentidadPersonal.de(request)));
    }

    @PostMapping("/{id}/mensajes")
    public ResponseEntity<TicketPanelDetalleDTO> responder(
            @PathVariable @Positive(message = "El identificador indicado no es válido") Long id,
            @Valid @RequestBody MensajeRequestDTO body, HttpServletRequest request) {
        return ResponseEntity.ok(service.responderPanel(id, body.contenido(), IdentidadPersonal.de(request)));
    }

    @PostMapping("/{id}/tomar")
    public ResponseEntity<TicketPanelDetalleDTO> tomar(
            @PathVariable @Positive(message = "El identificador indicado no es válido") Long id, HttpServletRequest request) {
        return ResponseEntity.ok(service.tomar(id, IdentidadPersonal.de(request)));
    }

    @PostMapping("/{id}/estado")
    public ResponseEntity<TicketPanelDetalleDTO> cambiarEstado(
            @PathVariable @Positive(message = "El identificador indicado no es válido") Long id,
            @Valid @RequestBody EstadoRequestDTO body, HttpServletRequest request) {
        return ResponseEntity.ok(service.cambiarEstado(id, body.estado(), IdentidadPersonal.de(request)));
    }

    @PostMapping("/{id}/prioridad")
    public ResponseEntity<TicketPanelDetalleDTO> cambiarPrioridad(
            @PathVariable @Positive(message = "El identificador indicado no es válido") Long id,
            @Valid @RequestBody PrioridadRequestDTO body, HttpServletRequest request) {
        return ResponseEntity.ok(service.cambiarPrioridad(id, body.prioridad(), IdentidadPersonal.de(request)));
    }

    /** Solo ADMIN. */
    @PostMapping("/{id}/asignacion")
    public ResponseEntity<TicketPanelDetalleDTO> asignar(
            @PathVariable @Positive(message = "El identificador indicado no es válido") Long id,
            @RequestBody AsignacionRequestDTO body, HttpServletRequest request) {
        return ResponseEntity.ok(service.asignar(id, body.personalId(), IdentidadPersonal.de(request)));
    }
}
