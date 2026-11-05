package com.marketroad.soporte.dto;

import static org.junit.jupiter.api.Assertions.*;

import java.time.OffsetDateTime;

import org.junit.jupiter.api.Test;

import jakarta.validation.Validation;
import jakarta.validation.Validator;

class DtoValidationTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void loginRequestValidaCamposObligatorios() {
        LoginRequestDTO dto = new LoginRequestDTO("", "");

        var errores = validator.validate(dto);

        assertFalse(errores.isEmpty());
        assertTrue(errores.stream().anyMatch(v -> "correo".equals(v.getPropertyPath().toString())));
        assertTrue(errores.stream().anyMatch(v -> "contrasena".equals(v.getPropertyPath().toString())));
    }

    @Test
    void requestEstadoYPrioridadExigenValor() {
        assertFalse(validator.validate(new EstadoRequestDTO(" ")).isEmpty());
        assertFalse(validator.validate(new PrioridadRequestDTO(" ")).isEmpty());
    }

    @Test
    void recordRetieneLosValoresEsperados() {
        OffsetDateTime ahora = OffsetDateTime.now();
        PersonalDTO personal = new PersonalDTO(7L, "Ana", "ana@marketroad.cl", "SOPORTE", "Soporte", true,
                ahora, ahora, 2L);
        LoginResponseDTO dto = new LoginResponseDTO("token-123", 60000L, personal);

        assertEquals("token-123", dto.token());
        assertEquals(60000L, dto.expiraEnMs());
        assertEquals(7L, dto.personal().id());
        assertEquals("Ana", dto.personal().nombre());
    }
}
