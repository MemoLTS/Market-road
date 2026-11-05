package com.marketroad.soporte.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.marketroad.soporte.dto.ActualizarPersonalRequestDTO;
import com.marketroad.soporte.dto.CambiarContrasenaRequestDTO;
import com.marketroad.soporte.dto.CrearPersonalRequestDTO;
import com.marketroad.soporte.dto.LoginRequestDTO;
import com.marketroad.soporte.dto.PersonalDTO;
import com.marketroad.soporte.exception.CredencialesInvalidasException;
import com.marketroad.soporte.exception.PersonalNoEncontradoException;
import com.marketroad.soporte.exception.OperacionNoPermitidaException;
import com.marketroad.soporte.model.EstadoTicket;
import com.marketroad.soporte.model.PersonalSoporte;
import com.marketroad.soporte.model.RolPersonal;
import com.marketroad.soporte.model.Ticket;
import com.marketroad.soporte.reglas.LimitadorAcciones;
import com.marketroad.soporte.reglas.ReglasTicket;
import com.marketroad.soporte.repository.PersonalSoporteRepository;
import com.marketroad.soporte.repository.TicketRepository;
import com.marketroad.soporte.security.IdentidadPersonal;
import com.marketroad.soporte.security.JwtPersonalUtil;
import com.marketroad.soporte.validacion.Textos;

class PersonalServiceTest {

