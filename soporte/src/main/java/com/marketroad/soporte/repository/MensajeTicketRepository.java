package com.marketroad.soporte.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.marketroad.soporte.model.AutorTipo;
import com.marketroad.soporte.model.MensajeTicket;

public interface MensajeTicketRepository extends JpaRepository<MensajeTicket, Long> {
    List<MensajeTicket> findByTicketIdOrderByIdAsc(Long ticketId);

    long countByTicketId(Long ticketId);

    /** Marca como leídos los mensajes de un autor (USUARIO o PERSONAL) en un ticket. */
    @Modifying(flushAutomatically = true)
    @Query("update MensajeTicket m set m.leido = true "
            + "where m.ticket.id = :ticketId and m.autorTipo = :tipo and m.leido = false")
    int marcarLeidos(@Param("ticketId") Long ticketId, @Param("tipo") AutorTipo tipo);

    /** Mensajes sin leer por ticket, para una lista de tickets: filas [ticketId, cantidad]. */
    @Query("select m.ticket.id, count(m) from MensajeTicket m "
            + "where m.ticket.id in :ids and m.autorTipo = :tipo and m.leido = false group by m.ticket.id")
    List<Object[]> contarNoLeidosPorTicket(@Param("ids") Collection<Long> ids, @Param("tipo") AutorTipo tipo);

    /** Respuestas del personal que la persona usuaria todavía no leyó (para el aviso en la barra superior). */
    @Query("select count(m) from MensajeTicket m "
            + "where m.ticket.usuarioId = :usuarioId and m.autorTipo = :tipo and m.leido = false")
    long contarNoLeidosDeUsuario(@Param("usuarioId") Long usuarioId, @Param("tipo") AutorTipo tipo);
}
