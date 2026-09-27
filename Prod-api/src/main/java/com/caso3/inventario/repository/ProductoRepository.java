package com.caso3.inventario.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.caso3.inventario.model.Categoria;
import com.caso3.inventario.model.Producto;

public interface ProductoRepository extends JpaRepository<Producto, Long> {
    List<Producto> findByCategoria(Categoria categoria);
}
