package com.marketroad.soporte.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.marketroad.soporte.model.PersonalSoporte;
import com.marketroad.soporte.model.RolPersonal;
import com.marketroad.soporte.reglas.ReglasTicket;
import com.marketroad.soporte.repository.PersonalSoporteRepository;
import com.marketroad.soporte.validacion.Textos;

class InicializadoresTest {
    @Test
    void adminInicializadorCreaCuentaCuandoFalta() {
        PersonalSoporteRepository repo = mock(PersonalSoporteRepository.class);
        PasswordEncoder encoder = new BCryptPasswordEncoder();
        ReglasTicket reglas = new ReglasTicket();
        ReflectionTestUtils.setField(reglas, "textos", new Textos());

        AdminInicializador inicializador = new AdminInicializador();
        ReflectionTestUtils.setField(inicializador, "personal", repo);
        ReflectionTestUtils.setField(inicializador, "passwordEncoder", encoder);
        ReflectionTestUtils.setField(inicializador, "reglasTicket", reglas);
        ReflectionTestUtils.setField(inicializador, "habilitado", true);
        ReflectionTestUtils.setField(inicializador, "correo", "soporte-admin@marketroad.cl");
        ReflectionTestUtils.setField(inicializador, "contrasena", "Soporte12345");
        ReflectionTestUtils.setField(inicializador, "nombre", "Administrador de soporte");
        when(repo.existsByCorreo("soporte-admin@marketroad.cl")).thenReturn(false);
        when(repo.save(any(PersonalSoporte.class))).thenAnswer(inv -> inv.getArgument(0));

        inicializador.run(new DefaultApplicationArguments(new String[0]));

        verify(repo).save(any(PersonalSoporte.class));
    }

    @Test
    void personalInicializadorCreaCuentasPorDefecto() {
        PersonalSoporteRepository repo = mock(PersonalSoporteRepository.class);
        PasswordEncoder encoder = new BCryptPasswordEncoder();
        ReglasTicket reglas = new ReglasTicket();
        ReflectionTestUtils.setField(reglas, "textos", new Textos());

        PersonalInicializador inicializador = new PersonalInicializador();
        ReflectionTestUtils.setField(inicializador, "personal", repo);
        ReflectionTestUtils.setField(inicializador, "passwordEncoder", encoder);
        ReflectionTestUtils.setField(inicializador, "reglas", reglas);
        ReflectionTestUtils.setField(inicializador, "adminHabilitado", true);
        ReflectionTestUtils.setField(inicializador, "adminCorreo", "soporte-admin@marketroad.cl");
        ReflectionTestUtils.setField(inicializador, "adminContrasena", "Soporte12345");
        ReflectionTestUtils.setField(inicializador, "adminNombre", "Administrador de soporte");
        ReflectionTestUtils.setField(inicializador, "agenteHabilitado", true);
        ReflectionTestUtils.setField(inicializador, "agenteCorreo", "soporte@marketroad.cl");
        ReflectionTestUtils.setField(inicializador, "agenteContrasena", "Agente12345");
        ReflectionTestUtils.setField(inicializador, "agenteNombre", "Agente de soporte");
        when(repo.existsByCorreo(any())).thenReturn(false);
        when(repo.save(any(PersonalSoporte.class))).thenAnswer(inv -> inv.getArgument(0));

        inicializador.run(new DefaultApplicationArguments(new String[0]));

        verify(repo)
                .save(org.mockito.ArgumentMatchers.argThat(p -> ((PersonalSoporte) p).getRol() == RolPersonal.ADMIN));
        verify(repo)
                .save(org.mockito.ArgumentMatchers.argThat(p -> ((PersonalSoporte) p).getRol() == RolPersonal.SOPORTE));
    }
}
