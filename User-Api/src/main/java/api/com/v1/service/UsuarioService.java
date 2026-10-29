package api.com.v1.service;

import java.util.List;
import java.util.Optional;

import api.com.v1.dto.FotoPerfilDTO;
import api.com.v1.dto.CambioCorreoDTO;
import api.com.v1.dto.UsuarioRequestDTO;
import api.com.v1.dto.UsuarioResponseDTO;
import api.com.v1.dto.UsuarioUpdateDTO;

public interface UsuarioService {

    UsuarioResponseDTO crear(UsuarioRequestDTO dto);

    List<UsuarioResponseDTO> obtenerTodos();

    UsuarioResponseDTO obtenerPorId(Long id);

    UsuarioResponseDTO actualizar(Long id, UsuarioRequestDTO dto);

    UsuarioResponseDTO actualizarParcial(Long id, UsuarioUpdateDTO dto);

    UsuarioResponseDTO cambiarCorreo(Long id, CambioCorreoDTO dto);

    void eliminar(Long id);

    void actualizarFotoPerfil(Long id, byte[] contenido, String tipoContenido);

    Optional<FotoPerfilDTO> obtenerFotoPerfil(Long id);
}
