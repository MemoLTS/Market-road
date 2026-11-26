package api.com.v1.controller;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import api.com.v1.dto.AdminActualizarUsuarioDTO;
import api.com.v1.dto.EstadoUsuarioDTO;
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

    /** El superusuario edita los datos de otro usuario (nombre, apellido, apodo, correo, ciudad y, si quiere, contraseña). */
    @PatchMapping("/{id}")
    public ResponseEntity<UsuarioResponseDTO> actualizar(
            @RequestAttribute("usuarioAutenticadoId") Long usuarioAutenticadoId,
            @PathVariable Long id,
            @Valid @RequestBody AdminActualizarUsuarioDTO dto) {
        exigirSuperusuario(usuarioAutenticadoId);
        exigirQueNoSeaOtroSuperusuario(usuarioAutenticadoId, id);
        return ResponseEntity.ok(usuarioService.actualizarComoAdmin(id, dto));
    }

    /** El superusuario fija una contraseña nueva a otro usuario (no puede tocar a otros superusuarios). */
    @PatchMapping("/{id}/contrasena")
    public ResponseEntity<Void> restablecerContrasena(
            @RequestAttribute("usuarioAutenticadoId") Long usuarioAutenticadoId,
            @PathVariable Long id,
            @Valid @RequestBody RestablecerContrasenaDTO dto) {
        exigirSuperusuario(usuarioAutenticadoId);
        exigirQueNoSeaOtroSuperusuario(usuarioAutenticadoId, id);
        usuarioService.restablecerContrasena(id, dto.contrasena());
        return ResponseEntity.noContent().build();
    }

    /**
     * Deshabilita (activo=false) o vuelve a habilitar una cuenta. Una cuenta deshabilitada solo puede usar
     * el soporte. No se puede deshabilitar a un superusuario, ni siquiera a uno mismo.
     */
    @PatchMapping("/{id}/estado")
    public ResponseEntity<UsuarioResponseDTO> cambiarEstado(
            @RequestAttribute("usuarioAutenticadoId") Long usuarioAutenticadoId,
            @PathVariable Long id,
            @Valid @RequestBody EstadoUsuarioDTO dto) {
        exigirSuperusuario(usuarioAutenticadoId);
        exigirQueNoSeaSuperusuario(id);
        return ResponseEntity.ok(usuarioService.cambiarEstado(id, dto.activo()));
    }

    /** Elimina la cuenta: deja de existir, no puede iniciar sesión ni enviar o recibir mensajes. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            @RequestAttribute("usuarioAutenticadoId") Long usuarioAutenticadoId,
            @PathVariable Long id) {
        exigirSuperusuario(usuarioAutenticadoId);
        exigirQueNoSeaSuperusuario(id);
        usuarioService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    private void exigirQueNoSeaSuperusuario(Long objetivoId) {
        boolean objetivoEsSuperusuario = usuarioRepository.findById(objetivoId)
                .map(u -> u.getRol() == Rol.SUPERUSUARIO)
                .orElse(false);
        if (objetivoEsSuperusuario) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "No se puede deshabilitar ni eliminar a un superusuario");
        }
    }

    private void exigirQueNoSeaOtroSuperusuario(Long adminId, Long objetivoId) {
        if (objetivoId.equals(adminId)) {
            return;
        }
        boolean objetivoEsSuperusuario = usuarioRepository.findById(objetivoId)
                .map(u -> u.getRol() == Rol.SUPERUSUARIO)
                .orElse(false);
        if (objetivoEsSuperusuario) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "No se puede modificar a otro superusuario");
        }
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
