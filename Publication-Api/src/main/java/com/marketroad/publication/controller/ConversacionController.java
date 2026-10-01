package com.marketroad.publication.controller;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.marketroad.publication.dto.ConversacionDetalleDTO;
import com.marketroad.publication.dto.ConversacionResumenDTO;
import com.marketroad.publication.dto.IniciarConversacionRequestDTO;
import com.marketroad.publication.dto.MensajeRequestDTO;
import com.marketroad.publication.dto.NoLeidosDTO;
import com.marketroad.publication.dto.OfertaRequestDTO;
import com.marketroad.publication.mensajeria.ConversacionService;
import com.marketroad.publication.security.Identidad;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Positive;
import jakarta.validation.Valid;

/** Mensajería y ofertas entre comprador y vendedor. Todas las rutas requieren sesión iniciada. */
@Validated
@RestController
@RequestMapping("/api/v1/conversaciones")
public class ConversacionController {
    private final ConversacionService service;

    public ConversacionController(ConversacionService service) {
        this.service = service;
    }

    /** Bandeja del usuario (más reciente primero). Con {@code publicacionId} filtra por una publicación. */
    @GetMapping
    public ResponseEntity<List<ConversacionResumenDTO>> listar(
            @RequestParam(value = "publicacionId", required = false) @Positive(message = "La publicación indicada no es válida") Long publicacionId,
            HttpServletRequest request) {
        return ResponseEntity.ok(service.listar(Identidad.de(request), publicacionId));
    }

    @GetMapping("/no-leidos")
    public ResponseEntity<NoLeidosDTO> noLeidos(HttpServletRequest request) {
        return ResponseEntity.ok(new NoLeidosDTO(service.contarNoLeidos(Identidad.de(request))));
    }

    /** El comprador escribe al vendedor de una publicación (crea la conversación si no existe). */
    @PostMapping
    public ResponseEntity<ConversacionDetalleDTO> iniciar(@Valid @RequestBody IniciarConversacionRequestDTO body,
                                                          HttpServletRequest request) {
        ConversacionDetalleDTO detalle = service.iniciar(body.publicacionId(), body.contenido(), Identidad.de(request));
        return ResponseEntity.created(URI.create("/api/v1/conversaciones/" + detalle.conversacion().id())).body(detalle);
    }

    /** Conversación completa; marca como leídos los mensajes recibidos. */
    @GetMapping("/{id}")
    public ResponseEntity<ConversacionDetalleDTO> obtener(@PathVariable @Positive(message = "El identificador indicado no es válido") Long id, HttpServletRequest request) {
        return ResponseEntity.ok(service.obtener(id, Identidad.de(request)));
    }

    @PostMapping("/{id}/mensajes")
    public ResponseEntity<ConversacionDetalleDTO> enviar(@PathVariable @Positive(message = "El identificador indicado no es válido") Long id,
                                                         @Valid @RequestBody MensajeRequestDTO body,
                                                         HttpServletRequest request) {
        return ResponseEntity.ok(service.enviarTexto(id, body.contenido(), Identidad.de(request)));
    }

    @PostMapping("/{id}/ofertas")
    public ResponseEntity<ConversacionDetalleDTO> ofertar(@PathVariable @Positive(message = "El identificador indicado no es válido") Long id,
                                                          @Valid @RequestBody OfertaRequestDTO body,
                                                          HttpServletRequest request) {
        return ResponseEntity.ok(service.ofertar(id, body.monto(), Identidad.de(request)));
    }

    @PostMapping("/{id}/ofertas/{mensajeId}/aceptar")
    public ResponseEntity<ConversacionDetalleDTO> aceptar(@PathVariable @Positive(message = "El identificador indicado no es válido") Long id, @PathVariable @Positive(message = "El identificador indicado no es válido") Long mensajeId,
                                                          HttpServletRequest request) {
        return ResponseEntity.ok(service.responderOferta(id, mensajeId, true, Identidad.de(request)));
    }

    @PostMapping("/{id}/ofertas/{mensajeId}/rechazar")
    public ResponseEntity<ConversacionDetalleDTO> rechazar(@PathVariable @Positive(message = "El identificador indicado no es válido") Long id, @PathVariable @Positive(message = "El identificador indicado no es válido") Long mensajeId,
                                                           HttpServletRequest request) {
        return ResponseEntity.ok(service.responderOferta(id, mensajeId, false, Identidad.de(request)));
    }

    /** El vendedor cierra la venta con el comprador de esta conversación. */
    @PostMapping("/{id}/venta")
    public ResponseEntity<ConversacionDetalleDTO> vender(@PathVariable @Positive(message = "El identificador indicado no es válido") Long id, HttpServletRequest request) {
        return ResponseEntity.ok(service.marcarVendida(id, Identidad.de(request)));
    }
}
