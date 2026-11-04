package com.marketroad.publication.service;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.marketroad.publication.dto.TicketSoporteDTO;
import com.marketroad.publication.dto.TicketSoporteRequestDTO;
import com.marketroad.publication.dto.TicketSoporteRespuestaDTO;
import com.marketroad.publication.exception.NoAutorizadoException;
import com.marketroad.publication.exception.OperacionNoPermitidaException;
import com.marketroad.publication.exception.TicketNoEncontradoException;
import com.marketroad.publication.model.EstadoTicket;
import com.marketroad.publication.model.TicketSoporte;
import com.marketroad.publication.repository.TicketSoporteRepository;
import com.marketroad.publication.security.Identidad;
import com.marketroad.publication.validacion.Textos;

@Service
public class SoporteService {
    public static final int MAXIMO_ABIERTOS = 5;

    @Autowired
    private TicketSoporteRepository tickets;

    @Transactional
    public TicketSoporteDTO crear(TicketSoporteRequestDTO datos, Identidad identidad) {
        String asunto = Textos.limpiar(datos.asunto(), false, "El asunto");
        String descripcion = Textos.limpiar(datos.descripcion(), true, "La descripción");
        if (asunto.length() < 3 || asunto.length() > 100) {
            throw new IllegalArgumentException("El asunto debe tener entre 3 y 100 caracteres");
        }
        if (descripcion.length() < 10 || descripcion.length() > 1000) {
            throw new IllegalArgumentException("La descripción debe tener entre 10 y 1000 caracteres");
        }
        if (tickets.countByUsuarioIdAndEstadoNot(identidad.usuarioId(), EstadoTicket.RESUELTO) >= MAXIMO_ABIERTOS) {
            throw new OperacionNoPermitidaException("Ya tienes " + MAXIMO_ABIERTOS
                    + " solicitudes sin resolver. Espera la respuesta de soporte antes de enviar otra");
        }
        TicketSoporte ticket = new TicketSoporte();
        ticket.setUsuarioId(identidad.usuarioId());
        ticket.setUsuarioApodo(identidad.apodo());
        ticket.setCategoria(datos.categoria());
        ticket.setAsunto(asunto);
        ticket.setDescripcion(descripcion);
        return aDto(tickets.save(ticket));
    }

    @Transactional(readOnly = true)
    public List<TicketSoporteDTO> listarDelUsuario(Identidad identidad) {
        return tickets.findByUsuarioIdOrderByFechaCreacionDesc(identidad.usuarioId()).stream()
                .map(SoporteService::aDto).toList();
    }

    @Transactional(readOnly = true)
    public List<TicketSoporteDTO> listarTodos(Identidad identidad) {
        exigirSuperusuario(identidad);
        return tickets.findAll(Sort.by(Sort.Direction.DESC, "fechaCreacion")).stream()
                .map(SoporteService::aDto).toList();
    }

    @Transactional
    public TicketSoporteDTO responder(Long id, TicketSoporteRespuestaDTO datos, Identidad identidad) {
        exigirSuperusuario(identidad);
        TicketSoporte ticket = tickets.findById(id)
                .orElseThrow(() -> new TicketNoEncontradoException("La solicitud de soporte no existe"));
        String respuesta = datos.respuesta() == null ? "" : Textos.limpiar(datos.respuesta(), true, "La respuesta");
        if (datos.estado() == EstadoTicket.RESUELTO && respuesta.isEmpty() && ticket.getRespuesta() == null) {
            throw new IllegalArgumentException("Escribe una respuesta antes de marcar la solicitud como resuelta");
        }
        if (!respuesta.isEmpty()) {
            ticket.setRespuesta(respuesta);
            ticket.setFechaRespuesta(OffsetDateTime.now());
        }
        ticket.setEstado(datos.estado());
        return aDto(tickets.save(ticket));
    }

    private static void exigirSuperusuario(Identidad identidad) {
        if (!identidad.esSuperusuario()) {
            throw new NoAutorizadoException("Acceso restringido al superusuario");
        }
    }

    static TicketSoporteDTO aDto(TicketSoporte t) {
        return new TicketSoporteDTO(t.getId(), t.getUsuarioId(), t.getUsuarioApodo(),
                t.getCategoria().name(), t.getCategoria().getNombre(), t.getAsunto(), t.getDescripcion(),
                t.getEstado().name(), t.getRespuesta(), t.getFechaRespuesta(), t.getFechaCreacion());
    }
}
