package com.marketroad.soporte.repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.marketroad.soporte.model.EstadoTicket;
import com.marketroad.soporte.model.Ticket;

public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {
    List<Ticket> findByUsuarioIdOrderByFechaActualizacionDesc(Long usuarioId);

    Optional<Ticket> findByIdAndUsuarioId(Long id, Long usuarioId);

    /** Tickets no cerrados que lleva una persona del equipo (para liberarlos al desactivar su cuenta). */
    List<Ticket> findByAsignadoIdAndEstadoNot(Long asignadoId, EstadoTicket estado);

    long countByUsuarioIdAndEstadoIn(Long usuarioId, Collection<EstadoTicket> estados);

    long countByAsignadoIdIsNullAndEstadoIn(Collection<EstadoTicket> estados);

    long countByFechaCreacionAfter(OffsetDateTime desde);

    @Query("select t.estado, count(t) from Ticket t group by t.estado")
    List<Object[]> contarPorEstado();

    @Query("select t.categoria, count(t) from Ticket t group by t.categoria")
    List<Object[]> contarPorCategoria();

    @Query("select t.prioridad, count(t) from Ticket t group by t.prioridad")
    List<Object[]> contarPorPrioridad();

    /** Tickets en curso por integrante del equipo. */
    @Query("select t.asignadoId, count(t) from Ticket t "
            + "where t.asignadoId is not null and t.estado in :estados group by t.asignadoId")
    List<Object[]> cargaPorPersonal(@Param("estados") Collection<EstadoTicket> estados);
}
