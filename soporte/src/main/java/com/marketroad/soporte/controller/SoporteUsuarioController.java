package com.marketroad.soporte.controller;

import java.net.URI;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.marketroad.soporte.dto.CategoriaDTO;
import com.marketroad.soporte.dto.CrearTicketRequestDTO;
import com.marketroad.soporte.dto.MensajeRequestDTO;
import com.marketroad.soporte.dto.NoLeidosDTO;
import com.marketroad.soporte.dto.TicketDetalleDTO;
import com.marketroad.soporte.dto.TicketResumenDTO;
import com.marketroad.soporte.security.IdentidadUsuario;
import com.marketroad.soporte.service.TicketService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;

/** Soporte para personas usuarias: abrir tickets y conversar con el equipo en el chat de cada ticket. */
@Validated
@RestController
@RequestMapping("/api/v1/soporte")
public class SoporteUsuarioController {
    @Autowired
    private TicketService service;

    @GetMapping("/categorias")
    public ResponseEntity<List<CategoriaDTO>> categorias() {
        return ResponseEntity.ok(service.categorias());
    }

    @GetMapping("/tickets")
    public ResponseEntity<List<TicketResumenDTO>> listar(HttpServletRequest request) {
        return ResponseEntity.ok(service.listarDeUsuario(IdentidadUsuario.de(request)));
    }

    @GetMapping("/tickets/no-leidos")
    public ResponseEntity<NoLeidosDTO> noLeidos(HttpServletRequest request) {
        return ResponseEntity.ok(service.contarNoLeidos(IdentidadUsuario.de(request)));
    }

    @PostMapping("/tickets")
    public ResponseEntity<TicketDetalleDTO> crear(@Valid @RequestBody CrearTicketRequestDTO body, HttpServletRequest request) {
        TicketDetalleDTO detalle = service.crear(IdentidadUsuario.de(request), body);
        return ResponseEntity.created(URI.create("/api/v1/soporte/tickets/" + detalle.ticket().id())).body(detalle);
    }

    @GetMapping("/tickets/{id}")
    public ResponseEntity<TicketDetalleDTO> obtener(
            @PathVariable @Positive(message = "El identificador indicado no es válido") Long id, HttpServletRequest request) {
        return ResponseEntity.ok(service.obtenerDeUsuario(id, IdentidadUsuario.de(request)));
    }

    @PostMapping("/tickets/{id}/mensajes")
    public ResponseEntity<TicketDetalleDTO> responder(
            @PathVariable @Positive(message = "El identificador indicado no es válido") Long id,
            @Valid @RequestBody MensajeRequestDTO body, HttpServletRequest request) {
        return ResponseEntity.ok(service.responderUsuario(id, body.contenido(), IdentidadUsuario.de(request)));
    }

    @PostMapping("/tickets/{id}/cierre")
    public ResponseEntity<TicketDetalleDTO> cerrar(
            @PathVariable @Positive(message = "El identificador indicado no es válido") Long id, HttpServletRequest request) {
        return ResponseEntity.ok(service.cerrarUsuario(id, IdentidadUsuario.de(request)));
    }
}
