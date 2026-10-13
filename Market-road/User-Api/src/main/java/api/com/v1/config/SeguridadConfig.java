package api.com.v1.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Solo se usa spring-security-crypto (no el starter completo de Spring Security),
 * así no se activan filtros de autenticación ni se protegen los endpoints
 * automáticamente: únicamente se usa para hashear/verificar contraseñas.
 */
@Configuration
public class SeguridadConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
