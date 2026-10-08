package com.marketroad.publication.service;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import com.marketroad.publication.dto.ModalidadEntregaDTO;
import com.marketroad.publication.dto.PublicacionResponseDTO;
import com.marketroad.publication.model.Publicacion;
import com.marketroad.publication.repository.ImagenPublicacionRepository;

/**
 * Conversión Publicacion -> DTO. Las URLs de imágenes se arman a partir de la cantidad de fotos
 * (las posiciones son siempre 0..n-1), así nunca hay que cargar los bytes de las fotos para listar.
 */
public final class PublicacionMapper {
    private PublicacionMapper() {}

    public static PublicacionResponseDTO aDTO(Publicacion p, int cantidadImagenes, Double distanciaKm) {
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

    public static Map<Long, Integer> contarImagenes(ImagenPublicacionRepository repositorio, Collection<Long> ids) {
        Map<Long, Integer> cantidades = new HashMap<>();
        if (ids.isEmpty()) {
            return cantidades;
        }
        for (Object[] fila : repositorio.contarPorPublicacion(ids)) {
            cantidades.put(((Number) fila[0]).longValue(), ((Number) fila[1]).intValue());
        }
        return cantidades;
    }
}
