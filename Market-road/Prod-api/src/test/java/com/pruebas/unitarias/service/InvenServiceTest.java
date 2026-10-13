package com.pruebas.unitarias.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;

import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.caso3.inventario.dto.StockResponse;
import com.caso3.inventario.model.Categoria;
import com.caso3.inventario.model.Producto;
import com.caso3.inventario.model.ProveedorLog;
import com.caso3.inventario.service.InvService;
import com.caso3.inventario.repository.CategoriaRepository;
import com.caso3.inventario.repository.ProductoRepository;
import com.caso3.inventario.repository.ProveedorLogRepository;

@ExtendWith(MockitoExtension.class)
class InvenServiceTest {

        @Mock
        private CategoriaRepository categoriaRepository;
        @Mock
        private ProductoRepository repository;

        @Mock
        private ProveedorLogRepository proveedorLogRepository;

        @InjectMocks
        private InvService service;
        
        private Categoria categoria;

        @BeforeEach
        void setUp() {
                categoria = new Categoria(1l,"Electrónica", "Dispositivos electrónicos");
        }

        @Test
        void crear_deberiaGuardarYRetornarCategoria() {
                when(categoriaRepository.save(any(Categoria.class))).thenReturn(categoria);

                Categoria resultado = service.crearCategoria(new Categoria(2L, "Electrónica", "Dispositivos electrónicos"));

                assertNotNull(resultado);
                assertEquals("Electrónica", resultado.getNombre());
                verify(categoriaRepository, times(1)).save(any(Categoria.class));
        }

        @Test
        void listarTodas_deberiaRetornarListaDeCategorias() {
                Categoria otra = new Categoria(2L, "Hogar", "Artículos para el hogar");
                when(categoriaRepository.findAll()).thenReturn(Arrays.asList(categoria, otra));

                List<Categoria> resultado = service.listarCategorias();

                assertEquals(2, resultado.size());
                verify(categoriaRepository, times(1)).findAll();
        }

        @Test
        void obtenerPorId_cuandoExiste_deberiaRetornarCategoria() {
                when(categoriaRepository.findById(1L)).thenReturn(Optional.of(categoria));

                Categoria resultado = service.obtenerCategoriaPorId(1L);

                assertNotNull(resultado);
                assertEquals("Electrónica", resultado.getNombre());
        }

        @Test
        void obtenerPorId_cuandoNoExiste_deberiaLanzarExcepcion() {
                when(categoriaRepository.findById(99L)).thenReturn(Optional.empty());

                assertThrows(RuntimeException.class, () -> service.obtenerCategoriaPorId(99L));
        }

        @Test
        void actualizar_deberiaModificarYRetornarCategoria() {
                Categoria datosNuevos = new Categoria(3L, "Electrónica y Hogar", "Descripción actualizada");

                when(categoriaRepository.findById(1L)).thenReturn(Optional.of(categoria));
                when(categoriaRepository.save(any(Categoria.class))).thenReturn(categoria);

                Categoria resultado = service.actualizarCategoria       (1L, datosNuevos);

                assertEquals("Electrónica y Hogar", resultado.getNombre());
                assertEquals("Descripción actualizada", resultado.getDescripcion());
                verify(categoriaRepository, times(1)).save(categoria);
        }

        @Test
        void actualizar_cuandoNoExiste_deberiaLanzarExcepcion() {
                when(categoriaRepository.findById(99L)).thenReturn(Optional.empty());

                assertThrows(RuntimeException.class,
                        () -> service.actualizarCategoria(99L, new Categoria(3L, "X", "Y")));
        }

        @Test
        void eliminar_deberiaLlamarAlRepositorio() {
                when(categoriaRepository.findById(1L)).thenReturn(Optional.of(categoria));
                doNothing().when(categoriaRepository).delete(categoria);

                service.eliminarCategoria(1L);

                verify(categoriaRepository, times(1)).delete(categoria);
        }

