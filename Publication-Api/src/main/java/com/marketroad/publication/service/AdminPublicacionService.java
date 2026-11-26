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
import com.marketroad.publication.exception.PublicacionNoEncontradaException;
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

        /** Deshabilita (sale del catálogo y no admite mensajes) o vuelve a habilitar una publicación activa. */
        @Transactional
        public AdminPublicacionDTO cambiarEstado(Long id, boolean habilitada) {
                Publicacion p = repository.findById(id)
                                .orElseThrow(() -> new PublicacionNoEncontradaException("No se encontró la publicación con id " + id));
                if (p.getEstado() == EstadoPublicacion.VENDIDA || p.getEstado() == EstadoPublicacion.ELIMINADA) {
                        throw new IllegalArgumentException("Solo se puede cambiar el estado de publicaciones activas o deshabilitadas");
                }
                p.setEstado(habilitada ? EstadoPublicacion.ACTIVA : EstadoPublicacion.DESHABILITADA);
                p = repository.save(p);
                int imagenes = mapper.contarImagenes(List.of(p.getId())).getOrDefault(p.getId(), 0);
                return new AdminPublicacionDTO(
                                p.getId(), p.getTitulo(), p.getPrecio(),
                                p.getCategoria().name(), p.getCategoria().getNombre(),
                                p.getUbicacion(), p.getEstado().name(),
                                p.getUsuarioId(), p.getVendedorApodo(),
                                p.getCompradorId(), p.getPrecioVenta(), p.getFechaVenta(),
                                p.getFechaCreacion(), imagenes, p.getUnidades());
        }

        /**
         * Acompaña a User-Api cuando se deshabilita (habilitada=false) o vuelve a habilitar una cuenta: sus
         * publicaciones activas salen del catálogo (o vuelven). Devuelve cuántas cambiaron.
         */
        @Transactional
        public int cambiarEstadoDeUsuario(Long usuarioId, boolean habilitada) {
                EstadoPublicacion desde = habilitada ? EstadoPublicacion.DESHABILITADA : EstadoPublicacion.ACTIVA;
                EstadoPublicacion hacia = habilitada ? EstadoPublicacion.ACTIVA : EstadoPublicacion.DESHABILITADA;
                List<Publicacion> afectadas = repository.findByUsuarioId(usuarioId).stream()
                                .filter(p -> p.getEstado() == desde).toList();
                afectadas.forEach(p -> p.setEstado(hacia));
                repository.saveAll(afectadas);
                return afectadas.size();
        }

        /** Cuando se elimina una cuenta: sus publicaciones dejan de existir (las ya vendidas quedan como registro). */
        @Transactional
        public int retirarDeUsuario(Long usuarioId) {
                List<Publicacion> afectadas = repository.findByUsuarioId(usuarioId).stream()
                                .filter(p -> p.getEstado() != EstadoPublicacion.VENDIDA
                                                && p.getEstado() != EstadoPublicacion.ELIMINADA)
                                .toList();
                afectadas.forEach(p -> p.setEstado(EstadoPublicacion.ELIMINADA));
                repository.saveAll(afectadas);
                return afectadas.size();
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
