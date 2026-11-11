package com.marketroad.soporte.repository;

import static org.junit.jupiter.api.Assertions.*;

import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import com.marketroad.soporte.model.*;

@DataJpaTest
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.datasource.url=jdbc:h2:mem:soporte-test;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_UPPER=false",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa"
})
class RepositoryIntegrationTest {
    @Autowired PersonalSoporteRepository personalRepository;
    @Autowired TicketRepository ticketRepository;
    @Autowired MensajeTicketRepository mensajeRepository;

    @Test
    void repositoryPersonalYTicketExponenLasConsultasPrincipales() {
        PersonalSoporte personal = new PersonalSoporte();
        personal.setNombre("Ana");
        personal.setCorreo("ana");
        personal.setContrasenaHash("hash");
        personal.setRol(RolPersonal.SOPORTE);
        personal.setActivo(true);
        personalRepository.save(personal);

        Ticket ticket1 = new Ticket();
        ticket1.setUsuarioId(10L);
        ticket1.setUsuarioApodo("Usuario");
        ticket1.setUsuarioCorreo("correo1");
        ticket1.setAsunto("Pago");
        ticket1.setCategoria(CategoriaTicket.CUENTA);
        ticket1.setEstado(EstadoTicket.ABIERTO);
        ticket1.setPrioridad(PrioridadTicket.NORMAL);
        ticket1.setAsignadoId(personal.getId());
        ticket1.setFechaCreacion(OffsetDateTime.now().minusDays(1));
        ticket1.setFechaActualizacion(OffsetDateTime.now().minusDays(1));
        ticketRepository.save(ticket1);

        Ticket ticket2 = new Ticket();
        ticket2.setUsuarioId(11L);
        ticket2.setUsuarioApodo("Otro Usuario");
        ticket2.setUsuarioCorreo("correo2");
        ticket2.setAsunto("Soporte");
        ticket2.setCategoria(CategoriaTicket.TECNICO);
        ticket2.setEstado(EstadoTicket.ABIERTO);
        ticket2.setPrioridad(PrioridadTicket.ALTA);
        ticket2.setAsignadoId(null);
        ticket2.setFechaCreacion(OffsetDateTime.now().minusHours(2));
        ticket2.setFechaActualizacion(OffsetDateTime.now().minusHours(2));
        ticketRepository.save(ticket2);

        assertTrue(personalRepository.existsByCorreo("ana"));
        assertTrue(personalRepository.countByRolAndActivoTrue(RolPersonal.SOPORTE) >= 1);
        assertEquals(1L, ticketRepository.countByUsuarioIdAndEstadoIn(10L, List.of(EstadoTicket.ABIERTO, EstadoTicket.EN_PROGRESO)));
        assertEquals(1L, ticketRepository.countByAsignadoIdIsNullAndEstadoIn(List.of(EstadoTicket.ABIERTO, EstadoTicket.EN_PROGRESO)));
        assertTrue(ticketRepository.findByIdAndUsuarioId(ticket1.getId(), 10L).isPresent());
    }

    @Test
    void repositoryMensajesExponenConsultasDeEstadoYLectura() {
        PersonalSoporte personal = new PersonalSoporte();
        personal.setNombre("Soporte");
        personal.setCorreo("soporte");
        personal.setContrasenaHash("hash");
        personal.setRol(RolPersonal.SOPORTE);
        personalRepository.save(personal);

        Ticket ticket = new Ticket();
        ticket.setUsuarioId(3L);
        ticket.setUsuarioApodo("Cliente");
        ticket.setUsuarioCorreo("correo3");
        ticket.setAsunto("Pregunta");
        ticket.setCategoria(CategoriaTicket.CUENTA);
        ticket.setEstado(EstadoTicket.ABIERTO);
        ticket.setPrioridad(PrioridadTicket.NORMAL);
        ticket.setAsignadoId(personal.getId());
        ticket.setFechaCreacion(OffsetDateTime.now());
        ticket.setFechaActualizacion(OffsetDateTime.now());
        ticketRepository.save(ticket);

        MensajeTicket mensaje1 = new MensajeTicket();
        mensaje1.setTicket(ticket);
        mensaje1.setAutorTipo(AutorTipo.USUARIO);
        mensaje1.setAutorId(3L);
        mensaje1.setAutorNombre("Cliente");
        mensaje1.setContenido("Hola");
        mensaje1.setLeido(false);
        mensajeRepository.save(mensaje1);

        MensajeTicket mensaje2 = new MensajeTicket();
        mensaje2.setTicket(ticket);
        mensaje2.setAutorTipo(AutorTipo.PERSONAL);
        mensaje2.setAutorId(personal.getId());
        mensaje2.setAutorNombre("Soporte");
        mensaje2.setContenido("Respuesta");
        mensaje2.setLeido(false);
        mensajeRepository.save(mensaje2);

        assertEquals(2, mensajeRepository.countByTicketId(ticket.getId()));
        assertEquals(1, mensajeRepository.contarNoLeidosDeUsuario(3L, AutorTipo.PERSONAL));
        assertEquals(1, mensajeRepository.contarNoLeidosPorTicket(List.of(ticket.getId()), AutorTipo.USUARIO).size());
        int leidos = mensajeRepository.marcarLeidos(ticket.getId(), AutorTipo.USUARIO);
        assertEquals(1, leidos);
    }

    @Test
    void repositoryPersonalYTicketExponenConsultasExtras() {
        PersonalSoporte personal = new PersonalSoporte();
        personal.setNombre("Berta");
        personal.setCorreo("berta@marketroad.cl");
        personal.setContrasenaHash("hash");
        personal.setRol(RolPersonal.SOPORTE);
        personal.setActivo(true);
        personalRepository.save(personal);

        Ticket ticket = new Ticket();
        ticket.setUsuarioId(44L);
        ticket.setUsuarioApodo("Cliente");
        ticket.setUsuarioCorreo("cliente@marketroad.cl");
        ticket.setAsunto("Cierre");
        ticket.setCategoria(CategoriaTicket.MENSAJES);
        ticket.setEstado(EstadoTicket.ABIERTO);
        ticket.setPrioridad(PrioridadTicket.ALTA);
        ticket.setAsignadoId(personal.getId());
        ticket.setFechaCreacion(OffsetDateTime.now().minusMinutes(5));
        ticket.setFechaActualizacion(OffsetDateTime.now());
        ticketRepository.save(ticket);

        assertTrue(personalRepository.findByCorreo("berta@marketroad.cl").isPresent());
        assertEquals("Berta", personalRepository.findAllByOrderByNombreAsc().get(0).getNombre());
        assertEquals(1L, ticketRepository.countByFechaCreacionAfter(OffsetDateTime.now().minusHours(1)));
        assertEquals(1, ticketRepository.contarPorEstado().size());
        assertEquals(1, ticketRepository.contarPorPrioridad().size());
        assertEquals(1, ticketRepository.cargaPorPersonal(List.of(EstadoTicket.ABIERTO)).size());
    }
}