        @Test
        void eliminar_cuandoNoExiste_deberiaLanzarExcepcion() {
                when(categoriaRepository.findById(99L)).thenReturn(Optional.empty());

                assertThrows(RuntimeException.class, () -> service.eliminarCategoria(99L));
        }
        @Test
        void testVerificarDisponibilidad() {
                Producto producto = new Producto();
                producto.setId(1L);
                producto.setNombre("Leche");
                producto.setStock(20);
                when(repository.findById(1L))
                        .thenReturn(Optional.of(producto));
                StockResponse response =
                        service.verificarDisponibilidad(1L, 10);
                assertNotNull(response);
                assertEquals(1L, response.getIdProducto());
                assertEquals("Leche", response.getNombre());
                assertEquals(20, response.getStock());
                assertTrue(response.getDisponible());
                verify(repository).findById(1L);
        }
        @Test
        void testVerificarDisponibilidadSinStock() {
                Producto producto = new Producto();
                producto.setId(1L);
                producto.setNombre("Leche");
                producto.setStock(3);
                when(repository.findById(1L))
                        .thenReturn(Optional.of(producto));
                StockResponse response =
                        service.verificarDisponibilidad(1L, 10);
                assertNotNull(response);
                assertFalse(response.getDisponible());
                verify(repository).findById(1L);
        }

        @Test
        void testVerificarBajoStock() {
                Producto producto = new Producto();
                producto.setId(1L);
                producto.setNombre("Leche");
                producto.setStock(3);
                when(repository.findById(1L))
                        .thenReturn(Optional.of(producto));
                StockResponse response = service.verificarBajoStock(1L);
                assertTrue(response.getAlertaBajoStock());
        }
        @Test
        void testSinAlertaBajoStock() {
                Producto producto = new Producto();
                producto.setId(1L);
                producto.setNombre("Leche");
                producto.setStock(20);
                when(repository.findById(1L))
                        .thenReturn(Optional.of(producto));
                StockResponse response = service.verificarBajoStock(1L);
                assertFalse(response.getAlertaBajoStock());
        }
        @Test
        void testVerificarDisponibilidadProductoNoExiste() {
                when(repository.findById(1L))
                        .thenReturn(Optional.empty());
                RuntimeException ex = assertThrows(
                        RuntimeException.class,
                        () -> service.verificarDisponibilidad(1L, 5));
                assertEquals("Producto no encontrado", ex.getMessage());
                verify(repository).findById(1L);
        }

        @Test
        void testIngresarStock_ok() {

        Producto producto = new Producto();
        producto.setId(1L);
        producto.setNombre("Mouse");
        producto.setStock(5);

        ProveedorLog proveedor = new ProveedorLog();
        proveedor.setIdproveedor(2L);
        proveedor.setNombreProveedor("Proveedor A");

        when(repository.findById(1L))
                .thenReturn(Optional.of(producto));

        when(proveedorLogRepository.findById(2L))
                .thenReturn(Optional.of(proveedor));

        when(repository.save(any(Producto.class)))
                .thenAnswer(i -> i.getArgument(0));

        when(proveedorLogRepository.save(any(ProveedorLog.class)))
                .thenAnswer(i -> i.getArgument(0));

        service.ingresarStock(1L, 2L, 10);

        assertEquals(15, producto.getStock());

        verify(repository).save(producto);
        verify(proveedorLogRepository).save(any(ProveedorLog.class));
        }

        @Test
        void testIngresarStock_ok1() {
                Producto producto = new Producto();
                producto.setId(1L);
                producto.setNombre("Mouse");
                producto.setStock(5);
                ProveedorLog proveedor = new ProveedorLog();
                proveedor.setIdproveedor(2L);
                proveedor.setNombreProveedor("Proveedor A");
                when(repository.findById(1L))
                        .thenReturn(Optional.of(producto));
                when(proveedorLogRepository.findById(2L))
                        .thenReturn(Optional.of(proveedor));
                when(repository.save(any(Producto.class)))
                        .thenAnswer(inv -> inv.getArgument(0));
                when(proveedorLogRepository.save(any(ProveedorLog.class)))
                        .thenAnswer(inv -> inv.getArgument(0));
                service.ingresarStock(1L, 2L, 10);
                assertEquals(15, producto.getStock());
                verify(repository).save(producto);
                verify(proveedorLogRepository).save(any(ProveedorLog.class));
        }

