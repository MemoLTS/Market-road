package com.marketroad.publication.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.marketroad.publication.dto.TicketSoporteDTO;
import com.marketroad.publication.dto.TicketSoporteRespuestaDTO;
import com.marketroad.publication.security.Identidad;
import com.marketroad.publication.service.SoporteService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;

/** Gestión de solicitudes de soporte, solo para el rol SUPERUSUARIO (se comprueba en el servicio). */
@Validated
@RestController
@RequestMapping("/api/v1/admin/soporte/tickets")
public class AdminSoporteController {
    @Autowired
    private SoporteService service;

    @GetMapping
    public ResponseEntity<List<TicketSoporteDTO>> listar(HttpServletRequest request) {
        return ResponseEntity.ok(service.listarTodos(Identidad.de(request)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<TicketSoporteDTO> responder(
            @PathVariable @Positive(message = "El identificador indicado no es válido") Long id,
            @Valid @RequestBody TicketSoporteRespuestaDTO body,
            HttpServletRequest request) {
        return ResponseEntity.ok(service.responder(id, body, Identidad.de(request)));
    }
}
