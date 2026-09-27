package api.com.v1.service;

import java.util.List;

import api.com.v1.dto.UsuarioRequestDTO;
import api.com.v1.dto.UsuarioResponseDTO;
import api.com.v1.dto.UsuarioUpdateDTO;

public interface UsuarioService {

    UsuarioResponseDTO crear(UsuarioRequestDTO dto);

    List<UsuarioResponseDTO> obtenerTodos();

    UsuarioResponseDTO obtenerPorId(Long id);

    UsuarioResponseDTO actualizar(Long id, UsuarioRequestDTO dto);

    UsuarioResponseDTO actualizarParcial(Long id, UsuarioUpdateDTO dto);

    void eliminar(Long id);
}
