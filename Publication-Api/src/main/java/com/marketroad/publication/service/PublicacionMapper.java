package com.marketroad.publication.service;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.marketroad.publication.dto.ModalidadEntregaDTO;
import com.marketroad.publication.dto.PublicacionResponseDTO;
import com.marketroad.publication.model.Publicacion;
import com.marketroad.publication.repository.ImagenPublicacionRepository;

@Component
public class PublicacionMapper {
    @Autowired
    private ImagenPublicacionRepository imagenRepository;

    public PublicacionResponseDTO aDTO(Publicacion p, int cantidadImagenes, Double distanciaKm) {
        List<String> urls = IntStream.range(0, cantidadImagenes)
                .mapToObj(i -> "/api/v1/publicaciones/" + p.getId() + "/imagenes/" + i)
                .toList();
        return new PublicacionResponseDTO(
                p.getId(), p.getTitulo(), p.getPrecio(), p.getDescripcion(), p.getUbicacion(),
                p.getCategoria().name(), p.getCategoria().getNombre(),
                p.getModalidadesEntrega().stream()
                        .map(m -> new ModalidadEntregaDTO(m.name(), m.getNombre()))
                        .toList(),
                p.getLatitud(), p.getLongitud(), distanciaKm,
                p.getUsuarioId(), p.getVendedorApodo(),
                p.getEstado().name(), p.getFechaCreacion(), urls);
    }

    public Map<Long, Integer> contarImagenes(Collection<Long> ids) {
        Map<Long, Integer> cantidades = new HashMap<>();
        if (ids.isEmpty()) {
            return cantidades;
        }
        for (Object[] fila : imagenRepository.contarPorPublicacion(ids)) {
            cantidades.put(((Number) fila[0]).longValue(), ((Number) fila[1]).intValue());
        }
        return cantidades;
    }
}
