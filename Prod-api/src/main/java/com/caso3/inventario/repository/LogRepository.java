package com.caso3.inventario.repository;
import com.caso3.inventario.dto.LogDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LogRepository extends JpaRepository<LogDTO, Long> {

}