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
