package com.marketroad.soporte.exception;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

class GlobalExceptionHandlerTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void mapeaIllegalArgumentExceptionComoBadRequest() {
        var respuesta = handler.argumento(new IllegalArgumentException("Datos inválidos"));

        assertEquals("Datos inválidos", respuesta.get("mensaje"));
    }

    @Test
    void mapeaCredencialesYNoAutorizado() {
        var credenciales = handler.credenciales(new CredencialesInvalidasException("Credenciales inválidas"));
        var noAutorizado = handler.noAutorizado(new NoAutorizadoException("No autorizado"));

        assertEquals("Credenciales inválidas", credenciales.get("mensaje"));
        assertEquals("No autorizado", noAutorizado.get("mensaje"));
    }

    @Test
    void mapeaNoEncontradoYDemasiadasSolicitudes() {
        var noEncontrado = handler.noEncontrado(new TicketNoEncontradoException("Ticket no encontrado"));
        var demasiadas = handler.demasiadas(new DemasiadasSolicitudesException("Límite alcanzado"));

        assertEquals("Ticket no encontrado", noEncontrado.get("mensaje"));
        assertEquals("Límite alcanzado", demasiadas.get("mensaje"));
    }

    @Test
    void generaErrorGeneralConHttp500() {
        var respuesta = handler.generico(new RuntimeException("boom"));

        assertEquals("Ocurrió un error inesperado en el servidor", respuesta.get("mensaje"));
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR.value(), HttpStatus.INTERNAL_SERVER_ERROR.value());
    }
}