        @Test
        void testProductoNoEncontrado() {
                when(repository.findById(1L))
                        .thenReturn(Optional.empty());
                RuntimeException ex = assertThrows(RuntimeException.class,
                        () -> service.ingresarStock(1L, 2L, 10));
                assertEquals("Producto no encontrado", ex.getMessage());
                verify(repository).findById(1L);
                verifyNoInteractions(proveedorLogRepository);
        }

        @Test
        void testProveedorNoEncontrado() {
                Producto producto = new Producto();
                producto.setId(1L);
                producto.setStock(5);
                when(repository.findById(1L))
                        .thenReturn(Optional.of(producto));
                when(proveedorLogRepository.findById(2L))
                        .thenReturn(Optional.empty());
                RuntimeException ex = assertThrows(RuntimeException.class,
                        () -> service.ingresarStock(1L, 2L, 10));
                assertEquals("Proveedor no encontrado", ex.getMessage());
                verify(repository).findById(1L);
                verify(proveedorLogRepository).findById(2L);
        }

        @Test
        void testConsultarStock() {
                Producto producto = new Producto();
                producto.setId(1L);
                producto.setNombre("Mouse");
                producto.setStock(20);

                when(repository.findById(1L))
                        .thenReturn(Optional.of(producto));

                StockResponse response = service.consultarStock(1L);

                assertNotNull(response);
                assertEquals(1L, response.getIdProducto());
                assertEquals("Mouse", response.getNombre());
                assertEquals(20, response.getStock());

                verify(repository).findById(1L);
        }

        @Test
        void testConsultarStockProductoNoExiste() {

                when(repository.findById(1L))
                        .thenReturn(Optional.empty());

                RuntimeException ex = assertThrows(RuntimeException.class,
                        () -> service.consultarStock(1L));

                assertEquals("Producto no encontrado", ex.getMessage());

                verify(repository).findById(1L);
        }
        @Test
        void testReadById_ok() {
        Producto producto = new Producto();
        producto.setId(1L);
        producto.setNombre("Laptop");

        when(repository.findById(1L))
                .thenReturn(Optional.of(producto));

        Optional<Producto> result = service.readByid(1L);

        assertTrue(result.isPresent());
        assertEquals("Laptop", result.get().getNombre());

        verify(repository).findById(1L);
        }
        @Test
        void testReadById_notFound() {

        when(repository.findById(99L))
                .thenReturn(Optional.empty());

        Optional<Producto> result = service.readByid(99L);

        assertTrue(result.isEmpty());

        verify(repository).findById(99L);
        }
        @Test
        void testRegisterProductoNull() {
                IllegalArgumentException ex = assertThrows(
                        IllegalArgumentException.class,
                        () -> service.register(null)
                );

                assertEquals("Producto no puede ser nulo", ex.getMessage());
                }

        @Test
        void testRegisterNombreNull() {
                Producto producto = new Producto();
                producto.setNombre(null);

                IllegalArgumentException ex = assertThrows(
                        IllegalArgumentException.class,
                        () -> service.register(producto)
                );

                assertEquals("El nombre del producto es obligatorio", ex.getMessage());
        }

        @Test
        void testRegisterNombreVacio() {
                Producto producto = new Producto();
                producto.setNombre("");

                IllegalArgumentException ex = assertThrows(
                        IllegalArgumentException.class,
                        () -> service.register(producto)
                );

                assertEquals("El nombre del producto es obligatorio", ex.getMessage());
        }

        @Test
        void testRegisterNombreMenorATresCaracteres() {
                Producto producto = new Producto();
                producto.setNombre("AB");

                IllegalArgumentException ex = assertThrows(
                        IllegalArgumentException.class,
                        () -> service.register(producto)
                );

                assertEquals("El nombre debe tener al menos 3 caracteres", ex.getMessage());
        }

