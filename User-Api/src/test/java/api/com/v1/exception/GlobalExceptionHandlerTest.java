package api.com.v1.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void manejoEstadoHttp_devuelveMensajeYStatusCorresponde() {
        ResponseStatusException ex = new ResponseStatusException(HttpStatus.FORBIDDEN, "Sin permisos");

        ResponseEntity<Map<String, String>> response = handler.manejoEstadoHttp(ex);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("Sin permisos", response.getBody().get("mensaje"));
    }

    @Test
    void manejoFotoDemasiadoGrande_devuelvePayloadTooLarge() {
        Map<String, String> response = handler.manejoFotoDemasiadoGrande();

        assertEquals("La imagen no puede superar los 5 MB", response.get("mensaje"));
    }

    @Test
    void manejoRecursoNoEncontrado_devuelveNotFound() {
        RecursoNoEncontradoException ex = new RecursoNoEncontradoException("No encontrado");

        Map<String, String> response = handler.manejoRecursoNoEncontrado(ex);

        assertEquals("No encontrado", response.get("mensaje"));
    }

    @Test
    void manejoRecursoDuplicado_devuelveConflict() {
        RecursoDuplicadoException ex = new RecursoDuplicadoException("Duplicado");

        Map<String, String> response = handler.manejoRecursoDuplicado(ex);

        assertEquals("Duplicado", response.get("mensaje"));
    }

    @Test
    void manejoCredencialesInvalidas_devuelveUnauthorized() {
        CredencialesInvalidasException ex = new CredencialesInvalidasException("Credenciales inválidas");

        Map<String, String> response = handler.manejoCredencialesInvalidas(ex);

        assertEquals("Credenciales inválidas", response.get("mensaje"));
    }

    @Test
    void manejoErrorGenerico_devuelveMensajeEstandar() {
        Map<String, String> response = handler.manejoErrorGenerico(new RuntimeException("boom"));

        assertEquals("Ocurrió un error inesperado en el servidor", response.get("mensaje"));
    }

    @Test
    void exceptionClasses_creanMensajesEsperados() {
        assertEquals("Credenciales inválidas",
                new CredencialesInvalidasException("Credenciales inválidas").getMessage());
        assertEquals("No encontrado", new RecursoNoEncontradoException("No encontrado").getMessage());
        assertEquals("Duplicado", new RecursoDuplicadoException("Duplicado").getMessage());
    }
}