    @Test
    void loginAceptaCredencialesValidasYActualizaUltimoAcceso() {
        PersonalSoporteRepository personalRepo = mock(PersonalSoporteRepository.class);
        TicketRepository ticketRepo = mock(TicketRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        ReglasTicket reglas = new ReglasTicket();
        ReflectionTestUtils.setField(reglas, "textos", new Textos());
        JwtPersonalUtil jwt = mock(JwtPersonalUtil.class);
        LimitadorAcciones limitadorLogin = new LimitadorAcciones(3, 60_000, "Intenta más tarde");

        PersonalService service = new PersonalService();
        ReflectionTestUtils.setField(service, "personal", personalRepo);
        ReflectionTestUtils.setField(service, "tickets", ticketRepo);
        ReflectionTestUtils.setField(service, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(service, "reglas", reglas);
        ReflectionTestUtils.setField(service, "jwt", jwt);
        ReflectionTestUtils.setField(service, "limitadorLogin", limitadorLogin);

        when(passwordEncoder.encode(anyString())).thenAnswer(inv -> "hash-" + inv.getArgument(0));
        service.inicializar();

        PersonalSoporte cuenta = new PersonalSoporte();
        ReflectionTestUtils.setField(cuenta, "id", 7L);
        cuenta.setNombre("Ana");
        cuenta.setCorreo("ana@marketroad.cl");
        cuenta.setContrasenaHash("hash-guardado");
        cuenta.setRol(RolPersonal.SOPORTE);
        cuenta.setActivo(true);

        when(personalRepo.findByCorreo("ana@marketroad.cl")).thenReturn(Optional.of(cuenta));
        when(passwordEncoder.matches("Clave123", "hash-guardado")).thenReturn(true);
        when(jwt.generarToken(7L)).thenReturn("token-123");
        when(jwt.getExpiracionMs()).thenReturn(1_234L);

        var respuesta = service.login(new LoginRequestDTO("ana@marketroad.cl", "Clave123"));

        assertEquals("token-123", respuesta.token());
        assertEquals(1_234L, respuesta.expiraEnMs());
        assertEquals("Ana", respuesta.personal().nombre());
        assertNotNull(cuenta.getUltimoAcceso());
    }

    @Test
    void listarParaAdminDevuelveCargaPorPersonal() {
        PersonalSoporteRepository personalRepo = mock(PersonalSoporteRepository.class);
        TicketRepository ticketRepo = mock(TicketRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        ReglasTicket reglas = new ReglasTicket();
        ReflectionTestUtils.setField(reglas, "textos", new Textos());
        JwtPersonalUtil jwt = mock(JwtPersonalUtil.class);
        LimitadorAcciones limitadorLogin = new LimitadorAcciones(3, 60_000, "Intenta más tarde");

        PersonalService service = new PersonalService();
        ReflectionTestUtils.setField(service, "personal", personalRepo);
        ReflectionTestUtils.setField(service, "tickets", ticketRepo);
        ReflectionTestUtils.setField(service, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(service, "reglas", reglas);
        ReflectionTestUtils.setField(service, "jwt", jwt);
        ReflectionTestUtils.setField(service, "limitadorLogin", limitadorLogin);

        PersonalSoporte p1 = new PersonalSoporte();
        ReflectionTestUtils.setField(p1, "id", 10L); p1.setNombre("Ana"); p1.setCorreo("ana@marketroad.cl"); p1.setRol(RolPersonal.ADMIN); p1.setActivo(true);
        PersonalSoporte p2 = new PersonalSoporte();
        ReflectionTestUtils.setField(p2, "id", 11L); p2.setNombre("Beto"); p2.setCorreo("beto@marketroad.cl"); p2.setRol(RolPersonal.SOPORTE); p2.setActivo(true);

        java.util.ArrayList<Object[]> cargas = new java.util.ArrayList<>();
        cargas.add(new Object[] {10L, 3L});
        cargas.add(new Object[] {11L, 1L});
        when(ticketRepo.cargaPorPersonal(anyCollection())).thenReturn(cargas);
        when(personalRepo.findAllByOrderByNombreAsc()).thenReturn(List.of(p1, p2));

        List<PersonalDTO> resultado = service.listar(new IdentidadPersonal(99L, "Admin", RolPersonal.ADMIN));

        assertEquals(2, resultado.size());
        assertTrue(resultado.stream().anyMatch(p -> p.id().equals(10L) && p.ticketsEnCurso() == 3));
        assertTrue(resultado.stream().anyMatch(p -> p.id().equals(11L) && p.ticketsEnCurso() == 1));
    }

    @Test
    void personalServiceCubreRamasDeLoginYEdicion() {
        PersonalSoporteRepository personalRepo = mock(PersonalSoporteRepository.class);
        TicketRepository ticketRepo = mock(TicketRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        ReglasTicket reglas = new ReglasTicket();
        ReflectionTestUtils.setField(reglas, "textos", new Textos());
        JwtPersonalUtil jwt = mock(JwtPersonalUtil.class);
        LimitadorAcciones limitadorLogin = new LimitadorAcciones(3, 60_000, "Intenta más tarde");

        PersonalService service = new PersonalService();
        ReflectionTestUtils.setField(service, "personal", personalRepo);
        ReflectionTestUtils.setField(service, "tickets", ticketRepo);
        ReflectionTestUtils.setField(service, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(service, "reglas", reglas);
        ReflectionTestUtils.setField(service, "jwt", jwt);
        ReflectionTestUtils.setField(service, "limitadorLogin", limitadorLogin);
        when(passwordEncoder.encode(anyString())).thenAnswer(inv -> "hash-" + inv.getArgument(0));
        service.inicializar();

        PersonalSoporte cuenta = new PersonalSoporte();
        ReflectionTestUtils.setField(cuenta, "id", 7L);
        cuenta.setNombre("Ana");
        cuenta.setCorreo("ana@marketroad.cl");
        cuenta.setContrasenaHash("hash-guardado");
        cuenta.setRol(RolPersonal.ADMIN);
        cuenta.setActivo(true);

        when(personalRepo.findByCorreo("ana@marketroad.cl")).thenReturn(Optional.of(cuenta));
        when(passwordEncoder.matches("Clave123", "hash-guardado")).thenReturn(true);
        when(jwt.generarToken(7L)).thenReturn("token-123");
        when(jwt.getExpiracionMs()).thenReturn(1_234L);

        var login = service.login(new LoginRequestDTO("ana@marketroad.cl", "Clave123"));
        assertEquals("token-123", login.token());
        assertEquals("Ana", login.personal().nombre());
        assertNotNull(cuenta.getUltimoAcceso());

        when(personalRepo.findById(7L)).thenReturn(Optional.of(cuenta));
        when(passwordEncoder.matches("ClaveActual123", "hash-guardado")).thenReturn(true);
        when(passwordEncoder.encode("ClaveNueva123")).thenReturn("hash-nueva");
        service.cambiarContrasenaPropia(new IdentidadPersonal(7L, "Ana", RolPersonal.ADMIN),
                new CambiarContrasenaRequestDTO("ClaveActual123", "ClaveNueva123"));
        assertEquals("hash-nueva", cuenta.getContrasenaHash());

        when(personalRepo.findById(7L)).thenReturn(Optional.of(cuenta));
        var yo = service.yo(new IdentidadPersonal(7L, "Ana", RolPersonal.ADMIN));
        assertEquals("ana@marketroad.cl", yo.correo());

        when(personalRepo.existsByCorreo("nueva@marketroad.cl")).thenReturn(false);
        when(passwordEncoder.encode("Clave1234")).thenReturn("hash-creado");
        when(personalRepo.save(any(PersonalSoporte.class))).thenAnswer(inv -> {
            PersonalSoporte guardado = inv.getArgument(0);
            ReflectionTestUtils.setField(guardado, "id", 42L);
            return guardado;
        });
        var creado = service.crear(new IdentidadPersonal(99L, "Admin", RolPersonal.ADMIN),
                new CrearPersonalRequestDTO("Nora", "nueva@marketroad.cl", "Clave1234", "SOPORTE"));
        assertEquals("Nora", creado.nombre());
        assertEquals("SOPORTE", creado.rol());

        PersonalSoporte admin = new PersonalSoporte();
        ReflectionTestUtils.setField(admin, "id", 9L);
        admin.setNombre("Admin");
        admin.setCorreo("admin@marketroad.cl");
        admin.setRol(RolPersonal.ADMIN);
        admin.setActivo(true);
        when(personalRepo.findById(9L)).thenReturn(Optional.of(admin));
        when(personalRepo.countByRolAndActivoTrue(RolPersonal.ADMIN)).thenReturn(2L);
        Ticket ticket = new Ticket();
        ticket.setAsignadoId(9L);
        ticket.setEstado(EstadoTicket.EN_PROGRESO);
        when(ticketRepo.findByAsignadoIdAndEstadoNot(9L, EstadoTicket.CERRADO)).thenReturn(List.of(ticket));
        service.actualizar(new IdentidadPersonal(1L, "Admin", RolPersonal.ADMIN), 9L,
                new ActualizarPersonalRequestDTO("Admin modificado", "SOPORTE", false, null));
        assertEquals(RolPersonal.SOPORTE, admin.getRol());
        assertFalse(admin.isActivo());
        assertNull(ticket.getAsignadoId());
        assertEquals(EstadoTicket.ABIERTO, ticket.getEstado());

        when(personalRepo.findById(9L)).thenReturn(Optional.of(admin));
        assertThrows(OperacionNoPermitidaException.class,
                () -> service.actualizar(new IdentidadPersonal(9L, "Admin", RolPersonal.ADMIN), 9L,
                        new ActualizarPersonalRequestDTO("Admin", "ADMIN", false, null)));

        when(personalRepo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(PersonalNoEncontradoException.class, () -> service.yo(new IdentidadPersonal(99L, "X", RolPersonal.ADMIN)));

        assertThrows(CredencialesInvalidasException.class,
                () -> service.login(new LoginRequestDTO("ana@marketroad.cl", "ClaveError")));
    }
}
