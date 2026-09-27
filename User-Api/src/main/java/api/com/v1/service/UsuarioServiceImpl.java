package api.com.v1.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import api.com.v1.dto.UsuarioRequestDTO;
import api.com.v1.dto.UsuarioResponseDTO;
import api.com.v1.dto.UsuarioUpdateDTO;
import api.com.v1.exception.RecursoDuplicadoException;
import api.com.v1.exception.RecursoNoEncontradoException;
import api.com.v1.model.Usuario;
import api.com.v1.repository.UsuarioRepository;

@Service
public class UsuarioServiceImpl implements UsuarioService {
    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public UsuarioResponseDTO crear(UsuarioRequestDTO dto) {
        if (usuarioRepository.existsByCorreo(dto.correo())) {
            throw new RecursoDuplicadoException("Ya existe un usuario registrado con ese correo");
        }
        if (usuarioRepository.existsByApodo(dto.apodo())) {
            throw new RecursoDuplicadoException("Ya existe un usuario registrado con ese apodo");
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(dto.nombre());
        usuario.setApellido(dto.apellido());
        usuario.setApodo(dto.apodo());
        usuario.setCorreo(dto.correo());
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

        validarCorreoDisponible(dto.correo(), id);
        validarApodoDisponible(dto.apodo(), id);

        usuario.setNombre(dto.nombre());
        usuario.setApellido(dto.apellido());
        usuario.setApodo(dto.apodo());
        usuario.setCorreo(dto.correo());
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
            validarApodoDisponible(dto.apodo(), id);
            usuario.setApodo(dto.apodo());
        }
        if (dto.correo() != null) {
            validarCorreoDisponible(dto.correo(), id);
            usuario.setCorreo(dto.correo());
        }
        if (dto.contrasena() != null) {
            usuario.setContrasena(passwordEncoder.encode(dto.contrasena()));
        }

        return aResponseDTO(usuarioRepository.save(usuario));
    }

    @Override
    @Transactional
    public void eliminar(Long id) {
        Usuario usuario = buscarPorIdOLanzar(id);
        usuarioRepository.delete(usuario);
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

    private UsuarioResponseDTO aResponseDTO(Usuario usuario) {
        return new UsuarioResponseDTO(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getApodo(),
                usuario.getCorreo());
    }
}
