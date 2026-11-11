package com.marketroad.publication.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.marketroad.publication.dto.AdminPublicacionDTO;
import com.marketroad.publication.dto.ResumenPublicacionesDTO;
import com.marketroad.publication.model.EstadoPublicacion;
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
                                                imagenes.getOrDefault(p.getId(), 0), p.getUnidades()))
                                .toList();
        }

        /**
         * Cuántas publicaciones nuevas hubo y cuántas cerraron en venta en los últimos `dias` días
         * (7 por defecto, máximo 365), más los totales actuales de activas y vendidas.
         */
        @Transactional(readOnly = true)
        public ResumenPublicacionesDTO resumen(Integer dias) {
                int ventana = dias == null ? 7 : dias;
                if (ventana < 1 || ventana > 365) {
                        throw new IllegalArgumentException("Los días deben estar entre 1 y 365");
                }
                OffsetDateTime desde = OffsetDateTime.now().minusDays(ventana);
                return new ResumenPublicacionesDTO(
                                ventana, desde,
                                repository.countByEstadoNotAndFechaCreacionGreaterThanEqual(EstadoPublicacion.ELIMINADA, desde),
                                repository.countByEstadoAndFechaVentaGreaterThanEqual(EstadoPublicacion.VENDIDA, desde),
                                repository.countByEstado(EstadoPublicacion.ACTIVA),
                                repository.countByEstado(EstadoPublicacion.VENDIDA));
        }
}
