package com.marketroad.soporte.repository;

import java.util.Collection;

import org.springframework.data.jpa.domain.Specification;

import com.marketroad.soporte.model.CategoriaTicket;
import com.marketroad.soporte.model.EstadoTicket;
import com.marketroad.soporte.model.PrioridadTicket;
import com.marketroad.soporte.model.Ticket;

import jakarta.persistence.criteria.Predicate;

/** Filtros combinables para el listado de tickets del panel. */
public final class TicketSpecs {
    private TicketSpecs() {}

    public static Specification<Ticket> todos() {
        return (root, query, cb) -> cb.conjunction();
    }

    /** Lo que ve un integrante con rol SOPORTE: tickets sin asignar y los que lleva él. */
    public static Specification<Ticket> visiblesPara(Long personalId) {
        return (root, query, cb) -> cb.or(cb.isNull(root.get("asignadoId")), cb.equal(root.get("asignadoId"), personalId));
    }

    public static Specification<Ticket> estadoEn(Collection<EstadoTicket> estados) {
        return (root, query, cb) -> root.get("estado").in(estados);
    }

    public static Specification<Ticket> prioridad(PrioridadTicket prioridad) {
        return (root, query, cb) -> cb.equal(root.get("prioridad"), prioridad);
    }

    public static Specification<Ticket> categoria(CategoriaTicket categoria) {
        return (root, query, cb) -> cb.equal(root.get("categoria"), categoria);
    }

    public static Specification<Ticket> asignadoA(Long personalId) {
        return (root, query, cb) -> cb.equal(root.get("asignadoId"), personalId);
    }

    public static Specification<Ticket> sinAsignar() {
        return (root, query, cb) -> cb.isNull(root.get("asignadoId"));
    }

    /** Busca en el asunto y en el apodo de quien lo abrió; si el texto es un número, también por id de ticket. */
    public static Specification<Ticket> busqueda(String texto) {
        String limpio = texto.trim().toLowerCase();
        String patron = "%" + limpio.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
        return (root, query, cb) -> {
            Predicate porTexto = cb.or(
                    cb.like(cb.lower(root.get("asunto")), patron, '\\'),
                    cb.like(cb.lower(root.get("usuarioApodo")), patron, '\\'));
            if (limpio.matches("\\d{1,18}")) {
                return cb.or(porTexto, cb.equal(root.get("id"), Long.valueOf(limpio)));
            }
            return porTexto;
        };
    }
}
