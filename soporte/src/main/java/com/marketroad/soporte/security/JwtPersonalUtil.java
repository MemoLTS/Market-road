package com.marketroad.soporte.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;

/**
 * Emite y valida los tokens del personal de soporte. Usa un secreto propio (SOPORTE_JWT_SECRET), distinto del de
 * User-Api: así un token de usuario común no sirve en el panel y uno del personal no sirve en el resto de la plataforma.
 */
@Component
public class JwtPersonalUtil {
    private static final String TIPO = "PERSONAL_SOPORTE";

    @Value("${soporte.jwt.secret}")
    private String secret;
    @Value("${soporte.jwt.expiration-ms}")
    private long expiracionMs;

    private SecretKey key;

    @PostConstruct
    public void inicializar() {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalArgumentException("SOPORTE_JWT_SECRET debe tener al menos 32 caracteres");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public long getExpiracionMs() {
        return expiracionMs;
    }

    public String generarToken(Long personalId) {
        Date ahora = new Date();
        return Jwts.builder()
                .subject(String.valueOf(personalId))
                .claim("tipo", TIPO)
                .issuedAt(ahora)
                .expiration(new Date(ahora.getTime() + expiracionMs))
                .signWith(key)
                .compact();
    }

    /** Devuelve el id del integrante; lanza JwtException si el token es inválido, está manipulado o expiró. */
    public Long obtenerPersonalId(String token) {
        Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        if (!TIPO.equals(claims.get("tipo"))) {
            throw new IllegalArgumentException("El token no es del personal de soporte");
        }
        String subject = claims.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new IllegalArgumentException("El token no contiene id de personal");
        }
        return Long.valueOf(subject);
    }
}
