package com.marketroad.publication.repository;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.marketroad.publication.model.EstadoPublicacion;
import com.marketroad.publication.model.Publicacion;

public interface PublicacionRepository extends JpaRepository<Publicacion, Long> {
    List<Publicacion> findByEstadoOrderByFechaCreacionDesc(EstadoPublicacion estado);

    List<Publicacion> findByUsuarioIdAndEstadoNotOrderByFechaCreacionDesc(Long usuarioId, EstadoPublicacion estado);

    long countByEstado(EstadoPublicacion estado);

    /** Publicaciones creadas desde `desde`, excluyendo un estado (las eliminadas). */
    long countByEstadoNotAndFechaCreacionGreaterThanEqual(EstadoPublicacion estado, OffsetDateTime desde);

    /** Publicaciones en `estado` cuya venta se cerró desde `desde`. */
    long countByEstadoAndFechaVentaGreaterThanEqual(EstadoPublicacion estado, OffsetDateTime desde);
}
