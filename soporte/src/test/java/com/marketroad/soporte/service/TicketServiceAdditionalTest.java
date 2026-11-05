package com.marketroad.soporte.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import com.marketroad.soporte.dto.CrearTicketRequestDTO;
import com.marketroad.soporte.dto.PaginaDTO;
import com.marketroad.soporte.dto.TicketDetalleDTO;
import com.marketroad.soporte.dto.TicketPanelDetalleDTO;
import com.marketroad.soporte.exception.NoAutorizadoException;
import com.marketroad.soporte.exception.OperacionNoPermitidaException;
import com.marketroad.soporte.model.AutorTipo;
import com.marketroad.soporte.model.CategoriaTicket;
import com.marketroad.soporte.model.EstadoTicket;
import com.marketroad.soporte.model.MensajeTicket;
import com.marketroad.soporte.model.PersonalSoporte;
import com.marketroad.soporte.model.PrioridadTicket;
import com.marketroad.soporte.model.RolPersonal;
import com.marketroad.soporte.model.Ticket;
import com.marketroad.soporte.reglas.LimitadorAcciones;
import com.marketroad.soporte.reglas.ReglasTicket;
import com.marketroad.soporte.repository.MensajeTicketRepository;
import com.marketroad.soporte.repository.PersonalSoporteRepository;
import com.marketroad.soporte.repository.TicketRepository;
import com.marketroad.soporte.security.IdentidadPersonal;
import com.marketroad.soporte.security.IdentidadUsuario;
import com.marketroad.soporte.validacion.Textos;

class TicketServiceAdditionalTest {
    private TicketService servicioConMocks() {
        TicketRepository ticketRepo = mock(TicketRepository.class);
        MensajeTicketRepository mensajeRepo = mock(MensajeTicketRepository.class);
        PersonalSoporteRepository personalRepo = mock(PersonalSoporteRepository.class);
        ReglasTicket reglas = new ReglasTicket();
        ReflectionTestUtils.setField(reglas, "textos", new Textos());

        TicketService service = new TicketService();
        ReflectionTestUtils.setField(service, "tickets", ticketRepo);
        ReflectionTestUtils.setField(service, "mensajes", mensajeRepo);
        ReflectionTestUtils.setField(service, "personal", personalRepo);
        ReflectionTestUtils.setField(service, "reglas", reglas);
        ReflectionTestUtils.setField(service, "limitadorMensajes", new LimitadorAcciones(10, 60_000, "Rapido"));
        ReflectionTestUtils.setField(service, "limitadorTickets", new LimitadorAcciones(10, 60_000, "Rapido"));
        return service;
    }

    private Ticket ticketBase(Long id, Long usuarioId, EstadoTicket estado, Long asignadoId) {
        Ticket t = new Ticket();
        ReflectionTestUtils.setField(t, "id", id);
        t.setUsuarioId(usuarioId);
        t.setUsuarioApodo("Cliente");
        t.setUsuarioCorreo("cliente@marketroad.cl");
        t.setAsunto("Asunto");
        t.setCategoria(CategoriaTicket.CUENTA);
        t.setEstado(estado);
        t.setPrioridad(PrioridadTicket.NORMAL);
        t.setAsignadoId(asignadoId);
        t.setFechaCreacion(OffsetDateTime.now().minusDays(1));
        t.setFechaActualizacion(OffsetDateTime.now());
        return t;
    }

    @Test
    void listarDeUsuarioYContarNoLeidos() {
        TicketService service = servicioConMocks();
        TicketRepository ticketRepo = (TicketRepository) ReflectionTestUtils.getField(service, "tickets");
        MensajeTicketRepository mensajeRepo = (MensajeTicketRepository) ReflectionTestUtils.getField(service, "mensajes");

        Ticket ticket = ticketBase(11L, 8L, EstadoTicket.ABIERTO, null);
        when(ticketRepo.findByUsuarioIdOrderByFechaActualizacionDesc(8L)).thenReturn(List.of(ticket));
        when(mensajeRepo.contarNoLeidosPorTicket(List.of(11L), AutorTipo.PERSONAL))
                .thenReturn(List.<Object[]>of(new Object[] { 11L, 2L }));
        when(mensajeRepo.contarNoLeidosDeUsuario(8L, AutorTipo.PERSONAL)).thenReturn(2L);

        var lista = service.listarDeUsuario(new IdentidadUsuario(8L, "Cliente", "cliente@marketroad.cl", "CLIENTE"));
        var noLeidos = service.contarNoLeidos(new IdentidadUsuario(8L, "Cliente", "cliente@marketroad.cl", "CLIENTE"));

        assertEquals(1, lista.size());
        assertEquals(2L, noLeidos.cantidad());
        assertEquals(2L, lista.get(0).noLeidos());
    }

