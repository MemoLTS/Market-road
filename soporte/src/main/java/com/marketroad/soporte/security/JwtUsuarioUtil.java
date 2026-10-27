package com.marketroad.soporte.security;

import java.nio.charset.StandardCharsets;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;

/** Valida (no emite) los tokens de las personas usuarias, firmados por User-Api con el secreto JWT_SECRET. */
@Component
public class JwtUsuarioUtil {
    @Value("${jwt.secret}")
    private String secret;

    private SecretKey key;

    @PostConstruct
    public void inicializar() {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalArgumentException("JWT_SECRET debe tener al menos 32 caracteres");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public IdentidadUsuario obtenerIdentidad(String token) {
        Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        String subject = claims.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("El token no contiene id de usuario");
        }
        Object apodo = claims.get("apodo");
        Object correo = claims.get("correo");
        return new IdentidadUsuario(Long.valueOf(subject), apodo == null ? null : apodo.toString(),
                correo == null ? null : correo.toString());
    }
}
