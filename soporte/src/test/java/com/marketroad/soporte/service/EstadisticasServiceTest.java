package com.marketroad.soporte.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.marketroad.soporte.dto.EstadisticasDTO;
import com.marketroad.soporte.model.CategoriaTicket;
import com.marketroad.soporte.model.EstadoTicket;
import com.marketroad.soporte.model.PersonalSoporte;
import com.marketroad.soporte.model.PrioridadTicket;
import com.marketroad.soporte.model.RolPersonal;
import com.marketroad.soporte.reglas.ReglasTicket;
import com.marketroad.soporte.repository.PersonalSoporteRepository;
import com.marketroad.soporte.repository.TicketRepository;
import com.marketroad.soporte.security.IdentidadPersonal;
import com.marketroad.soporte.validacion.Textos;

class EstadisticasServiceTest {

    @Test
    void obtenerResumendeAdminCalculaTotalesYCarga() {
        TicketRepository ticketRepo = mock(TicketRepository.class);
        PersonalSoporteRepository personalRepo = mock(PersonalSoporteRepository.class);
        ReglasTicket reglas = new ReglasTicket();
        ReflectionTestUtils.setField(reglas, "textos", new Textos());

        EstadisticasService service = new EstadisticasService();
        ReflectionTestUtils.setField(service, "tickets", ticketRepo);
        ReflectionTestUtils.setField(service, "personal", personalRepo);
        ReflectionTestUtils.setField(service, "reglas", reglas);

        java.util.ArrayList<Object[]> estado = new java.util.ArrayList<>();
        estado.add(new Object[] {EstadoTicket.ABIERTO, 3L});
        estado.add(new Object[] {EstadoTicket.RESUELTO, 1L});
        java.util.ArrayList<Object[]> categorias = new java.util.ArrayList<>();
        categorias.add(new Object[] {CategoriaTicket.CUENTA, 2L});
        java.util.ArrayList<Object[]> prioridad = new java.util.ArrayList<>();
        prioridad.add(new Object[] {PrioridadTicket.ALTA, 4L});
        prioridad.add(new Object[] {PrioridadTicket.NORMAL, 2L});
        java.util.ArrayList<Object[]> cargas = new java.util.ArrayList<>();
        cargas.add(new Object[] {10L, 5L});
        cargas.add(new Object[] {11L, 1L});
        when(ticketRepo.contarPorEstado()).thenReturn(estado);
        when(ticketRepo.contarPorCategoria()).thenReturn(categorias);
        when(ticketRepo.contarPorPrioridad()).thenReturn(prioridad);
        when(ticketRepo.cargaPorPersonal(anyCollection())).thenReturn(cargas);
        when(ticketRepo.countByAsignadoIdIsNullAndEstadoIn(anyCollection())).thenReturn(2L);
        when(ticketRepo.countByFechaCreacionAfter(any(OffsetDateTime.class))).thenReturn(7L);

        PersonalSoporte p1 = new PersonalSoporte();
        ReflectionTestUtils.setField(p1, "id", 10L); p1.setNombre("Ana"); p1.setCorreo("ana@marketroad.cl"); p1.setActivo(true);
        PersonalSoporte p2 = new PersonalSoporte();
        ReflectionTestUtils.setField(p2, "id", 11L); p2.setNombre("Beto"); p2.setCorreo("beto@marketroad.cl"); p2.setActivo(false);
        when(personalRepo.findAllByOrderByNombreAsc()).thenReturn(List.of(p1, p2));

        EstadisticasDTO dto = service.obtener(new IdentidadPersonal(1L, "Admin", RolPersonal.ADMIN));

        assertEquals(4L, dto.totalTickets());
        assertEquals(2L, dto.sinAsignar());
        assertEquals(7L, dto.creadosUltimos7Dias());
        assertEquals(1L, dto.personalActivo());
        assertEquals(3L, dto.porEstado().get("ABIERTO"));
        assertEquals(2L, dto.porCategoria().get("CUENTA"));
        assertEquals(4L, dto.porPrioridad().get("ALTA"));
        assertEquals(1, dto.carga().size());
        assertEquals(10L, dto.carga().get(0).personalId());
        assertEquals(5L, dto.carga().get(0).ticketsEnCurso());
    }
}
