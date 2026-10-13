package com.marketroad.publication.security;

import javax.crypto.SecretKey;
import jakarta.annotation.PostConstruct;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtUtil {
    @Value("${jwt.secret}")
    private String secret;

    private SecretKey key;

    @PostConstruct
    public void inicializar() {
        if (secret == null || secret.length() < 32) {
            throw new IllegalArgumentException("JWT_SECRET debe tener al menos 32 caracteres");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    public Identidad obtenerIdentidad(String token) {
        Claims claims = Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload();
        String subject = claims.getSubject();
        if (subject == null || subject.isBlank()) throw new IllegalArgumentException("El token no contiene id de usuario");
        Object apodo = claims.get("apodo");
        return new Identidad(Long.valueOf(subject), apodo == null ? null : apodo.toString());
    }
}
