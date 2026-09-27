package com.pruebas.unitarias.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.mockito.ArgumentMatchers.any;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import com.caso3.inventario.dto.LogDTO;
import com.caso3.inventario.repository.LogRepository;
import com.caso3.inventario.service.LogService;

@ExtendWith(MockitoExtension.class)
class LogServiceTest {

    @Mock
    private LogRepository repository;

    @InjectMocks
    private LogService service;

    @Test
    void testGuardar() {

        LogDTO log = new LogDTO();
        log.setServicio("productos-api");
        log.setMetodo("POST");
        log.setEstado(200);

        when(repository.save(any(LogDTO.class))).thenReturn(log);

        LogDTO resultado = service.guardar(log);

        assertNotNull(resultado);
        assertEquals("productos-api", resultado.getServicio());
        assertEquals("POST", resultado.getMetodo());
        assertEquals(200, resultado.getEstado());

        verify(repository).save(log);
    }

    @Test
    void testGuardarFechaNula() {

        LogDTO log = new LogDTO();
        log.setFecha(null);

        when(repository.save(any(LogDTO.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        LogDTO resultado = service.guardar(log);
        assertNotNull(resultado.getFecha());
        verify(repository).save(any(LogDTO.class));
    }

    @Test
    void testListar() {

        List<LogDTO> lista = List.of(new LogDTO(), new LogDTO());

        when(repository.findAll()).thenReturn(lista);

        List<LogDTO> resultado = service.listar();

        assertEquals(2, resultado.size());

        verify(repository).findAll();
    }
}