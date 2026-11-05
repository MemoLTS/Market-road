package com.marketroad.soporte.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import com.marketroad.soporte.dto.CrearTicketRequestDTO;
import com.marketroad.soporte.dto.TicketDetalleDTO;
import com.marketroad.soporte.dto.TicketPanelDetalleDTO;
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

class TicketServiceTest {

    @Test
    void crearTicketParaUsuarioGuardaTicketYMensajeSistema() {
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
        ReflectionTestUtils.setField(service, "limitadorMensajes", new LimitadorAcciones(10, 60_000, "Espera un momento"));
        ReflectionTestUtils.setField(service, "limitadorTickets", new LimitadorAcciones(3, 60_000, "Espera un momento"));

        List<MensajeTicket> mensajeGuardado = new java.util.ArrayList<>();
        when(ticketRepo.countByUsuarioIdAndEstadoIn(eq(4L), anyCollection())).thenReturn(0L);
        when(ticketRepo.save(any(Ticket.class))).thenAnswer(inv -> {
            Ticket t = inv.getArgument(0);
            ReflectionTestUtils.setField(t, "id", 22L);
            return t;
        });
        when(mensajeRepo.save(any(MensajeTicket.class))).thenAnswer(inv -> {
            MensajeTicket m = inv.getArgument(0);
            ReflectionTestUtils.setField(m, "id", 30L + mensajeGuardado.size());
            mensajeGuardado.add(m);
            return m;
        });
        when(mensajeRepo.findByTicketIdOrderByIdAsc(22L)).thenReturn(mensajeGuardado);

        TicketDetalleDTO detalle = service.crear(
                new IdentidadUsuario(4L, "Ana", "ana@marketroad.cl", "CLIENTE"),
                new CrearTicketRequestDTO("Pago fallido", "CUENTA", "Necesito ayuda con el pago"));

        assertEquals(22L, detalle.ticket().id());
        assertEquals("Pago fallido", detalle.ticket().asunto());
        assertEquals(2, detalle.mensajes().size());
        assertTrue(detalle.mensajes().stream().anyMatch(m -> m.contenido().contains("Necesito ayuda con el pago")));
    }

    @Test
    void responderPanelActualizaEstadoYAgregaMensaje() {
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
        ReflectionTestUtils.setField(service, "limitadorMensajes", new LimitadorAcciones(10, 60_000, "Espera un momento"));
        ReflectionTestUtils.setField(service, "limitadorTickets", new LimitadorAcciones(3, 60_000, "Espera un momento"));

        Ticket ticket = new Ticket();
        ReflectionTestUtils.setField(ticket, "id", 33L);
        ticket.setUsuarioId(8L);
        ticket.setUsuarioApodo("Cliente");
        ticket.setUsuarioCorreo("cliente@marketroad.cl");
        ticket.setAsunto("Consulta");
        ticket.setCategoria(CategoriaTicket.CUENTA);
        ticket.setEstado(EstadoTicket.ABIERTO);
        ticket.setAsignadoId(9L);
        ticket.setPrioridad(PrioridadTicket.NORMAL);

        MensajeTicket existente = new MensajeTicket();
        existente.setTicket(ticket);
        existente.setAutorTipo(AutorTipo.USUARIO);
        existente.setAutorId(8L);
        existente.setAutorNombre("Cliente");
        existente.setContenido("Hola");
        existente.setLeido(false);

        List<MensajeTicket> guardado = new java.util.ArrayList<>();
        guardado.add(existente);
        when(ticketRepo.findById(33L)).thenReturn(Optional.of(ticket));
        when(mensajeRepo.findByTicketIdOrderByIdAsc(33L)).thenReturn(guardado);
        when(mensajeRepo.countByTicketId(33L)).thenReturn(0L);
        when(mensajeRepo.save(any(MensajeTicket.class))).thenAnswer(inv -> {
            MensajeTicket mensaje = inv.getArgument(0);
            guardado.add(mensaje);
            return mensaje;
        });

        PersonalSoporte personal = new PersonalSoporte();
        ReflectionTestUtils.setField(personal, "id", 9L);
        personal.setNombre("Patricia");
        personal.setCorreo("patricia@marketroad.cl");
        personal.setActivo(true);
        when(personalRepo.findAllById(List.of(9L))).thenReturn(List.of(personal));

        IdentidadPersonal yo = new IdentidadPersonal(9L, "Patricia", RolPersonal.SOPORTE);
        TicketPanelDetalleDTO detalle = service.responderPanel(33L, "Revisaré esto", yo);

        assertEquals(EstadoTicket.EN_PROGRESO, ticket.getEstado());
        assertEquals("Revisaré esto", detalle.mensajes().getLast().contenido());
        assertTrue(detalle.puedeResponder());
    }

