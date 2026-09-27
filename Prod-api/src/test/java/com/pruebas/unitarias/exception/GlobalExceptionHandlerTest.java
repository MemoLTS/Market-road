package com.pruebas.unitarias.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import com.caso3.inventario.exception.GlobalExceptionHandler;

@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerTest {

        @Test
        void testManejoErroresValidacion() {

        MethodArgumentNotValidException exception =
                mock(MethodArgumentNotValidException.class);

        BindingResult bindingResult = mock(BindingResult.class);

        FieldError errorNombre = new FieldError(
                "producto",
                "nombre",
                "El nombre es obligatorio"
        );

        FieldError errorPrecio = new FieldError(
                "producto",
                "precio",
                "El precio debe ser mayor a 0"
        );

        when(exception.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors())
                .thenReturn(java.util.List.of(errorNombre, errorPrecio));

        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        Map<String, String> resultado =
                handler.manejoErroresValidacion(exception);

        assertEquals(2, resultado.size());
        assertEquals(
                "El nombre es obligatorio",
                resultado.get("nombre")
        );
        assertEquals(
                "El precio debe ser mayor a 0",
                resultado.get("precio")
        );
    }
}

