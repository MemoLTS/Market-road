package com.marketroad.publication.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.http.HttpMethod;

import com.marketroad.publication.exception.GlobalExceptionHandler;

/** Una ruta o un método que no existen ya no se disfrazan de «error inesperado en el servidor». */
class ErroresDeRutaTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void rutaInexistenteEsUn404ConMensajePropio() {
        var r = handler.rutaInexistente(new NoResourceFoundException(HttpMethod.PATCH, "api/v1/admin/publicaciones/5/estado"));
        assertEquals("No se encontró el recurso solicitado", r.get("mensaje"));
    }

    @Test
    void metodoNoPermitidoEsUn405() {
        var r = handler.metodoNoPermitido(new HttpRequestMethodNotSupportedException("PATCH"));
        assertEquals("Esa operación no está disponible en este servicio", r.get("mensaje"));
    }
}
