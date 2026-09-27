package com.caso3.inventario.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.caso3.inventario.dto.StockResponse;
import com.caso3.inventario.model.Categoria;
import com.caso3.inventario.model.Producto;
import com.caso3.inventario.model.ProveedorLog;
import com.caso3.inventario.repository.CategoriaRepository;
import com.caso3.inventario.repository.ProductoRepository;
import com.caso3.inventario.repository.ProveedorLogRepository;

@Service
public class InvService {
    @Autowired
    private ProductoRepository Repository;

    @Autowired
    private ProveedorLogRepository proveedorLogRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    public Categoria crearCategoria(Categoria categoria) {
        return categoriaRepository.save(categoria);
    }

    public List<Categoria> listarCategorias() {
        return categoriaRepository.findAll();
    }

    public Categoria obtenerCategoriaPorId(Long id) {
        return categoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada con id: " + id));
    }

    public Categoria actualizarCategoria(Long id, Categoria datosNuevos) {
        Categoria categoria = obtenerCategoriaPorId(id);
        categoria.setNombre(datosNuevos.getNombre());
        categoria.setDescripcion(datosNuevos.getDescripcion());
        return categoriaRepository.save(categoria);
    }

    public void eliminarCategoria(Long id) {
        Categoria categoria = obtenerCategoriaPorId(id);
        categoriaRepository.delete(categoria);
    }

    public void ingresarStock(Long idProducto, Long idProveedor, Integer cantidad) {
        Producto producto = Repository.findById(idProducto)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        ProveedorLog proveedor = proveedorLogRepository.findById(idProveedor)
                .orElseThrow(() -> new RuntimeException("Proveedor no encontrado"));
        producto.setStock(producto.getStock() + cantidad);
        Repository.save(producto);
        ProveedorLog log = new ProveedorLog();
        log.setNombreProveedor(proveedor.getNombreProveedor());
        log.setNombreProducto(producto.getNombre());
        log.setCantidadIngresada(cantidad);
        log.setFecha(LocalDateTime.now());
        proveedorLogRepository.save(log);
    }

    public List<Producto> readAllProd() {
        return Repository.findAll();
    }

    public Optional<Producto> readByid(Long id){
        return Repository.findById(id);
    }

    public StockResponse verificarDisponibilidad(Long id, Integer cantidad) {
        Producto producto = Repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        return new StockResponse(
                producto.getId(),
                producto.getNombre(),
                producto.getStock(),
                producto.getStock() >= cantidad
        );
    }

    public StockResponse verificarBajoStock(Long id) {
        Producto producto = Repository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Producto no encontrado"));
        return new StockResponse(
                producto.getId(),
                producto.getNombre(),
                producto.getStock(),
                true,
                producto.getStock() <= 10
        );
    }

    public StockResponse consultarStock(Long idProducto) {
        Producto producto = Repository.findById(idProducto)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        return new StockResponse(
                producto.getId(),
                producto.getNombre(),
                producto.getStock());
    }

    public Producto updateProducto(Long id, Producto datosNuevos) {
        Producto existente = Repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        existente.setNombre(datosNuevos.getNombre());
        existente.setPrecio(datosNuevos.getPrecio());
        existente.setStock(datosNuevos.getStock());
        existente.setCategoria(datosNuevos.getCategoria());
        return Repository.save(existente);
    }

    public Producto register(Producto producto) {
        if (producto == null) {
            throw new IllegalArgumentException("Producto no puede ser nulo");
        }
        if (producto.getNombre() == null || producto.getNombre().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre del producto es obligatorio");
        }
        if (producto.getNombre().length() < 3) {
            throw new IllegalArgumentException("El nombre debe tener al menos 3 caracteres");
        }
        if (producto.getPrecio() == null || producto.getPrecio() < 0) {
            throw new IllegalArgumentException("El precio debe ser mayor o igual a 0");
        }
        if (producto.getStock() < 0) {
            throw new IllegalArgumentException("El stock no puede ser negativo");
        }
        if (producto.getCategoria() == null ||
        producto.getCategoria().getId() == null) {
        throw new IllegalArgumentException("La categoría es obligatoria");
        }
        Categoria categoria = categoriaRepository.findById(producto.getCategoria().getId())
            .orElseThrow(() ->
                    new RuntimeException("La categoría no existe"));
        producto.setCategoria(categoria);
        return Repository.save(producto);
    }

    public Producto updateStock(Long id, int cantidad) {
        if (id == null) {
            throw new IllegalArgumentException("El id no puede ser nulo");
        }
        if (cantidad < 0) {
            throw new IllegalArgumentException("La cantidad no puede ser negativa");
        }
        Producto producto = Repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
        producto.setStock(cantidad);
        return Repository.save(producto);
    }

    public void deleteById(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("El id no puede ser nulo");
        }
        if (!Repository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado");
        }
        Repository.deleteById(id);
    }
    public List<Producto> obtenerPorCategoria(String categoria) {
        return Repository.findAll()
                .stream()
                .filter(p -> p.getCategoria() != null &&
                        p.getCategoria().toString()
                                .equalsIgnoreCase(categoria))
                .toList();
    }

    public List<Producto> buscarPorCategoria(Categoria categoria) {
        return Repository.findByCategoria(categoria);
    }

    public Producto deshabilitarProducto(Long id) {
        Producto producto = Repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
        producto.setActivo(false);
        return Repository.save(producto);
    }

    public Producto habilitarProducto(Long id) {
        Producto producto = Repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
        producto.setActivo(true);
        return Repository.save(producto);
    }

    public Producto aplicarDescuentoPorId(Long id, double porcentaje) {
        if (porcentaje < 0 || porcentaje > 100) {
            throw new IllegalArgumentException("El descuento debe estar entre 0 y 100");
        }
        Producto producto = Repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
        producto.setDescuentoPorcentaje(porcentaje);
        return Repository.save(producto);
    }

    public List<Producto> aplicarDescuentoPorCategoria(Long idCategoria, double porcentaje) {
        if (porcentaje < 0 || porcentaje > 100) {
            throw new IllegalArgumentException("El descuento debe estar entre 0 y 100");
        }
        Categoria categoria = obtenerCategoriaPorId(idCategoria);
        List<Producto> productos = Repository.findByCategoria(categoria);
        if (productos.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No hay productos para la categoría con id: " + idCategoria);
        }
        productos.forEach(p -> p.setDescuentoPorcentaje(porcentaje));
        return Repository.saveAll(productos);
    }

    public Producto quitarDescuento(Long id) {
        Producto producto = Repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Producto no encontrado"));
        producto.setDescuentoPorcentaje(0.0);
        return Repository.save(producto);
    }
}