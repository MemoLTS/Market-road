package com.pruebas.unitarias.config;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

import com.caso3.inventario.dto.StockResponse;

class StockResponseTest {

    @Test
    void testConstructorVacioYSettersGetters() {

        StockResponse response = new StockResponse();

        response.setIdProducto(1L);
        response.setNombre("Teclado");
        response.setStock(25);

        assertEquals(1L, response.getIdProducto());
        assertEquals("Teclado", response.getNombre());
        assertEquals(25, response.getStock());
    }

    @Test
    void testConstructorConParametros() {

        StockResponse response = new StockResponse(2L, "Mouse", 15);

        assertEquals(2L, response.getIdProducto());
        assertEquals("Mouse", response.getNombre());
        assertEquals(15, response.getStock());
    }

    @Test
    void testModificarValores() {

        StockResponse response = new StockResponse(1L, "Monitor", 10);

        response.setIdProducto(5L);
        response.setNombre("Notebook");
        response.setStock(50);

        assertEquals(5L, response.getIdProducto());
        assertEquals("Notebook", response.getNombre());
        assertEquals(50, response.getStock());
    }
}