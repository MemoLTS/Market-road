package com.marketroad.publication.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.marketroad.publication.dto.AdminPublicacionDTO;
import com.marketroad.publication.exception.NoAutorizadoException;
import com.marketroad.publication.security.Identidad;
import com.marketroad.publication.service.AdminPublicacionService;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Endpoints de administración, solo para el rol SUPERUSUARIO.
 * JwtAuthFilter ya exige un token válido en esta ruta (no está en la lista de rutas públicas);
 * aquí se comprueba el claim "rol" del token, firmado por User-Api con el secreto compartido.
 */
@RestController
@RequestMapping("/api/v1/admin/publicaciones")
public class AdminPublicacionController {
    @Autowired
    private AdminPublicacionService service;

    @GetMapping
    public ResponseEntity<List<AdminPublicacionDTO>> listar(HttpServletRequest request) {
        Identidad identidad = Identidad.de(request);
        if (!identidad.esSuperusuario()) {
            throw new NoAutorizadoException("Acceso restringido al superusuario");
        }
        return ResponseEntity.ok(service.listarTodas());
    }
}
