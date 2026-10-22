package api.com.v1.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import api.com.v1.dto.UsuarioRequestDTO;
import api.com.v1.dto.UsuarioResponseDTO;
import api.com.v1.dto.UsuarioUpdateDTO;
import api.com.v1.dto.CambioCorreoDTO;
import api.com.v1.dto.FotoPerfilDTO;
import api.com.v1.exception.RecursoDuplicadoException;
import api.com.v1.exception.RecursoNoEncontradoException;
import api.com.v1.exception.CredencialesInvalidasException;
import api.com.v1.model.Usuario;
import api.com.v1.model.FotoPerfil;
import api.com.v1.repository.FotoPerfilRepository;
import api.com.v1.repository.DispositivoInicioSesionRepository;
import api.com.v1.repository.UsuarioRepository;

@Service
public class UsuarioServiceImpl implements UsuarioService {
    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private FotoPerfilRepository fotoPerfilRepository;
    @Autowired
    private DispositivoInicioSesionRepository dispositivoInicioSesionRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public UsuarioResponseDTO crear(UsuarioRequestDTO dto) {
        if (usuarioRepository.existsByCorreo(dto.correo())) {
            throw new RecursoDuplicadoException("Ya existe un usuario registrado con ese correo");
        }
        String apodo = normalizarApodo(dto.apodo());
        if (apodo != null && usuarioRepository.existsByApodo(apodo)) {
            throw new RecursoDuplicadoException("Ya existe un usuario registrado con ese apodo");
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(dto.nombre());
        usuario.setApellido(dto.apellido());
        usuario.setApodo(apodo);
        usuario.setCorreo(dto.correo());
        usuario.setCiudad(null);
        usuario.setContrasena(passwordEncoder.encode(dto.contrasena()));

        Usuario guardado = usuarioRepository.save(usuario);
        return aResponseDTO(guardado);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UsuarioResponseDTO> obtenerTodos() {
        return usuarioRepository.findAll()
                .stream()
                .map(this::aResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public UsuarioResponseDTO obtenerPorId(Long id) {
        return aResponseDTO(buscarPorIdOLanzar(id));
    }

    @Override
    @Transactional
    public UsuarioResponseDTO actualizar(Long id, UsuarioRequestDTO dto) {
        Usuario usuario = buscarPorIdOLanzar(id);

        if (!usuario.getCorreo().equalsIgnoreCase(dto.correo())) {
            throw new CredencialesInvalidasException("Usa la opción de cambio de correo con tu contraseña actual");
        }
        String apodo = normalizarApodo(dto.apodo());
        if (apodo != null) {
            validarApodoDisponible(apodo, id);
        }

        usuario.setNombre(dto.nombre());
        usuario.setApellido(dto.apellido());
        usuario.setApodo(apodo);
        usuario.setContrasena(passwordEncoder.encode(dto.contrasena()));

        return aResponseDTO(usuarioRepository.save(usuario));
    }

    @Override
    @Transactional
    public UsuarioResponseDTO actualizarParcial(Long id, UsuarioUpdateDTO dto) {
        Usuario usuario = buscarPorIdOLanzar(id);

        if (dto.nombre() != null) {
            usuario.setNombre(dto.nombre());
        }
        if (dto.apellido() != null) {
            usuario.setApellido(dto.apellido());
        }
        if (dto.apodo() != null) {
            String apodo = dto.apodo().isBlank() ? null : dto.apodo();
            if (apodo != null) {
                validarApodoDisponible(apodo, id);
            }
            usuario.setApodo(apodo);
        }
        if (dto.ciudad() != null) {
            usuario.setCiudad(dto.ciudad().isBlank() ? null : dto.ciudad().trim());
        }
        if (dto.contrasena() != null) {
            usuario.setContrasena(passwordEncoder.encode(dto.contrasena()));
        }

        return aResponseDTO(usuarioRepository.save(usuario));
    }

    @Override
    @Transactional
    public UsuarioResponseDTO cambiarCorreo(Long id, CambioCorreoDTO dto) {
        Usuario usuario = buscarPorIdOLanzar(id);
        if (!passwordEncoder.matches(dto.contrasenaActual(), usuario.getContrasena())) {
            throw new CredencialesInvalidasException("La contraseña actual no es correcta");
        }
        String correo = dto.correo().trim();
        validarCorreoDisponible(correo, id);
        usuario.setCorreo(correo);
        return aResponseDTO(usuarioRepository.save(usuario));
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        Usuario usuario = buscarPorIdOLanzar(id);
        dispositivoInicioSesionRepository.deleteAllByUsuarioId(id);
        fotoPerfilRepository.deleteById(id);
        usuarioRepository.delete(usuario);
    }

    @Override
    @Transactional
    public void actualizarFotoPerfil(Long id, byte[] contenido, String tipoContenido) {
        Usuario usuario = buscarPorIdOLanzar(id);
        FotoPerfil foto = fotoPerfilRepository.findById(id).orElseGet(FotoPerfil::new);
        foto.setUsuario(usuario);
        foto.setContenido(contenido);
        foto.setTipoContenido(tipoContenido);
        fotoPerfilRepository.save(foto);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<FotoPerfilDTO> obtenerFotoPerfil(Long id) {
        return fotoPerfilRepository.findById(id)
                .map(foto -> new FotoPerfilDTO(foto.getContenido(), foto.getTipoContenido()));
    }

    private Usuario buscarPorIdOLanzar(Long id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el usuario con id " + id));
    }

    private void validarCorreoDisponible(String correo, Long idActual) {
        usuarioRepository.findByCorreo(correo)
                .filter(u -> !u.getId().equals(idActual))
                .ifPresent(u -> {
                    throw new RecursoDuplicadoException("Ya existe un usuario registrado con ese correo");
                });
    }

    private void validarApodoDisponible(String apodo, Long idActual) {
        usuarioRepository.findByApodo(apodo)
                .filter(u -> !u.getId().equals(idActual))
                .ifPresent(u -> {
                    throw new RecursoDuplicadoException("Ya existe un usuario registrado con ese apodo");
                });
    }

    private String normalizarApodo(String apodo) {
        return apodo == null || apodo.isBlank() ? null : apodo.trim();
    }

    private UsuarioResponseDTO aResponseDTO(Usuario usuario) {
        return new UsuarioResponseDTO(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getApodo(),
                usuario.getCorreo(),
                usuario.getCiudad(),
                usuario.getRol().name());
    }
}
