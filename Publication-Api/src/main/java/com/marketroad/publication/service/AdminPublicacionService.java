package com.marketroad.publication.service;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.marketroad.publication.dto.AdminPublicacionDTO;
import com.marketroad.publication.model.Publicacion;
import com.marketroad.publication.repository.PublicacionRepository;

@Service
public class AdminPublicacionService {
        @Autowired
        private PublicacionRepository repository;
        @Autowired
        private PublicacionMapper mapper;

        @Transactional(readOnly = true)
        public List<AdminPublicacionDTO> listarTodas() {
                List<Publicacion> publicaciones = repository.findAll(Sort.by(Sort.Direction.DESC, "fechaCreacion"));
                Map<Long, Integer> imagenes = mapper.contarImagenes(
                                publicaciones.stream().map(Publicacion::getId).toList());
                return publicaciones.stream()
                                .map(p -> new AdminPublicacionDTO(
                                                p.getId(), p.getTitulo(), p.getPrecio(),
                                                p.getCategoria().name(), p.getCategoria().getNombre(),
                                                p.getUbicacion(), p.getEstado().name(),
                                                p.getUsuarioId(), p.getVendedorApodo(),
                                                p.getCompradorId(), p.getPrecioVenta(), p.getFechaVenta(),
                                                p.getFechaCreacion(),
                                                imagenes.getOrDefault(p.getId(), 0)))
                                .toList();
        }
}