        @Test
        void testRegisterPrecioNull() {
                Producto producto = new Producto();
                producto.setNombre("pepsi");
                producto.setPrecio(null);

                IllegalArgumentException ex = assertThrows(
                        IllegalArgumentException.class,
                        () -> service.register(producto)
                );

                assertEquals("El precio debe ser mayor o igual a 0", ex.getMessage());
        }

        @Test
        void testRegisterPrecioNegativo() {
                Producto producto = new Producto();
                producto.setNombre("Laptop");
                producto.setPrecio(-1000.0);
                IllegalArgumentException ex = assertThrows(
                        IllegalArgumentException.class,
                        () -> service.register(producto)
                );

                assertEquals("El precio debe ser mayor o igual a 0", ex.getMessage());
        }

        @Test
        void testRegisterCategoriaNull() {
                Producto producto = new Producto();
                producto.setNombre("Pepsi");
                producto.setPrecio(1500.0);
                producto.setStock(10);
                producto.setCategoria(null);

                IllegalArgumentException ex = assertThrows(
                        IllegalArgumentException.class,
                        () -> service.register(producto)
                );

                assertEquals("La categoría es obligatoria", ex.getMessage());
        }

        @Test
        void testRegisterStockNegativo() {
                Producto producto = new Producto();
                Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
                producto.setNombre("Laptop");
                producto.setPrecio(1000.0);
                producto.setStock(-1);
                producto.setCategoria(categoria);

                IllegalArgumentException ex = assertThrows(
                        IllegalArgumentException.class,
                        () -> service.register(producto)
                );

                assertEquals("El stock no puede ser negativo", ex.getMessage());
                }
        @Test
        void testUpdateStockCantidadNegativa() {
                IllegalArgumentException ex = assertThrows(
                        IllegalArgumentException.class,
                        () -> service.updateStock(1L, -5)
                );

                assertEquals("La cantidad no puede ser negativa", ex.getMessage());
        }

        @Test
        void testGuardarProducto() {
                Producto producto = new Producto();
                Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
                producto.setCategoria(categoria);
                producto.setNombre("laptop");
                producto.setPrecio((double) 2000000);
                producto.setStock(20);
                Producto productoGuardado = new Producto(1L, "laptop", (double)2000000, 20, categoria);

                when(categoriaRepository.findById(1L)).thenReturn(Optional.of(categoria));
                when(repository.save(producto)).thenReturn(productoGuardado);

                Producto resultado = service.register(producto);
                assertThat(resultado).isEqualTo(productoGuardado);
                assertThat(resultado.getId()).isEqualTo(1L);
                assertThat(resultado.getNombre()).isEqualTo("laptop");

                verify(categoriaRepository).findById(1L);
                verify(repository).save(producto);
        }
        
        @Test
        void testUpdateStockExitoso() {

                Producto producto = new Producto();
                Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
                producto.setNombre("Laptop");
                producto.setPrecio(1000.0);
                producto.setStock(-1);
                producto.setCategoria(categoria);

                when(repository.findById(1L))
                        .thenReturn(Optional.of(producto));

                when(repository.save(any(Producto.class)))
                        .thenAnswer(invocation -> invocation.getArgument(0));

                Producto resultado = service.updateStock(1L, 20);

                assertEquals(20, resultado.getStock());

                verify(repository).findById(1L);
                verify(repository).save(producto);
        }
        @Test
        void testListarProductos() {
                Producto producto = new Producto();
                Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
                producto.setCategoria(categoria);
                List<Producto> productos = new ArrayList<>();
                productos.add(producto);

                when(repository.findAll()).thenReturn(productos);

                List<Producto> resultado = service.readAllProd();

                assertThat(resultado).hasSize(1);
                assertThat(resultado).contains(producto);

                verify(repository).findAll();
        }
        @Test
        void testRegisterExitoso() {
                Producto producto = new Producto();
                Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
                producto.setNombre("Laptop");
                producto.setPrecio(1000.0);
                producto.setStock(10);
                producto.setCategoria(categoria);
                when(categoriaRepository.findById(1L)).thenReturn(Optional.of(categoria));
                when(repository.save(any(Producto.class)))
                        .thenReturn(producto);

                Producto resultado = service.register(producto);

                assertNotNull(resultado);
                assertEquals(producto, resultado);

                verify(categoriaRepository).findById(1L);
                verify(repository).save(producto);
        }

