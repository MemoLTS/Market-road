package api.com.v1.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import api.com.v1.dto.RestablecerContrasenaDTO;
import api.com.v1.dto.UsuarioResponseDTO;
import api.com.v1.model.Rol;
import api.com.v1.repository.UsuarioRepository;
import api.com.v1.service.UsuarioService;

@RestController
@RequestMapping("/api/v1/admin/usuarios")
public class AdminUsuarioController {

    @Autowired
    private UsuarioService usuarioService;
    @Autowired
    private UsuarioRepository usuarioRepository;

    @GetMapping
    public ResponseEntity<List<UsuarioResponseDTO>> listar(
            @RequestAttribute("usuarioAutenticadoId") Long usuarioAutenticadoId) {
        exigirSuperusuario(usuarioAutenticadoId);
        return ResponseEntity.ok(usuarioService.obtenerTodos());
    }

    /** El superusuario fija una contraseña nueva a otro usuario (no puede tocar a otros superusuarios). */
    @PatchMapping("/{id}/contrasena")
    public ResponseEntity<Void> restablecerContrasena(
            @RequestAttribute("usuarioAutenticadoId") Long usuarioAutenticadoId,
            @PathVariable Long id,
            @Valid @RequestBody RestablecerContrasenaDTO dto) {
        exigirSuperusuario(usuarioAutenticadoId);
        if (!id.equals(usuarioAutenticadoId)) {
            boolean objetivoEsSuperusuario = usuarioRepository.findById(id)
                    .map(u -> u.getRol() == Rol.SUPERUSUARIO)
                    .orElse(false);
            if (objetivoEsSuperusuario) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "No se puede cambiar la contraseña de otro superusuario");
            }
        }
        usuarioService.restablecerContrasena(id, dto.contrasena());
        return ResponseEntity.noContent().build();
    }

    private void exigirSuperusuario(Long usuarioId) {
        boolean esSuperusuario = usuarioRepository.findById(usuarioId)
                .map(u -> u.getRol() == Rol.SUPERUSUARIO)
                .orElse(false);
        if (!esSuperusuario) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acceso restringido al superusuario");
        }
    }
}