    @Test
    void responderUsuarioYCerrarUsuarioManejanEstados() {
        TicketService service = servicioConMocks();
        TicketRepository ticketRepo = (TicketRepository) ReflectionTestUtils.getField(service, "tickets");
        MensajeTicketRepository mensajeRepo = (MensajeTicketRepository) ReflectionTestUtils.getField(service, "mensajes");

        Ticket ticket = ticketBase(12L, 8L, EstadoTicket.CERRADO, 3L);
        when(ticketRepo.findByIdAndUsuarioId(12L, 8L)).thenReturn(Optional.of(ticket));
        when(mensajeRepo.findByTicketIdOrderByIdAsc(12L)).thenReturn(List.of());
        when(mensajeRepo.countByTicketId(12L)).thenReturn(0L);
        when(mensajeRepo.save(any(MensajeTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThrows(OperacionNoPermitidaException.class,
                () -> service.responderUsuario(12L, "Mensaje", new IdentidadUsuario(8L, "Cliente", "cliente@marketroad.cl", "CLIENTE")));

        ticket.setEstado(EstadoTicket.ABIERTO);
        TicketDetalleDTO detalle = service.cerrarUsuario(12L,
                new IdentidadUsuario(8L, "Cliente", "cliente@marketroad.cl", "CLIENTE"));
        assertEquals(EstadoTicket.CERRADO, ticket.getEstado());
        assertEquals("Asunto", detalle.ticket().asunto());
    }

    @Test
    void listarYObtenerPanelYCambiarPrioridad() {
        TicketService service = servicioConMocks();
        TicketRepository ticketRepo = (TicketRepository) ReflectionTestUtils.getField(service, "tickets");
        MensajeTicketRepository mensajeRepo = (MensajeTicketRepository) ReflectionTestUtils.getField(service, "mensajes");
        PersonalSoporteRepository personalRepo = (PersonalSoporteRepository) ReflectionTestUtils.getField(service, "personal");

        PersonalSoporte personal = new PersonalSoporte();
        ReflectionTestUtils.setField(personal, "id", 5L);
        personal.setNombre("Patricia");
        personal.setCorreo("patricia@marketroad.cl");
        personal.setActivo(true);
        personal.setRol(RolPersonal.SOPORTE);
        when(personalRepo.findAllById(List.of(5L))).thenReturn(List.of(personal));

        Ticket ticket = ticketBase(21L, 3L, EstadoTicket.ABIERTO, 5L);
        when(ticketRepo.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(new PageImpl<>(List.of(ticket)));
        when(mensajeRepo.contarNoLeidosPorTicket(List.of(21L), AutorTipo.USUARIO))
                .thenReturn(List.<Object[]>of(new Object[] { 21L, 1L }));
        when(mensajeRepo.findByTicketIdOrderByIdAsc(21L)).thenReturn(List.of());
        when(ticketRepo.findById(21L)).thenReturn(Optional.of(ticket));

        PaginaDTO<?> pagina = service.listarPanel(new IdentidadPersonal(5L, "Patricia", RolPersonal.SOPORTE), null, null, null, null, null, 0, 20);
        assertEquals(1, pagina.contenido().size());

        TicketPanelDetalleDTO detalle = service.obtenerPanel(21L, new IdentidadPersonal(5L, "Patricia", RolPersonal.SOPORTE));
        assertEquals(21L, detalle.ticket().id());

        TicketPanelDetalleDTO prioridad = service.cambiarPrioridad(21L, "ALTA", new IdentidadPersonal(5L, "Patricia", RolPersonal.SOPORTE));
        assertEquals(PrioridadTicket.ALTA.name(), prioridad.ticket().prioridad());
    }

    @Test
    void tomarYAsignarYRechazarAccionesNoPermitidas() {
        TicketService service = servicioConMocks();
        TicketRepository ticketRepo = (TicketRepository) ReflectionTestUtils.getField(service, "tickets");
        MensajeTicketRepository mensajeRepo = (MensajeTicketRepository) ReflectionTestUtils.getField(service, "mensajes");
        PersonalSoporteRepository personalRepo = (PersonalSoporteRepository) ReflectionTestUtils.getField(service, "personal");

        Ticket ticket = ticketBase(30L, 9L, EstadoTicket.ABIERTO, null);
        when(ticketRepo.findById(30L)).thenReturn(Optional.of(ticket));
        when(mensajeRepo.findByTicketIdOrderByIdAsc(30L)).thenReturn(List.of());
        when(mensajeRepo.countByTicketId(30L)).thenReturn(0L);
        when(mensajeRepo.save(any(MensajeTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        PersonalSoporte destino = new PersonalSoporte();
        ReflectionTestUtils.setField(destino, "id", 7L);
        destino.setNombre("Luis");
        destino.setCorreo("luis@marketroad.cl");
        destino.setActivo(true);
        destino.setRol(RolPersonal.SOPORTE);
        when(personalRepo.findById(7L)).thenReturn(Optional.of(destino));

        TicketPanelDetalleDTO tomado = service.tomar(30L, new IdentidadPersonal(4L, "Ana", RolPersonal.ADMIN));
        assertEquals(4L, ticket.getAsignadoId());
        assertEquals(EstadoTicket.EN_PROGRESO, ticket.getEstado());
        assertEquals(4L, tomado.ticket().asignadoId());

        ticket.setAsignadoId(null);
        ticket.setEstado(EstadoTicket.ABIERTO);
        TicketPanelDetalleDTO asignado = service.asignar(30L, 7L, new IdentidadPersonal(4L, "Ana", RolPersonal.ADMIN));
        assertEquals(7L, asignado.ticket().asignadoId());

        ticket.setAsignadoId(11L);
        ticket.setEstado(EstadoTicket.ABIERTO);
        when(ticketRepo.findById(30L)).thenReturn(Optional.of(ticket));
        assertThrows(com.marketroad.soporte.exception.TicketNoEncontradoException.class,
                () -> service.cambiarEstado(30L, "CERRADO", new IdentidadPersonal(5L, "Patricia", RolPersonal.SOPORTE)));
    }

    @Test
    void crearTicketGuardaMensajeInicialYDevuelveDetalle() {
        TicketService service = servicioConMocks();
        TicketRepository ticketRepo = (TicketRepository) ReflectionTestUtils.getField(service, "tickets");
        MensajeTicketRepository mensajeRepo = (MensajeTicketRepository) ReflectionTestUtils.getField(service, "mensajes");

        when(ticketRepo.countByUsuarioIdAndEstadoIn(eq(8L), any())).thenReturn(0L);
        when(ticketRepo.save(any(Ticket.class))).thenAnswer(inv -> {
            Ticket t = inv.getArgument(0);
            ReflectionTestUtils.setField(t, "id", 99L);
            return t;
        });
        when(mensajeRepo.save(any(MensajeTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        MensajeTicket primero = new MensajeTicket();
        primero.setAutorTipo(AutorTipo.USUARIO);
        primero.setAutorNombre("Cliente");
        primero.setContenido("Necesito ayuda");
        MensajeTicket segundo = new MensajeTicket();
        segundo.setAutorTipo(AutorTipo.SISTEMA);
        segundo.setAutorNombre("Sistema");
        segundo.setContenido("Recibimos tu ticket.");
        when(mensajeRepo.findByTicketIdOrderByIdAsc(99L)).thenReturn(List.of(primero, segundo));

        TicketDetalleDTO detalle = service.crear(
                new IdentidadUsuario(8L, "Cliente", "cliente@marketroad.cl", "CLIENTE"),
                new CrearTicketRequestDTO("Pago", "CUENTA", "Necesito ayuda"));

        assertEquals(99L, detalle.ticket().id());
        assertEquals("Pago", detalle.ticket().asunto());
        assertEquals(2, detalle.mensajes().size());
    }

    @Test
    void responderPanelComoPersonalTomayReabreTicket() {
        TicketService service = servicioConMocks();
        TicketRepository ticketRepo = (TicketRepository) ReflectionTestUtils.getField(service, "tickets");
        MensajeTicketRepository mensajeRepo = (MensajeTicketRepository) ReflectionTestUtils.getField(service, "mensajes");

        Ticket ticket = ticketBase(42L, 4L, EstadoTicket.ABIERTO, 5L);
        when(ticketRepo.findById(42L)).thenReturn(Optional.of(ticket));
        when(mensajeRepo.countByTicketId(42L)).thenReturn(0L);
        when(mensajeRepo.findByTicketIdOrderByIdAsc(42L)).thenReturn(List.of());
        when(mensajeRepo.save(any(MensajeTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        TicketPanelDetalleDTO respuesta = service.responderPanel(42L, "Necesito una actualización",
                new IdentidadPersonal(5L, "Patricia", RolPersonal.SOPORTE));

        assertEquals(42L, respuesta.ticket().id());
        assertEquals(EstadoTicket.EN_PROGRESO, ticket.getEstado());
        assertTrue(respuesta.puedeResponder());
    }
}
