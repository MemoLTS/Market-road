package api.com.v1.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import api.com.v1.dto.LoginRequestDTO;
import api.com.v1.dto.LoginResponseDTO;
import api.com.v1.dto.UsuarioResponseDTO;
import api.com.v1.exception.CredencialesInvalidasException;
import api.com.v1.model.Usuario;
import api.com.v1.repository.UsuarioRepository;
import api.com.v1.security.JwtUtil;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO dto) {
        Usuario usuario = usuarioRepository.findByCorreo(dto.correo())
                .orElseThrow(() -> new CredencialesInvalidasException("Correo o contraseña incorrectos"));

        if (!passwordEncoder.matches(dto.contrasena(), usuario.getContrasena())) {
            throw new CredencialesInvalidasException("Correo o contraseña incorrectos");
        }

        String token = jwtUtil.generarToken(usuario.getId(), usuario.getCorreo(), usuario.getApodo());

        UsuarioResponseDTO usuarioDto = new UsuarioResponseDTO(
                usuario.getId(), usuario.getNombre(), usuario.getApellido(),
                usuario.getApodo(), usuario.getCorreo());

        return ResponseEntity.ok(new LoginResponseDTO(token, jwtUtil.getExpiracionMs(), usuarioDto));
    }

    /**
     * El logout es un concepto del cliente: como el token es stateless, basta
     * con que el frontend lo borre de su almacenamiento local. Este endpoint
     * existe para que el frontend tenga un lugar explícito al que llamar
     * (y para dejar la puerta abierta a una futura lista de revocación).
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }
}
