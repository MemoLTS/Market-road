package com.marketroad.soporte.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.marketroad.soporte.dto.CambiarContrasenaRequestDTO;
import com.marketroad.soporte.dto.LoginRequestDTO;
import com.marketroad.soporte.dto.LoginResponseDTO;
import com.marketroad.soporte.dto.PersonalDTO;
import com.marketroad.soporte.security.IdentidadPersonal;
import com.marketroad.soporte.service.PersonalService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/** Inicio de sesión del personal de soporte (cuentas propias de este servicio, no las de la plataforma). */
@RestController
@RequestMapping("/api/v1/soporte/panel/auth")
public class PanelAuthController {
    @Autowired
    private PersonalService service;

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO body) {
        return ResponseEntity.ok(service.login(body));
    }

    @GetMapping("/yo")
    public ResponseEntity<PersonalDTO> yo(HttpServletRequest request) {
        return ResponseEntity.ok(service.yo(IdentidadPersonal.de(request)));
    }

    @PostMapping("/contrasena")
    public ResponseEntity<Void> cambiarContrasena(@Valid @RequestBody CambiarContrasenaRequestDTO body, HttpServletRequest request) {
        service.cambiarContrasenaPropia(IdentidadPersonal.de(request), body);
        return ResponseEntity.noContent().build();
    }
}
