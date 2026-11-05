package com.marketroad.soporte.config;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.marketroad.soporte.exception.DemasiadasSolicitudesException;
import com.marketroad.soporte.reglas.LimitadorAcciones;

class SoporteConfigTest {
    @Test
    void creaBeansConLosLmitesConfigurados() {
        SoporteConfig config = new SoporteConfig();

        PasswordEncoder encoder = config.passwordEncoder();
        String hash = encoder.encode("Clave1234");
        assertNotNull(encoder);
        assertTrue(encoder.matches("Clave1234", hash));

        LimitadorAcciones mensajes = config.limitadorMensajes();
        for (int i = 0; i < 20; i++) {
            mensajes.registrar("usuario-1");
        }
        assertThrows(DemasiadasSolicitudesException.class, () -> mensajes.registrar("usuario-1"));

        LimitadorAcciones tickets = config.limitadorTickets();
        for (int i = 0; i < 5; i++) {
            tickets.registrar("ticket-1");
        }
        assertThrows(DemasiadasSolicitudesException.class, () -> tickets.registrar("ticket-1"));

        LimitadorAcciones login = config.limitadorLogin();
        for (int i = 0; i < 5; i++) {
            login.registrar("login-1");
        }
        assertThrows(DemasiadasSolicitudesException.class, () -> login.registrar("login-1"));
    }
}
