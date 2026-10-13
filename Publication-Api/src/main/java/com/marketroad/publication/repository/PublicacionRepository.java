package com.marketroad.publication.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.marketroad.publication.model.EstadoPublicacion;
import com.marketroad.publication.model.Publicacion;

public interface PublicacionRepository extends JpaRepository<Publicacion, Long> {
    List<Publicacion> findByEstadoOrderByFechaCreacionDesc(EstadoPublicacion estado);

    /** Publicaciones del usuario, excluyendo las eliminadas. */
    List<Publicacion> findByUsuarioIdAndEstadoNotOrderByFechaCreacionDesc(Long usuarioId, EstadoPublicacion estado);
}
