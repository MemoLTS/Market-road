package com.marketroad.publication.service;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import com.marketroad.publication.dto.ImagenDTO;
import com.marketroad.publication.dto.NuevaPublicacionDTO;
import com.marketroad.publication.dto.PublicacionResponseDTO;
import com.marketroad.publication.security.Identidad;

public interface PublicacionService {
    PublicacionResponseDTO crear(NuevaPublicacionDTO datos, List<MultipartFile> fotos, Identidad autor);
    List<PublicacionResponseDTO> obtenerPorUsuario(Long usuarioId);
    PublicacionResponseDTO obtenerPorId(Long id);
    ImagenDTO obtenerImagen(Long id, Integer posicion);
    void eliminar(Long id, Long usuarioId);
}
