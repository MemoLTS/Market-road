package com.marketroad.publication.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.marketroad.publication.dto.AdminPublicacionDTO;
import com.marketroad.publication.dto.EstadoPublicacionAdminDTO;
import com.marketroad.publication.dto.ResumenPublicacionesDTO;
import com.marketroad.publication.exception.NoAutorizadoException;
import com.marketroad.publication.security.Identidad;
import com.marketroad.publication.service.AdminPublicacionService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

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

    /** El superusuario deshabilita o vuelve a habilitar una publicación (PATCH /{id}/estado). */
    @PatchMapping("/{id}/estado")
    public ResponseEntity<AdminPublicacionDTO> cambiarEstado(@PathVariable Long id,
            @Valid @RequestBody EstadoPublicacionAdminDTO dto, HttpServletRequest request) {
        Identidad identidad = Identidad.de(request);
        if (!identidad.esSuperusuario()) {
            throw new NoAutorizadoException("Acceso restringido al superusuario");
        }
        return ResponseEntity.ok(service.cambiarEstado(id, dto.habilitada()));
    }

    /** Publicaciones de una cuenta que se deshabilita o se vuelve a habilitar (PATCH /usuario/{id}/estado). */
    @PatchMapping("/usuario/{usuarioId}/estado")
    public ResponseEntity<java.util.Map<String, Integer>> cambiarEstadoDeUsuario(@PathVariable Long usuarioId,
            @Valid @RequestBody EstadoPublicacionAdminDTO dto, HttpServletRequest request) {
        exigirSuperusuario(request);
        return ResponseEntity.ok(java.util.Map.of("cambiadas", service.cambiarEstadoDeUsuario(usuarioId, dto.habilitada())));
    }

    /** Publicaciones de una cuenta eliminada (DELETE /usuario/{id}). */
    @DeleteMapping("/usuario/{usuarioId}")
    public ResponseEntity<java.util.Map<String, Integer>> retirarDeUsuario(@PathVariable Long usuarioId,
            HttpServletRequest request) {
        exigirSuperusuario(request);
        return ResponseEntity.ok(java.util.Map.of("cambiadas", service.retirarDeUsuario(usuarioId)));
    }

    private void exigirSuperusuario(HttpServletRequest request) {
        if (!Identidad.de(request).esSuperusuario()) {
            throw new NoAutorizadoException("Acceso restringido al superusuario");
        }
    }

    /** Dashboard: publicaciones nuevas y ventas cerradas en los últimos `dias` días (por defecto 7). */
    @GetMapping("/resumen")
    public ResponseEntity<ResumenPublicacionesDTO> resumen(
            @RequestParam(value = "dias", required = false) Integer dias, HttpServletRequest request) {
        Identidad identidad = Identidad.de(request);
        if (!identidad.esSuperusuario()) {
            throw new NoAutorizadoException("Acceso restringido al superusuario");
        }
        return ResponseEntity.ok(service.resumen(dias));
    }
}
