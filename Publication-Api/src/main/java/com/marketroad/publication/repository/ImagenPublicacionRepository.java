package com.marketroad.publication.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.marketroad.publication.model.ImagenPublicacion;

public interface ImagenPublicacionRepository extends JpaRepository<ImagenPublicacion, Long> {
    Optional<ImagenPublicacion> findByPublicacionIdAndPosicion(Long publicacionId, Integer posicion);

    /** Filas [publicacionId, cantidad de fotos]; no carga los bytes de las imágenes. */
    @Query("select i.publicacion.id, count(i) from ImagenPublicacion i "
            + "where i.publicacion.id in :ids group by i.publicacion.id")
    List<Object[]> contarPorPublicacion(@Param("ids") Collection<Long> ids);
}
