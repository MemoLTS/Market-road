package com.marketroad.publication.security;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Pregunta a User-Api si la cuenta del token sigue existiendo y habilitada. El JWT es stateless:
 * sin esta consulta una cuenta eliminada o deshabilitada seguiría funcionando hasta que el token expire.
 * El resultado se guarda unos segundos para no consultar en cada petición. Si User-Api no responde
 * no se corta el servicio (se asume la cuenta activa).
 */
@Component
public class VerificadorCuenta {

    public enum Estado { ACTIVA, DESHABILITADA, ELIMINADA }

    private record Entrada(Estado estado, long hasta) { }

    @Value("${usuarios.api.url:http://localhost:8084}")
    private String urlBase;
    @Value("${usuarios.api.cache-ms:10000}")
    private long cacheMs;

    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    private final Map<Long, Entrada> cache = new ConcurrentHashMap<>();

    public Estado consultar(Long usuarioId, String token) {
        long ahora = System.currentTimeMillis();
        Entrada guardada = cache.get(usuarioId);
        if (guardada != null && guardada.hasta() > ahora) {
            return guardada.estado();
        }
        Estado estado = preguntar(usuarioId, token);
        if (estado == null) {
            return Estado.ACTIVA;
        }
        cache.put(usuarioId, new Entrada(estado, ahora + cacheMs));
        return estado;
    }

    /** Devuelve null cuando User-Api no responde con algo concluyente. */
    protected Estado preguntar(Long usuarioId, String token) {
        try {
            HttpRequest peticion = HttpRequest.newBuilder(URI.create(urlBase + "/api/v1/usuarios/" + usuarioId))
                    .timeout(Duration.ofSeconds(2))
                    .header("Authorization", "Bearer " + token)
                    .GET().build();
            HttpResponse<String> respuesta = http.send(peticion, HttpResponse.BodyHandlers.ofString());
            if (respuesta.statusCode() == 401 || respuesta.statusCode() == 404) {
                return Estado.ELIMINADA;
            }
            if (respuesta.statusCode() == 200) {
                JsonNode cuerpo = mapper.readTree(respuesta.body());
                return cuerpo.path("activo").asBoolean(true) ? Estado.ACTIVA : Estado.DESHABILITADA;
            }
            return null;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return null;
        } catch (Exception ex) {
            return null;
        }
    }
}
