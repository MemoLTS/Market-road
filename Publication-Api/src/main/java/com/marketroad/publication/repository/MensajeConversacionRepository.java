package com.marketroad.publication.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.marketroad.publication.model.EstadoOferta;
import com.marketroad.publication.model.MensajeConversacion;
import com.marketroad.publication.model.TipoMensaje;

public interface MensajeConversacionRepository extends JpaRepository<MensajeConversacion, Long> {

    List<MensajeConversacion> findByConversacionIdOrderByIdAsc(Long conversacionId);

    /** Mensajes de la otra persona que este usuario todavía no leyó. */
    List<MensajeConversacion> findByConversacionIdAndRemitenteIdNotAndLeidoFalse(Long conversacionId, Long usuarioId);

    long countByConversacionIdAndRemitenteIdNotAndLeidoFalse(Long conversacionId, Long usuarioId);

    List<MensajeConversacion> findByConversacionIdAndTipoAndEstadoOfertaIn(
            Long conversacionId, TipoMensaje tipo, Collection<EstadoOferta> estados);

    /** Filas [conversacionId, cantidad] de mensajes no leídos por el usuario, para las conversaciones indicadas. */
    @Query("select m.conversacion.id, count(m) from MensajeConversacion m "
            + "where m.conversacion.id in :ids and m.remitenteId <> :usuarioId and m.leido = false "
            + "group by m.conversacion.id")
    List<Object[]> contarNoLeidosPorConversacion(@Param("ids") Collection<Long> ids, @Param("usuarioId") Long usuarioId);

    @Query("select count(m) from MensajeConversacion m "
            + "where m.leido = false and m.remitenteId <> :usuarioId "
            + "and (m.conversacion.compradorId = :usuarioId or m.conversacion.vendedorId = :usuarioId)")
    long contarNoLeidos(@Param("usuarioId") Long usuarioId);
}
