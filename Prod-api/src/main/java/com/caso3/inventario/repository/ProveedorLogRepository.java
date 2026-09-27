package com.caso3.inventario.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.caso3.inventario.model.ProveedorLog;

@Repository
public interface ProveedorLogRepository extends JpaRepository<ProveedorLog, Long> {
}