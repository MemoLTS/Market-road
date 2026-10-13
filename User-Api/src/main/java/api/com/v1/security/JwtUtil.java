package api.com.v1.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * Genera y valida el token de sesión (JWT) emitido al iniciar sesión.
 * El token dura {@code jwt.expiration-ms} (por defecto 30 días) para que el
 * dispositivo quede "recordado" sin necesidad de volver a iniciar sesión,
 * hasta que el usuario cierre sesión explícitamente en el frontend.
 */
@Component
public class JwtUtil {

    private final SecretKey claveFirma;
    private final long expiracionMs;

    public JwtUtil(
            @Value("${jwt.secret}") String secreto,
            @Value("${jwt.expiration-ms}") long expiracionMs) {
        if (secreto == null || secreto.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "jwt.secret debe tener al menos 32 caracteres (256 bits) para HS256");
        }
        this.claveFirma = Keys.hmacShaKeyFor(secreto.getBytes(StandardCharsets.UTF_8));
        this.expiracionMs = expiracionMs;
    }

    public long getExpiracionMs() {
        return expiracionMs;
    }

    public String generarToken(Long usuarioId, String correo, String apodo) {
        Date ahora = new Date();
        Date expira = new Date(ahora.getTime() + expiracionMs);

        return Jwts.builder()
                .subject(String.valueOf(usuarioId))
                .claim("correo", correo)
                .claim("apodo", apodo)
                .issuedAt(ahora)
                .expiration(expira)
                .signWith(claveFirma)
                .compact();
    }

    /**
     * Valida el token y devuelve sus claims. Lanza JwtException (o alguna de
     * sus subclases, ej. ExpiredJwtException) si el token es inválido,
     * está manipulado o expiró.
     */
    public Claims validarYObtenerClaims(String token) throws JwtException {
        return Jwts.parser()
                .verifyWith(claveFirma)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long obtenerUsuarioId(String token) {
        return Long.valueOf(validarYObtenerClaims(token).getSubject());
    }

    public boolean estaExpirado(String token) {
        try {
            validarYObtenerClaims(token);
            return false;
        } catch (ExpiredJwtException ex) {
            return true;
        }
    }
}
