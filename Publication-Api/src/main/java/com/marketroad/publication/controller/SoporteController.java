package com.marketroad.publication.controller;

import java.net.URI;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.marketroad.publication.dto.TicketSoporteDTO;
import com.marketroad.publication.dto.TicketSoporteRequestDTO;
import com.marketroad.publication.security.Identidad;
import com.marketroad.publication.service.SoporteService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/** Soporte para usuarios autenticados: crear una solicitud y ver las propias. */
@Validated
@RestController
@RequestMapping("/api/v1/soporte/tickets")
public class SoporteController {
    @Autowired
    private SoporteService service;

    @GetMapping
    public ResponseEntity<List<TicketSoporteDTO>> misSolicitudes(HttpServletRequest request) {
        return ResponseEntity.ok(service.listarDelUsuario(Identidad.de(request)));
    }

    @PostMapping
    public ResponseEntity<TicketSoporteDTO> crear(@Valid @RequestBody TicketSoporteRequestDTO body,
            HttpServletRequest request) {
        TicketSoporteDTO ticket = service.crear(body, Identidad.de(request));
        return ResponseEntity.created(URI.create("/api/v1/soporte/tickets/" + ticket.id())).body(ticket);
    }
}
