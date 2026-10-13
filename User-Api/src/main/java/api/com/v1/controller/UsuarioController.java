package api.com.v1.controller;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import api.com.v1.dto.FotoPerfilDTO;
import api.com.v1.dto.CambioCorreoDTO;
import api.com.v1.dto.DispositivoInicioSesionDTO;
import api.com.v1.dto.UsuarioRequestDTO;
import api.com.v1.dto.UsuarioResponseDTO;
import api.com.v1.dto.UsuarioUpdateDTO;
import api.com.v1.service.UsuarioService;
import api.com.v1.service.DispositivoInicioSesionService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/usuarios")
public class UsuarioController {

    private static final long TAMANO_MAXIMO_FOTO = 5L * 1024 * 1024;
    private static final byte[] FOTO_PERFIL_PREDETERMINADA = (
            "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 40 40\">"
                    + "<circle cx=\"20\" cy=\"20\" r=\"20\" fill=\"#e4e6eb\"/>"
                    + "<circle cx=\"20\" cy=\"15\" r=\"7\" fill=\"#606770\"/>"
                    + "<path d=\"M6 37c1-8 6-12 14-12s13 4 14 12\" fill=\"#606770\"/>"
                    + "</svg>").getBytes(StandardCharsets.UTF_8);

    @Autowired
    private UsuarioService usuarioService;
    @Autowired
    private DispositivoInicioSesionService dispositivoInicioSesionService;

    @GetMapping("/{id}/dispositivos")
    public ResponseEntity<List<DispositivoInicioSesionDTO>> obtenerDispositivos(
            @PathVariable Long id,
            @RequestAttribute("usuarioAutenticadoId") Long usuarioAutenticadoId) {
        if (!id.equals(usuarioAutenticadoId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo puedes consultar tu propio historial");
        }
        return ResponseEntity.ok(dispositivoInicioSesionService.obtenerHistorial(id));
    }

    @PostMapping
    public ResponseEntity<UsuarioResponseDTO> crear(@Valid @RequestBody UsuarioRequestDTO dto) {
        UsuarioResponseDTO creado = usuarioService.crear(dto);
        return ResponseEntity.created(URI.create("/api/v1/usuarios/" + creado.id())).body(creado);
    }

    @GetMapping
    public ResponseEntity<List<UsuarioResponseDTO>> obtenerTodos() {
        return ResponseEntity.ok(usuarioService.obtenerTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UsuarioResponseDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.obtenerPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UsuarioResponseDTO> actualizar(@PathVariable Long id,
            @RequestAttribute("usuarioAutenticadoId") Long usuarioAutenticadoId,
            @Valid @RequestBody UsuarioRequestDTO dto) {
        if (!id.equals(usuarioAutenticadoId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo puedes cambiar tu propio perfil");
        }
        return ResponseEntity.ok(usuarioService.actualizar(id, dto));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<UsuarioResponseDTO> actualizarParcial(@PathVariable Long id,
            @RequestAttribute("usuarioAutenticadoId") Long usuarioAutenticadoId,
            @Valid @RequestBody UsuarioUpdateDTO dto) {
        if (!id.equals(usuarioAutenticadoId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo puedes cambiar tu propio perfil");
        }
        return ResponseEntity.ok(usuarioService.actualizarParcial(id, dto));
    }

    @PatchMapping("/{id}/correo")
    public ResponseEntity<UsuarioResponseDTO> cambiarCorreo(@PathVariable Long id,
            @RequestAttribute("usuarioAutenticadoId") Long usuarioAutenticadoId,
            @Valid @RequestBody CambioCorreoDTO dto) {
        if (!id.equals(usuarioAutenticadoId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo puedes cambiar tu propio correo");
        }
        return ResponseEntity.ok(usuarioService.cambiarCorreo(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        usuarioService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/{id}/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> actualizarFotoPerfil(
            @PathVariable Long id,
            @RequestAttribute("usuarioAutenticadoId") Long usuarioAutenticadoId,
            @RequestParam("foto") MultipartFile foto) throws java.io.IOException {
        if (!id.equals(usuarioAutenticadoId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo puedes cambiar tu propia foto de perfil");
        }
        if (foto.isEmpty() || foto.getSize() > TAMANO_MAXIMO_FOTO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen debe pesar entre 1 byte y 5 MB");
        }

        byte[] contenido = foto.getBytes();
        String tipoContenido = detectarTipoImagen(contenido);
        if (tipoContenido == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La foto debe ser JPG, PNG o WEBP");
        }

        usuarioService.actualizarFotoPerfil(id, contenido, tipoContenido);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/foto")
    public ResponseEntity<byte[]> obtenerFotoPerfil(@PathVariable Long id) {
        FotoPerfilDTO foto = usuarioService.obtenerFotoPerfil(id).orElse(null);
        if (foto == null) {
            return ResponseEntity.ok()
                    .contentType(MediaType.valueOf("image/svg+xml"))
                    .cacheControl(CacheControl.noStore())
                    .header("X-Content-Type-Options", "nosniff")
                    .body(FOTO_PERFIL_PREDETERMINADA);
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(foto.tipoContenido()))
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .body(foto.contenido());
    }

    private String detectarTipoImagen(byte[] contenido) {
        if (contenido.length >= 3
                && (contenido[0] & 0xff) == 0xff
                && (contenido[1] & 0xff) == 0xd8
                && (contenido[2] & 0xff) == 0xff) {
            return MediaType.IMAGE_JPEG_VALUE;
        }
        if (contenido.length >= 8
                && (contenido[0] & 0xff) == 0x89
                && contenido[1] == 0x50
                && contenido[2] == 0x4e
                && contenido[3] == 0x47
                && contenido[4] == 0x0d
                && contenido[5] == 0x0a
                && contenido[6] == 0x1a
                && contenido[7] == 0x0a) {
            return MediaType.IMAGE_PNG_VALUE;
        }
        if (contenido.length >= 12
                && contenido[0] == 'R'
                && contenido[1] == 'I'
                && contenido[2] == 'F'
                && contenido[3] == 'F'
                && contenido[8] == 'W'
                && contenido[9] == 'E'
                && contenido[10] == 'B'
                && contenido[11] == 'P') {
            return "image/webp";
        }
        return null;
    }
}
