package com.pruebas.unitarias.controller;

import com.caso3.inventario.Inventario;
import com.caso3.inventario.dto.LogDTO;
import com.caso3.inventario.dto.StockResponse;
import com.caso3.inventario.model.Categoria;
import com.caso3.inventario.model.Producto;
import com.caso3.inventario.service.InvService;
import com.caso3.inventario.service.LogService;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

import org.springframework.boot.test.mock.mockito.MockBean;

@SpringBootTest(classes = Inventario.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InvControllerTest {

        @Autowired
        private MockMvc mockMvc;
        @Autowired
        private ObjectMapper objectMapper;
        @SuppressWarnings("removal")
        @MockBean
        private InvService service;

        @SuppressWarnings("removal")
        @MockBean
        private LogService logservice;

        private Producto crearProducto() {
        Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
        Producto producto = new Producto(2L, "Mouse", 20.0, 20, categoria);
        return producto;
        }

        // ---------- Tests de Categoria ----------

        @Test
        void crear_deberiaRetornar201() throws Exception {
        Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");

        when(service.crearCategoria(any(Categoria.class))).thenReturn(categoria);

        mockMvc.perform(post("/api/v1/inventario/categorias")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(categoria)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombre").value("Electrónica"));
        }

        @Test
        void listar_deberiaRetornar200ConLista() throws Exception {
                Categoria c1 = new Categoria(1L, "Electrónica", "Desc");
                Categoria c2 = new Categoria(2L, "Hogar", "Desc");

                when(service.listarCategorias()).thenReturn(Arrays.asList(c1, c2));

                mockMvc.perform(get("/api/v1/inventario/categorias"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.length()").value(2));
        }

        @Test
        void obtenerPorId_deberiaRetornar200() throws Exception {
                Categoria categoria = new Categoria(1L, "Electrónica", "Desc");

                when(service.obtenerCategoriaPorId(1L)).thenReturn(categoria);

                mockMvc.perform(get("/api/v1/inventario/categorias/1"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.nombre").value("Electrónica"));
        }

        @Test
        void actualizar_deberiaRetornar200ConDatosActualizados() throws Exception {
                Categoria actualizada = new Categoria(1L, "Electrónica Pro", "Nueva desc");

                when(service.actualizarCategoria(anyLong(), any(Categoria.class))).thenReturn(actualizada);

                mockMvc.perform(put("/api/v1/inventario/categorias/1")
                                .contentType("application/json")
                                .content(objectMapper.writeValueAsString(actualizada)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.nombre").value("Electrónica Pro"));
        }

        @Test
        void eliminar_deberiaRetornar204() throws Exception {
                doNothing().when(service).eliminarCategoria(1L);

                mockMvc.perform(delete("/api/v1/inventario/categorias/1"))
                        .andExpect(status().isNoContent());

                verify(service, times(1)).eliminarCategoria(1L);
        }

        // ---------- Tests de Logs ----------

        @Test
        void testListarLogs() throws Exception {
        List<LogDTO> logs = new ArrayList<>();
        when(logservice.listar()).thenReturn(logs);
        mockMvc.perform(get("/api/v1/inventario/logs"))
                .andExpect(status().isOk());
        verify(logservice).listar();
        }

        // ---------- Tests de Stock ----------

        @Test
        void testConsultarStock() throws Exception {
                StockResponse response = new StockResponse(
                        1L,
                        "Mouse",
                        20
                );
                when(service.consultarStock(1L))
                        .thenReturn(response);
                mockMvc.perform(get("/api/v1/inventario/stock/1"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.idProducto").value(1))
                        .andExpect(jsonPath("$.nombre").value("Mouse"))
                        .andExpect(jsonPath("$.stock").value(20));
                verify(service).consultarStock(1L);
        }

        // ---------- Tests de Producto ----------

        @Test
        void testGetProductos() throws Exception {
                Producto producto = crearProducto();
                when(service.readAllProd())
                        .thenReturn(List.of(producto));
                mockMvc.perform(get("/api/v1/inventario/prods"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$[0].id").value(2))
                        .andExpect(jsonPath("$[0].nombre").value("Mouse"));
        }

        @Test
        void testPostProductoCreado() throws Exception {
                Producto producto = crearProducto();
                when(service.register(any(Producto.class)))
                        .thenReturn(producto);
                mockMvc.perform(post("/api/v1/inventario/addprod")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(producto)))
                        .andExpect(status().isCreated())
                        .andExpect(content().string("Producto registrado"));
        }

        @Test
        void testPostProductoError() throws Exception {
                Producto producto = crearProducto();
                when(service.register(any(Producto.class)))
                        .thenReturn(null);
                mockMvc.perform(post("/api/v1/inventario/addprod")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(producto)))
                        .andExpect(status().isBadRequest())
                        .andExpect(content().string("Error al registrar producto"));
        }

        @Test
        void testGetProductoPorId() throws Exception {
                Producto producto = crearProducto();
                when(service.readByid(1L))
                        .thenReturn(Optional.of(producto));
                mockMvc.perform(get("/api/v1/inventario/productos/1"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.nombre").value("Mouse"));
        }

        @Test
        void testUpdateProductoOk() throws Exception {
                Producto existente = crearProducto(); // id = 2L
                Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
                Producto actualizado = new Producto(
                        2L,
                        "Laptop Gamer",
                        2500000.0,
                        20,
                        categoria);
                when(service.readAllProd())
                        .thenReturn(List.of(existente));
                when(service.register(any(Producto.class)))
                        .thenReturn(actualizado);
                mockMvc.perform(put("/api/v1/inventario/updateprod/2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(actualizado)))
                        .andExpect(status().isOk())
                        .andExpect(content().string("Producto actualizado"));
        }

        @Test
        void testUpdateProductoNotFound() throws Exception {
                Producto producto = crearProducto();
                when(service.readAllProd())
                        .thenReturn(List.of());
                mockMvc.perform(put("/api/v1/inventario/updateprod/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(producto)))
                        .andExpect(status().isNotFound())
                        .andExpect(content().string("Producto no encontrado"));
        }

        @Test
        void testUpdateStockOk() throws Exception {
                Producto producto = new Producto();
                producto.setId(1L);
                producto.setStock(50);
                when(service.updateStock(1L, 50))
                        .thenReturn(producto);
                mockMvc.perform(put("/api/v1/inventario/updateprod/1/50"))
                        .andExpect(status().isOk());
        }

        @Test
        void testUpdateStockNotFound() throws Exception {
                doThrow(new RuntimeException())
                        .when(service)
                        .updateStock(1L, 50);
                mockMvc.perform(put("/api/v1/inventario/updateprod/1/50"))
                        .andExpect(status().isNotFound())
                        .andExpect(content().string("Producto no encontrado"));
        }

        @Test
        void testDeleteProductoOk() throws Exception {
                doNothing().when(service).deleteById(1L);
                mockMvc.perform(delete("/api/v1/inventario/deleteprod/1"))
                        .andExpect(status().isOk())
                        .andExpect(content().string("Producto eliminado"));
        }

        @Test
        void testDeleteProductoNotFound() throws Exception {
                doThrow(new RuntimeException())
                        .when(service)
                        .deleteById(1L);
                mockMvc.perform(delete("/api/v1/inventario/deleteprod/1"))
                        .andExpect(status().isNotFound())
                        .andExpect(content().string("Producto no encontrado"));
        }

        @Test
        void testGetProductosPorCategoria() throws Exception {
                // Corregido: el endpoint ahora recibe el id de la categoría (Long)
                // en vez de intentar bindear un objeto Categoria desde el path,
                // que fallaba porque no había Converter<String, Categoria> registrado.
                Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
                when(service.obtenerCategoriaPorId(1L)).thenReturn(categoria);
                when(service.buscarPorCategoria(categoria)).thenReturn(List.of(crearProducto()));

                mockMvc.perform(
                        get("/api/v1/inventario/productos/buscar/categoria/1"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$[0].nombre").value("Mouse"))
                        .andExpect(jsonPath("$[0].categoria.nombre").value("Electrónica"));
        }

        @Test
        void testGetProductoOrdenadoPorCategoria() throws Exception {
                Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
                when(service.obtenerCategoriaPorId(1L)).thenReturn(categoria);
                when(service.buscarPorCategoria(categoria)).thenReturn(List.of(crearProducto()));

                mockMvc.perform(
                        get("/api/v1/inventario/productos/ordenados/categoria/1"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$[0].id").value(2))
                        .andExpect(jsonPath("$[0].categoria.descripcion").value("Dispositivos electrónicos"));
        }

        @Test
        void testGetPorNombre() throws Exception {
                Producto producto = crearProducto();
                when(service.readAllProd())
                        .thenReturn(List.of(producto));
                mockMvc.perform(
                        get("/api/v1/inventario/productos/nombre/Mou"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$[0].nombre").value("Mouse"));
        }

        @Test
        void testVerificarDisponibilidad() throws Exception {
                StockResponse response =
                        new StockResponse(1L, "Leche", 20, true);
                when(service.verificarDisponibilidad(1L, 5))
                        .thenReturn(response);
                mockMvc.perform(
                        get("/api/v1/inventario/disponibilidad/1/5"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.idProducto").value(1))
                        .andExpect(jsonPath("$.nombre").value("Leche"))
                        .andExpect(jsonPath("$.stock").value(20))
                        .andExpect(jsonPath("$.disponible").value(true));
                verify(service).verificarDisponibilidad(1L, 5);
        }

        @Test
        void testIngresarStock() throws Exception {
                doNothing().when(service)
                        .ingresarStock(1L, 2L, 10);
                mockMvc.perform(post("/api/v1/inventario/ingresar-stock/1/2/10"))
                        .andExpect(status().isOk())
                        .andExpect(content().string("Stock actualizado y log registrado"));
        }

        @Test
        void testVerificarBajoStock() throws Exception {
                StockResponse response = new StockResponse();
                response.setIdProducto(1L);
                response.setNombre("Leche");
                response.setStock(2);
                response.setAlertaBajoStock(true);
                when(service.verificarBajoStock(1L))
                        .thenReturn(response);
                mockMvc.perform(get("/api/v1/inventario/alerta/1"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.alertaBajoStock").value(true));
                verify(service).verificarBajoStock(1L);
        }

        @Test
        void testVerificarBajoStockNotFound() throws Exception {
                when(service.verificarBajoStock(1L))
                        .thenThrow(new RuntimeException("Producto no encontrado"));

                mockMvc.perform(get("/api/v1/inventario/alerta/1"))
                        .andExpect(status().isNotFound())
                        .andExpect(content().string("Producto no encontrado"));
        }

        @Test
        void testVerificarDisponibilidadNotFound() throws Exception {
        when(service.verificarDisponibilidad(1L, 5))
                .thenThrow(new RuntimeException("Producto no encontrado"));
        mockMvc.perform(get("/api/v1/inventario/disponibilidad/1/5"))
                .andExpect(status().isNotFound());
        verify(service).verificarDisponibilidad(1L, 5);
        }

        // ---------- Test de Logs (POST) ----------

        @Test
        void guardarLog_deberiaRetornar200ConLogGuardado() throws Exception {
                LogDTO logEnviado = new LogDTO(
                                null,
                                "inventario",
                                "/api/v1/inventario/addprod",
                                "POST",
                                201,
                                120L,
                                "admin",
                                "192.168.1.10",
                                null,
                                LocalDateTime.now());

                LogDTO logGuardado = new LogDTO(
                                1L,
                                "inventario",
                                "/api/v1/inventario/addprod",
                                "POST",
                                201,
                                120L,
                                "admin",
                                "192.168.1.10",
                                null,
                                LocalDateTime.now());

                when(logservice.guardar(any(LogDTO.class))).thenReturn(logGuardado);

                mockMvc.perform(post("/api/v1/inventario/logs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(logEnviado)))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.id").value(1))
                        .andExpect(jsonPath("$.servicio").value("inventario"))
                        .andExpect(jsonPath("$.metodo").value("POST"))
                        .andExpect(jsonPath("$.estado").value(201));

                verify(logservice, times(1)).guardar(any(LogDTO.class));
        }

        // ---------- Deshabilitar / habilitar producto ----------

        @Test
        void testDeshabilitarProductoOk() throws Exception {
                Producto producto = crearProducto();
                producto.setActivo(false);
                when(service.deshabilitarProducto(2L)).thenReturn(producto);

                mockMvc.perform(patch("/api/v1/inventario/productos/2/deshabilitar"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.activo").value(false));
        }

        @Test
        void testDeshabilitarProductoNoEncontrado() throws Exception {
                when(service.deshabilitarProducto(99L))
                        .thenThrow(new RuntimeException("Producto no encontrado"));

                mockMvc.perform(patch("/api/v1/inventario/productos/99/deshabilitar"))
                        .andExpect(status().isNotFound());
        }

        @Test
        void testHabilitarProductoOk() throws Exception {
                Producto producto = crearProducto();
                producto.setActivo(true);
                when(service.habilitarProducto(2L)).thenReturn(producto);

                mockMvc.perform(patch("/api/v1/inventario/productos/2/habilitar"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.activo").value(true));
        }

        @Test
        void testHabilitarProductoNoEncontrado() throws Exception {
                when(service.habilitarProducto(99L))
                        .thenThrow(new RuntimeException("Producto no encontrado"));

                mockMvc.perform(patch("/api/v1/inventario/productos/99/habilitar"))
                        .andExpect(status().isNotFound())
                        .andExpect(content().string("Producto no encontrado"));
        }

        // ---------- Descuentos ----------

        @Test
        void testAplicarDescuentoPorIdOk() throws Exception {
                Producto producto = crearProducto();
                producto.setDescuentoPorcentaje(15.0);
                when(service.aplicarDescuentoPorId(2L, 15.0)).thenReturn(producto);

                mockMvc.perform(patch("/api/v1/inventario/productos/2/descuento/15.0"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.descuentoPorcentaje").value(15.0));
        }

        @Test
        void testAplicarDescuentoPorIdInvalido() throws Exception {
                when(service.aplicarDescuentoPorId(2L, 150.0))
                        .thenThrow(new IllegalArgumentException("El descuento debe estar entre 0 y 100"));

                mockMvc.perform(patch("/api/v1/inventario/productos/2/descuento/150.0"))
                        .andExpect(status().isBadRequest());
        }

        @Test
        void testQuitarDescuentoOk() throws Exception {
                Producto producto = crearProducto();
                producto.setDescuentoPorcentaje(0.0);
                when(service.quitarDescuento(2L)).thenReturn(producto);

                mockMvc.perform(delete("/api/v1/inventario/productos/2/descuento"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.descuentoPorcentaje").value(0.0));
        }

        @Test
        void testAplicarDescuentoPorCategoriaOk() throws Exception {
                Producto producto = crearProducto();
                producto.setDescuentoPorcentaje(20.0);
                when(service.aplicarDescuentoPorCategoria(1L, 20.0)).thenReturn(List.of(producto));

                mockMvc.perform(patch("/api/v1/inventario/categorias/1/descuento/20.0"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$[0].descuentoPorcentaje").value(20.0));
        }

        @Test
        void testAplicarDescuentoPorCategoriaSinProductos() throws Exception {
                when(service.aplicarDescuentoPorCategoria(1L, 20.0))
                        .thenThrow(new org.springframework.web.server.ResponseStatusException(
                                org.springframework.http.HttpStatus.NOT_FOUND, "No hay productos"));

                mockMvc.perform(patch("/api/v1/inventario/categorias/1/descuento/20.0"))
                        .andExpect(status().isNotFound());
        }
}
