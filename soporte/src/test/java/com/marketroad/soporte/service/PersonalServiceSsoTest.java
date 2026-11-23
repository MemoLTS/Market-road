package com.marketroad.soporte.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.marketroad.soporte.exception.NoAutorizadoException;
import com.marketroad.soporte.model.PersonalSoporte;
import com.marketroad.soporte.model.RolPersonal;
import com.marketroad.soporte.reglas.ReglasTicket;
import com.marketroad.soporte.repository.PersonalSoporteRepository;
import com.marketroad.soporte.security.IdentidadUsuario;
import com.marketroad.soporte.security.JwtPersonalUtil;
import com.marketroad.soporte.validacion.Textos;

/** Entrada al panel con el token de la persona usuaria (sin volver a iniciar sesión). */
class PersonalServiceSsoTest {

    private PersonalSoporteRepository repo;
    private JwtPersonalUtil jwt;
    private PersonalService service;

    @BeforeEach
    void preparar() {
        repo = mock(PersonalSoporteRepository.class);
        jwt = mock(JwtPersonalUtil.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        ReglasTicket reglas = new ReglasTicket();
        ReflectionTestUtils.setField(reglas, "textos", new Textos());
        when(encoder.encode(anyString())).thenAnswer(i -> "hash-" + i.getArgument(0));
        when(repo.save(any(PersonalSoporte.class))).thenAnswer(i -> {
            PersonalSoporte p = i.getArgument(0);
            if (p.getId() == null) {
                ReflectionTestUtils.setField(p, "id", 50L);
            }
            return p;
        });
        when(jwt.generarToken(any())).thenAnswer(i -> "token-del-panel-" + i.getArgument(0));
        when(jwt.getExpiracionMs()).thenReturn(28_800_000L);
        service = new PersonalService();
        ReflectionTestUtils.setField(service, "personal", repo);
        ReflectionTestUtils.setField(service, "passwordEncoder", encoder);
        ReflectionTestUtils.setField(service, "reglas", reglas);
        ReflectionTestUtils.setField(service, "jwt", jwt);
    }

    @Test
    void elSuperusuarioEntraSinContrasenaYSuCuentaDelEquipoSeCreaSola() {
        when(repo.findByCorreo("admin@marketroad.local")).thenReturn(Optional.empty());

        var r = service.loginConUsuario(new IdentidadUsuario(23L, "superadmin", "Admin@MarketRoad.local", "SUPERUSUARIO"));

        ArgumentCaptor<PersonalSoporte> guardada = ArgumentCaptor.forClass(PersonalSoporte.class);
        verify(repo).save(guardada.capture());
        assertEquals("admin@marketroad.local", guardada.getValue().getCorreo());
        assertEquals("superadmin", guardada.getValue().getNombre());
        assertEquals(RolPersonal.ADMIN, guardada.getValue().getRol());
        assertTrue(guardada.getValue().isActivo());
        assertEquals("token-del-panel-50", r.token());
        assertEquals(28_800_000L, r.expiraEnMs());
    }

    @Test
    void siYaTieneCuentaDelEquipoLaUsaYRespetaSuRol() {
        PersonalSoporte existente = new PersonalSoporte();
        ReflectionTestUtils.setField(existente, "id", 9L);
        existente.setNombre("Sol");
        existente.setCorreo("admin@marketroad.local");
        existente.setRol(RolPersonal.SOPORTE);
        existente.setActivo(true);
        when(repo.findByCorreo("admin@marketroad.local")).thenReturn(Optional.of(existente));

        var r = service.loginConUsuario(new IdentidadUsuario(23L, "superadmin", "admin@marketroad.local", "SUPERUSUARIO"));

        assertEquals("token-del-panel-9", r.token());
        assertEquals(RolPersonal.SOPORTE, existente.getRol());
        assertTrue(existente.getUltimoAcceso() != null);
    }

    @Test
    void unaCuentaDesactivadaNoEntra() {
        PersonalSoporte existente = new PersonalSoporte();
        ReflectionTestUtils.setField(existente, "id", 9L);
        existente.setCorreo("admin@marketroad.local");
        existente.setActivo(false);
        when(repo.findByCorreo("admin@marketroad.local")).thenReturn(Optional.of(existente));

        assertThrows(NoAutorizadoException.class,
                () -> service.loginConUsuario(new IdentidadUsuario(23L, "superadmin", "admin@marketroad.local", "SUPERUSUARIO")));
        verify(jwt, never()).generarToken(any());
    }

    @Test
    void unUsuarioNormalNoEntraAlPanel() {
        assertThrows(NoAutorizadoException.class,
                () -> service.loginConUsuario(new IdentidadUsuario(5L, "ana", "ana@correo.cl", "USUARIO")));
        verify(repo, never()).save(any(PersonalSoporte.class));
    }

    @Test
    void sinCorreoEnElTokenSeRechaza() {
        assertThrows(NoAutorizadoException.class,
                () -> service.loginConUsuario(new IdentidadUsuario(23L, "superadmin", " ", "SUPERUSUARIO")));
    }
}