    @Test
    void ticketServiceCubreFlujoDeUsuarioYPanel() {
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
        ReflectionTestUtils.setField(service, "limitadorMensajes", new LimitadorAcciones(10, 60_000, "Espera un momento"));
        ReflectionTestUtils.setField(service, "limitadorTickets", new LimitadorAcciones(3, 60_000, "Espera un momento"));

        assertEquals(6, service.categorias().size());

        Ticket usuarioTicket = new Ticket();
        ReflectionTestUtils.setField(usuarioTicket, "id", 44L);
        usuarioTicket.setUsuarioId(8L);
        usuarioTicket.setUsuarioApodo("Cliente");
        usuarioTicket.setUsuarioCorreo("cliente@marketroad.cl");
        usuarioTicket.setAsunto("Pago fallido");
        usuarioTicket.setCategoria(CategoriaTicket.CUENTA);
        usuarioTicket.setEstado(EstadoTicket.ABIERTO);
        usuarioTicket.setPrioridad(PrioridadTicket.NORMAL);
        when(ticketRepo.findByUsuarioIdOrderByFechaActualizacionDesc(8L)).thenReturn(List.of(usuarioTicket));
        java.util.ArrayList<Object[]> noLeidosUsuario = new java.util.ArrayList<>();
        noLeidosUsuario.add(new Object[] {44L, 1L});
        when(mensajeRepo.contarNoLeidosPorTicket(List.of(44L), AutorTipo.PERSONAL)).thenReturn(noLeidosUsuario);
        when(mensajeRepo.contarNoLeidosDeUsuario(8L, AutorTipo.PERSONAL)).thenReturn(2L);
        when(ticketRepo.findByIdAndUsuarioId(44L, 8L)).thenReturn(Optional.of(usuarioTicket));

        var resumenUsuario = service.listarDeUsuario(new IdentidadUsuario(8L, "Cliente", "cliente@marketroad.cl", "CLIENTE"));
        assertEquals(1, resumenUsuario.size());
        assertEquals(1L, resumenUsuario.get(0).noLeidos());
        assertEquals(2L, service.contarNoLeidos(new IdentidadUsuario(8L, "Cliente", "cliente@marketroad.cl", "CLIENTE")).cantidad());

        MensajeTicket respuesta = new MensajeTicket();
        respuesta.setTicket(usuarioTicket);
        respuesta.setAutorTipo(AutorTipo.USUARIO);
        respuesta.setAutorId(8L);
        respuesta.setAutorNombre("Cliente");
        respuesta.setContenido("Necesito ayuda");
        respuesta.setLeido(false);
        when(mensajeRepo.findByTicketIdOrderByIdAsc(44L)).thenReturn(List.of(respuesta));
        when(mensajeRepo.countByTicketId(44L)).thenReturn(0L);
        when(mensajeRepo.save(any(MensajeTicket.class))).thenAnswer(inv -> inv.getArgument(0));
        var detalleUsuario = service.obtenerDeUsuario(44L, new IdentidadUsuario(8L, "Cliente", "cliente@marketroad.cl", "CLIENTE"));
        assertEquals("Pago fallido", detalleUsuario.ticket().asunto());

        var detalleRespuesta = service.responderUsuario(44L, "Necesito ayuda", new IdentidadUsuario(8L, "Cliente", "cliente@marketroad.cl", "CLIENTE"));
        assertTrue(detalleRespuesta.ticket().estado().contains("ABIERTO") || detalleRespuesta.ticket().estado().contains("ABIERTO"));

        var detalleCierre = service.cerrarUsuario(44L, new IdentidadUsuario(8L, "Cliente", "cliente@marketroad.cl", "CLIENTE"));
        assertEquals(EstadoTicket.CERRADO, usuarioTicket.getEstado());
        assertEquals("Pago fallido", detalleCierre.ticket().asunto());

        PersonalSoporte soporte = new PersonalSoporte();
        ReflectionTestUtils.setField(soporte, "id", 9L);
        soporte.setNombre("Patricia");
        soporte.setCorreo("patricia@marketroad.cl");
        soporte.setActivo(true);
        soporte.setRol(RolPersonal.SOPORTE);
        when(personalRepo.findAllById(List.of(9L))).thenReturn(List.of(soporte));

        Ticket panelTicket = new Ticket();
        ReflectionTestUtils.setField(panelTicket, "id", 55L);
        panelTicket.setUsuarioId(12L);
        panelTicket.setUsuarioApodo("Usuario");
        panelTicket.setUsuarioCorreo("usuario@marketroad.cl");
        panelTicket.setAsunto("Error");
        panelTicket.setCategoria(CategoriaTicket.CUENTA);
        panelTicket.setEstado(EstadoTicket.ABIERTO);
        panelTicket.setAsignadoId(null);
        panelTicket.setPrioridad(PrioridadTicket.NORMAL);
        when(ticketRepo.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(new PageImpl<>(List.of(panelTicket), PageRequest.of(0, 10), 1));
        java.util.ArrayList<Object[]> noLeidosPanel = new java.util.ArrayList<>();
        noLeidosPanel.add(new Object[] {55L, 2L});
        when(mensajeRepo.contarNoLeidosPorTicket(List.of(55L), AutorTipo.USUARIO)).thenReturn(noLeidosPanel);
        when(ticketRepo.findById(55L)).thenReturn(Optional.of(panelTicket));
        java.util.ArrayList<Object[]> estados = new java.util.ArrayList<>();
        estados.add(new Object[] {EstadoTicket.ABIERTO, 2L});
        estados.add(new Object[] {EstadoTicket.CERRADO, 1L});
        when(ticketRepo.contarPorEstado()).thenReturn(estados);
        when(ticketRepo.countByAsignadoIdIsNullAndEstadoIn(anyCollection())).thenReturn(1L);

        var pagina = service.listarPanel(new IdentidadPersonal(9L, "Patricia", RolPersonal.SOPORTE), null, null, null, null, null, 0, 10);
        assertEquals(1, pagina.contenido().size());
        assertEquals(55L, pagina.contenido().get(0).id());

        var detallePanel = service.obtenerPanel(55L, new IdentidadPersonal(9L, "Patricia", RolPersonal.SOPORTE));
        assertEquals("Error", detallePanel.ticket().asunto());
        assertTrue(detallePanel.puedeTomar());

        var tomado = service.tomar(55L, new IdentidadPersonal(9L, "Patricia", RolPersonal.SOPORTE));
        assertEquals(9L, panelTicket.getAsignadoId());
        assertEquals(EstadoTicket.EN_PROGRESO, panelTicket.getEstado());
        assertEquals("Error", tomado.ticket().asunto());

        var estadoCambiado = service.cambiarEstado(55L, "RESUELTO", new IdentidadPersonal(9L, "Patricia", RolPersonal.SOPORTE));
        assertEquals(EstadoTicket.RESUELTO, panelTicket.getEstado());
        assertEquals("Error", estadoCambiado.ticket().asunto());

        var prioridadCambiada = service.cambiarPrioridad(55L, "ALTA", new IdentidadPersonal(9L, "Patricia", RolPersonal.SOPORTE));
        assertEquals(PrioridadTicket.ALTA, panelTicket.getPrioridad());
        assertEquals("Error", prioridadCambiada.ticket().asunto());

        when(personalRepo.findById(7L)).thenReturn(Optional.of(new PersonalSoporte()));
        when(ticketRepo.findById(55L)).thenReturn(Optional.of(panelTicket));
        var superusuario = service.obtenerParaSuperusuario(55L);
        assertEquals("Error", superusuario.ticket().asunto());
        assertEquals(1L, service.resumenParaSuperusuario().sinAsignar());

        service.asignar(55L, null, new IdentidadPersonal(1L, "Admin", RolPersonal.ADMIN));
        assertNull(panelTicket.getAsignadoId());
    }
}