        @Test
        void testListarProductosPorCategoria() {
                Producto producto = new Producto();
                Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
                producto.setNombre("Laptop");
                producto.setPrecio(1000.0);
                producto.setStock(-1);
                producto.setCategoria(categoria);

                List<Producto> productos = new ArrayList<>();
                productos.add(producto);

                when(repository.findByCategoria(categoria))
                        .thenReturn(productos);

                List<Producto> resultado =
                        service.buscarPorCategoria(categoria);

                assertThat(resultado).hasSize(1);
                assertThat(resultado).contains(producto);

                verify(repository).findByCategoria(categoria);
                }

        @Test
        void testUpdateStock() {
                Producto producto = new Producto();
                Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
                producto.setNombre("Laptop");
                producto.setPrecio(1000.0);
                producto.setStock(-1);
                producto.setCategoria(categoria);

                when(repository.findById(1L))
                        .thenReturn(Optional.of(producto));

                when(repository.save(any(Producto.class)))
                        .thenAnswer(inv -> inv.getArgument(0));

                Producto resultado = service.updateStock(1L, 2000);

                assertNotNull(resultado);
                assertEquals(2000, resultado.getStock());

                verify(repository).findById(1L);
                verify(repository).save(producto);
        }
        @Test
        void testProdUpdateStock() {
                Producto producto = new Producto();
                Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
                producto.setNombre("Laptop");
                producto.setPrecio(1000.0);
                producto.setStock(-1);
                producto.setCategoria(categoria);

                when(repository.findById(1L))
                        .thenReturn(Optional.of(producto));

                when(repository.save(any(Producto.class)))
                        .thenAnswer(invocation -> invocation.getArgument(0));

                Producto resultado = service.updateStock(1L, 2000);

                assertEquals(2000, resultado.getStock());

                verify(repository).findById(1L);
                verify(repository).save(producto);
        }

