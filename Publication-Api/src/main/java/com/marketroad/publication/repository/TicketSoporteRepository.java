package com.marketroad.publication.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.marketroad.publication.model.EstadoTicket;
import com.marketroad.publication.model.TicketSoporte;

public interface TicketSoporteRepository extends JpaRepository<TicketSoporte, Long> {

    List<TicketSoporte> findByUsuarioIdOrderByFechaCreacionDesc(Long usuarioId);

    long countByUsuarioIdAndEstadoNot(Long usuarioId, EstadoTicket estado);
}
