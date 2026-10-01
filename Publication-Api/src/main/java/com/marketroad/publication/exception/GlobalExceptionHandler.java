package com.marketroad.publication.exception;

import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> validacion(MethodArgumentNotValidException ex) {
        Map<String, String> errores = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(e -> errores.put(e.getField(), e.getDefaultMessage()));
        return errores;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> argumento(IllegalArgumentException ex) {
        return Map.of("mensaje", ex.getMessage());
    }

    @ExceptionHandler(PublicacionNoEncontradaException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> noEncontrada(PublicacionNoEncontradaException ex) {
        return Map.of("mensaje", ex.getMessage());
    }

    @ExceptionHandler(ConversacionNoEncontradaException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> conversacionNoEncontrada(ConversacionNoEncontradaException ex) {
        return Map.of("mensaje", ex.getMessage());
    }

    @ExceptionHandler(DemasiadasSolicitudesException.class)
    @ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
    public Map<String, String> demasiadas(DemasiadasSolicitudesException ex) {
        return Map.of("mensaje", ex.getMessage());
    }

    @ExceptionHandler(jakarta.validation.ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> restricciones(jakarta.validation.ConstraintViolationException ex) {
        String mensaje = ex.getConstraintViolations().stream().findFirst()
                .map(v -> v.getMessage()).orElse("Parámetro inválido");
        return Map.of("mensaje", mensaje);
    }

    @ExceptionHandler(OperacionNoPermitidaException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String, String> conflicto(OperacionNoPermitidaException ex) {
        return Map.of("mensaje", ex.getMessage());
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class,
            MissingServletRequestPartException.class, HttpMessageNotReadableException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> peticionInvalida(Exception ex) {
        return Map.of("mensaje", "La solicitud no es válida: revisa los parámetros enviados");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    @ResponseStatus(HttpStatus.PAYLOAD_TOO_LARGE)
    public Map<String, String> muyGrande(MaxUploadSizeExceededException ex) {
        return Map.of("mensaje", "Las fotos superan el tamaño permitido (5 MB por foto)");
    }

    @ExceptionHandler(NoAutorizadoException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public Map<String, String> noAutorizado(NoAutorizadoException ex) {
        return Map.of("mensaje", ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Map<String, String> generico(Exception ex) {
        log.error("Error inesperado en publicaciones", ex);
        return Map.of("mensaje", "Ocurrió un error inesperado en el servidor");
    }
}
