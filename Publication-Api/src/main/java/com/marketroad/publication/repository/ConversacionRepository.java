package com.marketroad.publication.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.marketroad.publication.model.Conversacion;

public interface ConversacionRepository extends JpaRepository<Conversacion, Long> {

    Optional<Conversacion> findByPublicacionIdAndCompradorId(Long publicacionId, Long compradorId);

    List<Conversacion> findByPublicacionId(Long publicacionId);

    @Query("select c from Conversacion c join fetch c.publicacion where c.id = :id")
    Optional<Conversacion> findConPublicacion(@Param("id") Long id);

    @Query("select c from Conversacion c join fetch c.publicacion "
            + "where c.compradorId = :usuarioId or c.vendedorId = :usuarioId "
            + "order by c.ultimaActividad desc")
    List<Conversacion> findDelUsuario(@Param("usuarioId") Long usuarioId);
}
