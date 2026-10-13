package com.caso3.inventario.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.caso3.inventario.model.Categoria;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
}