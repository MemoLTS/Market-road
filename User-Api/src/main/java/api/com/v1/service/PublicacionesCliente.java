package api.com.v1.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Avisa a Publication-Api qué hacer con las publicaciones de una cuenta: al eliminarla se retiran, al
 * deshabilitarla quedan ocultas para todos y al habilitarla vuelven. Reenvía el token del superusuario que
 * hizo la acción. Si Publication-Api no responde se registra el fallo y la acción sobre la cuenta se mantiene.
 */
@Component
public class PublicacionesCliente {
    private static final Logger log = LoggerFactory.getLogger(PublicacionesCliente.class);

    @Value("${publicaciones.api.url:http://localhost:8083}")
    private String urlBase;

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();

    /** Oculta (habilitada=false) o devuelve (habilitada=true) las publicaciones activas de la cuenta. */
    public boolean cambiarEstado(Long usuarioId, boolean habilitada) {
        return enviar("PATCH", "/api/v1/admin/publicaciones/usuario/" + usuarioId + "/estado",
                "{\"habilitada\":" + habilitada + "}");
    }

    /** Retira las publicaciones de la cuenta eliminada. */
    public boolean retirar(Long usuarioId) {
        return enviar("DELETE", "/api/v1/admin/publicaciones/usuario/" + usuarioId, null);
    }

    boolean enviar(String metodo, String ruta, String cuerpo) {
        String autorizacion = autorizacionActual();
        if (autorizacion == null) {
            return false;
        }
        try {
            HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(urlBase + ruta))
                    .timeout(Duration.ofSeconds(5))
                    .header("Authorization", autorizacion);
            if (cuerpo != null) {
                b.header("Content-Type", "application/json");
            }
            b.method(metodo, cuerpo == null ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(cuerpo));
            HttpResponse<String> r = http.send(b.build(), HttpResponse.BodyHandlers.ofString());
            if (r.statusCode() / 100 != 2) {
                log.warn("Publication-Api respondió {} a {} {}", r.statusCode(), metodo, ruta);
                return false;
            }
            return true;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception ex) {
            log.warn("No se pudo avisar a Publication-Api ({} {}): {}", metodo, ruta, ex.getMessage());
            return false;
        }
    }

    private String autorizacionActual() {
        RequestAttributes atributos = RequestContextHolder.getRequestAttributes();
        if (atributos instanceof ServletRequestAttributes servlet) {
            return servlet.getRequest().getHeader("Authorization");
        }
        return null;
    }
}
