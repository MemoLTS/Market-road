package com.pruebas.unitarias.controller;

import com.caso3.inventario.Inventario;
import com.caso3.inventario.model.Categoria;
import com.caso3.inventario.model.Producto;
import com.caso3.inventario.repository.CategoriaRepository;
import com.caso3.inventario.repository.ProductoRepository;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;


@SpringBootTest(classes = Inventario.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class InvControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;


    @Autowired
    private ProductoRepository productoRepository;


    @Autowired
    private CategoriaRepository categoriaRepository;


    @BeforeEach
    void limpiarBD() {
        productoRepository.deleteAllInBatch();
        categoriaRepository.deleteAllInBatch();

    }


    @Test
    void testCrearProducto() throws Exception {
        Categoria categoria = new Categoria();
        categoria.setNombre("Periféricos");
        categoria.setDescripcion("Accesorios de computador");
        categoria = categoriaRepository.save(categoria);
        Map<String, Object> productoJson = Map.of(
                "nombre", "Mouse Gamer",
                "precio", 25000.0,
                "stock", 10,
                "categoria", Map.of(
                        "id", categoria.getId(),
                        "nombre", categoria.getNombre(),
                        "descripcion", categoria.getDescripcion()
                )
        );

        mockMvc.perform(post("/api/v1/inventario/addprod")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(productoJson)))
                .andExpect(status().isCreated());

        assertEquals(1, productoRepository.count());
        Producto productoGuardado = productoRepository.findAll().get(0);
        assertEquals("Mouse Gamer", productoGuardado.getNombre());
        assertEquals(25000.0, productoGuardado.getPrecio(), 0.0001);
        assertEquals(10, productoGuardado.getStock());
    }
}