        @Test
        void testActualizarProducto() {
                Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
                Producto productoExistente = new Producto(1L,"laptop", (double) 2000000, 20, categoria);
                Producto productoActualizado = new Producto(1L,"laptop", (double) 2000000, 20, categoria);

                when(repository.findById(1L)).thenReturn(Optional.of(productoExistente));
                when(repository.save(any(Producto.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

                Producto resultado = service.updateProducto(1L, productoActualizado);

                assertThat(resultado.getNombre()).isEqualTo("laptop");
                assertThat(resultado.getCategoria()).isEqualTo(categoria);
                assertThat(resultado.getPrecio()).isEqualTo(2000000.0);

                verify(repository).findById(1L);
                verify(repository).save(productoExistente);
        }
        @Test
        void testUpdateStockIdNull() {

                IllegalArgumentException ex = assertThrows(
                        IllegalArgumentException.class,
                        () -> service.updateStock(null, 10)
                );

                assertEquals("El id no puede ser nulo", ex.getMessage());
        }

        @Test
        void testEliminarProducto() {

                when(repository.existsById(1L))
                        .thenReturn(true);

                service.deleteById(1L);

                verify(repository).existsById(1L);
                verify(repository).deleteById(1L);
        }

        @Test
        void testDeleteByIdIdNull() {

                IllegalArgumentException ex = assertThrows(
                        IllegalArgumentException.class,
                        () -> service.deleteById(null)
                );

                assertEquals("El id no puede ser nulo", ex.getMessage());
        }
        @Test
        void testDeleteByIdProductoNoExiste() {

                when(repository.existsById(1L))
                        .thenReturn(false);

                ResponseStatusException ex = assertThrows(
                        ResponseStatusException.class,
                        () -> service.deleteById(1L)
                );

                assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());

                verify(repository).existsById(1L);
        }
        @Test
        void testDeleteByIdExitoso() {

                when(repository.existsById(1L))
                        .thenReturn(true);

                service.deleteById(1L);

                verify(repository).existsById(1L);
                verify(repository).deleteById(1L);
        }

        @Test
        void testObtenerPorCategoria() {
                Categoria electronica = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
                Categoria hogar = new Categoria(2L, "Hogar", "Artículos para el hogar");

                Producto p1 = new Producto();
                p1.setNombre("Laptop");
                p1.setPrecio(1000.0);
                p1.setStock(10);
                p1.setCategoria(electronica);

                Producto p2 = new Producto(
                        2L,
                        "Mesa",
                        50000.0,
                        10,
                        hogar
                );

                when(repository.findAll())
                        .thenReturn(List.of(p1, p2));

                // obtenerPorCategoria compara contra categoria.toString(), no contra el nombre.
                // Usamos el toString() real de la categoría "hogar" para no depender de
                // cómo esté implementado (con o sin Lombok @ToString/@Data).
                List<Producto> resultado =
                        service.obtenerPorCategoria(hogar.toString());

                assertEquals(1, resultado.size());
                assertEquals("Mesa", resultado.get(0).getNombre());

                verify(repository).findAll();
        }

        @Test
        void testObtenerPorCategoriaSinResultados() {
                Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
                Producto p1 = new Producto(
                        1L,
                        "Mesa",
                        50000.0,
                        10,
                        categoria
                );

                when(repository.findAll())
                        .thenReturn(List.of(p1));

                List<Producto> resultado =
                        service.obtenerPorCategoria("electrodomesticos");

                assertTrue(resultado.isEmpty());

                verify(repository).findAll();
        }
        @Test
        void testObtenerPorCategoriaCategoriaNull() {
                Producto producto = new Producto();
                producto.setId(1L);
                producto.setNombre("Laptop");
                producto.setPrecio(2000000.0);
                producto.setStock(20);
                producto.setCategoria(null);

                when(repository.findAll())
                        .thenReturn(List.of(producto));

                List<Producto> resultado =
                        service.obtenerPorCategoria("electrodomesticos");

                assertTrue(resultado.isEmpty());

                verify(repository).findAll();
        }
        @Test
        void testBuscarPorCategoria() {
                Categoria categoria = new Categoria(1L, "Electrónica", "Dispositivos electrónicos");
                Producto producto = new Producto(
                        1L,
                        "Laptop",
                        2000000.0,
                        20,
                        categoria
                );

                when(repository.findByCategoria(categoria))
                        .thenReturn(List.of(producto));

                List<Producto> resultado =
                        service.buscarPorCategoria(categoria);

                assertEquals(1, resultado.size());

                verify(repository)
                        .findByCategoria(categoria);
        }

        // ---------- Deshabilitar / habilitar producto ----------

        @Test
        void testDeshabilitarProductoOk() {
                Producto producto = new Producto(1L, "Laptop", 2000000.0, 20, categoria);
                producto.setActivo(true);

                when(repository.findById(1L)).thenReturn(Optional.of(producto));
                when(repository.save(any(Producto.class))).thenAnswer(inv -> inv.getArgument(0));

                Producto resultado = service.deshabilitarProducto(1L);

                assertFalse(resultado.isActivo());
                verify(repository).save(producto);
        }

        @Test
        void testDeshabilitarProductoNoEncontrado() {
                when(repository.findById(1L)).thenReturn(Optional.empty());

                ResponseStatusException ex = assertThrows(
                        ResponseStatusException.class,
                        () -> service.deshabilitarProducto(1L));

                assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        }

        @Test
        void testHabilitarProductoOk() {
                Producto producto = new Producto(1L, "Laptop", 2000000.0, 20, categoria, false, 0.0);

                when(repository.findById(1L)).thenReturn(Optional.of(producto));
                when(repository.save(any(Producto.class))).thenAnswer(inv -> inv.getArgument(0));

                Producto resultado = service.habilitarProducto(1L);

                assertTrue(resultado.isActivo());
                verify(repository).save(producto);
        }

        @Test
        void testHabilitarProductoNoEncontrado() {
                when(repository.findById(1L)).thenReturn(Optional.empty());

                assertThrows(
                        ResponseStatusException.class,
                        () -> service.habilitarProducto(1L));
        }

        // ---------- Descuento por id ----------

        @Test
        void testAplicarDescuentoPorIdOk() {
                Producto producto = new Producto(1L, "Laptop", 1000.0, 20, categoria);

                when(repository.findById(1L)).thenReturn(Optional.of(producto));
                when(repository.save(any(Producto.class))).thenAnswer(inv -> inv.getArgument(0));

                Producto resultado = service.aplicarDescuentoPorId(1L, 10.0);

                assertEquals(10.0, resultado.getDescuentoPorcentaje());
                assertEquals(900.0, resultado.getPrecioFinal());
                verify(repository).save(producto);
        }

        @Test
        void testAplicarDescuentoPorIdPorcentajeInvalidoNegativo() {
                assertThrows(
                        IllegalArgumentException.class,
                        () -> service.aplicarDescuentoPorId(1L, -5.0));
        }

        @Test
        void testAplicarDescuentoPorIdPorcentajeInvalidoMayor100() {
                assertThrows(
                        IllegalArgumentException.class,
                        () -> service.aplicarDescuentoPorId(1L, 150.0));
        }

        @Test
        void testAplicarDescuentoPorIdProductoNoEncontrado() {
                when(repository.findById(1L)).thenReturn(Optional.empty());

                assertThrows(
                        ResponseStatusException.class,
                        () -> service.aplicarDescuentoPorId(1L, 10.0));
        }

        @Test
        void testQuitarDescuentoOk() {
                Producto producto = new Producto(1L, "Laptop", 1000.0, 20, categoria, true, 15.0);

                when(repository.findById(1L)).thenReturn(Optional.of(producto));
                when(repository.save(any(Producto.class))).thenAnswer(inv -> inv.getArgument(0));

                Producto resultado = service.quitarDescuento(1L);

                assertEquals(0.0, resultado.getDescuentoPorcentaje());
                assertEquals(1000.0, resultado.getPrecioFinal());
        }

        // ---------- Descuento por categoría ----------

        @Test
        void testAplicarDescuentoPorCategoriaOk() {
                Producto p1 = new Producto(1L, "Laptop", 1000.0, 20, categoria);
                Producto p2 = new Producto(2L, "Mouse", 20.0, 20, categoria);
                List<Producto> productos = new ArrayList<>(List.of(p1, p2));

                when(categoriaRepository.findById(1L)).thenReturn(Optional.of(categoria));
                when(repository.findByCategoria(categoria)).thenReturn(productos);
                when(repository.saveAll(productos)).thenReturn(productos);

                List<Producto> resultado = service.aplicarDescuentoPorCategoria(1L, 20.0);

                assertEquals(2, resultado.size());
                assertTrue(resultado.stream().allMatch(p -> p.getDescuentoPorcentaje() == 20.0));
                verify(repository).saveAll(productos);
        }

        @Test
        void testAplicarDescuentoPorCategoriaSinProductos() {
                when(categoriaRepository.findById(1L)).thenReturn(Optional.of(categoria));
                when(repository.findByCategoria(categoria)).thenReturn(List.of());

                ResponseStatusException ex = assertThrows(
                        ResponseStatusException.class,
                        () -> service.aplicarDescuentoPorCategoria(1L, 20.0));

                assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        }

        @Test
        void testAplicarDescuentoPorCategoriaCategoriaNoEncontrada() {
                when(categoriaRepository.findById(1L)).thenReturn(Optional.empty());

                assertThrows(
                        RuntimeException.class,
                        () -> service.aplicarDescuentoPorCategoria(1L, 20.0));
        }

        @Test
        void testAplicarDescuentoPorCategoriaPorcentajeInvalido() {
                assertThrows(
                        IllegalArgumentException.class,
                        () -> service.aplicarDescuentoPorCategoria(1L, -1.0));
        }
}