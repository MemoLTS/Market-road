package com.marketroad.soporte.controller;

import java.net.URI;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.marketroad.soporte.dto.ActualizarPersonalRequestDTO;
import com.marketroad.soporte.dto.CrearPersonalRequestDTO;
import com.marketroad.soporte.dto.PersonalDTO;
import com.marketroad.soporte.security.IdentidadPersonal;
import com.marketroad.soporte.service.PersonalService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;

/** Gestión del equipo de soporte. Solo ADMIN (lo exige el servicio). */
@Validated
@RestController
@RequestMapping("/api/v1/soporte/panel/personal")
public class PanelPersonalController {
    @Autowired
    private PersonalService service;

    @GetMapping
    public ResponseEntity<List<PersonalDTO>> listar(HttpServletRequest request) {
        return ResponseEntity.ok(service.listar(IdentidadPersonal.de(request)));
    }

    @PostMapping
    public ResponseEntity<PersonalDTO> crear(@Valid @RequestBody CrearPersonalRequestDTO body, HttpServletRequest request) {
        PersonalDTO creado = service.crear(IdentidadPersonal.de(request), body);
        return ResponseEntity.created(URI.create("/api/v1/soporte/panel/personal/" + creado.id())).body(creado);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<PersonalDTO> actualizar(
            @PathVariable @Positive(message = "El identificador indicado no es válido") Long id,
            @Valid @RequestBody ActualizarPersonalRequestDTO body, HttpServletRequest request) {
        return ResponseEntity.ok(service.actualizar(IdentidadPersonal.de(request), id, body));
    }
}
