package com.marketroad.publication.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record PublicacionResponseDTO(
                Long id,
                String titulo,
                BigDecimal precio,
                String descripcion,
                String ubicacion,
                String categoria,
                String categoriaNombre,
                List<ModalidadEntregaDTO> modalidadesEntrega,
                Double latitud,
                Double longitud,
                Double distanciaKm,
                Long usuarioId,
                String vendedorApodo,
                String estado,
                OffsetDateTime fechaCreacion,
                List<String> imagenUrls,
                int unidades) {

        /** Sin unidades indicadas (equivale a 1). */
        public PublicacionResponseDTO(Long id, String titulo, BigDecimal precio, String descripcion, String ubicacion,
                        String categoria, String categoriaNombre, List<ModalidadEntregaDTO> modalidadesEntrega,
                        Double latitud, Double longitud, Double distanciaKm, Long usuarioId, String vendedorApodo,
                        String estado, OffsetDateTime fechaCreacion, List<String> imagenUrls) {
                this(id, titulo, precio, descripcion, ubicacion, categoria, categoriaNombre, modalidadesEntrega,
                                latitud, longitud, distanciaKm, usuarioId, vendedorApodo, estado, fechaCreacion,
                                imagenUrls, 1);
        }
}
