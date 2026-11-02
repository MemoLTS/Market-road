package com.marketroad.soporte.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.marketroad.soporte.reglas.LimitadorAcciones;

@Configuration
public class SoporteConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /** Anti-spam del chat: máximo de mensajes por persona (usuario o personal) por minuto. */
    @Bean("limitadorMensajes")
    public LimitadorAcciones limitadorMensajes() {
        return new LimitadorAcciones(20, 60_000L,
                "Estás enviando mensajes muy rápido. Espera un momento e inténtalo de nuevo");
    }

    /** Anti-spam de tickets nuevos: máximo por persona por hora (además del cupo de tickets en curso). */
    @Bean("limitadorTickets")
    public LimitadorAcciones limitadorTickets() {
        return new LimitadorAcciones(5, 3_600_000L,
                "Abriste varios tickets en poco tiempo. Espera un rato antes de crear otro");
    }

    /** Anti-fuerza-bruta del login del panel: intentos fallidos por correo. */
    @Bean("limitadorLogin")
    public LimitadorAcciones limitadorLogin() {
        return new LimitadorAcciones(5, 600_000L,
                "Demasiados intentos fallidos. Espera 10 minutos e inténtalo de nuevo");
    }
}
