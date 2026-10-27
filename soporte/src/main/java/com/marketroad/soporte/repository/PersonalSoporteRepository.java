package com.marketroad.soporte.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.marketroad.soporte.model.PersonalSoporte;
import com.marketroad.soporte.model.RolPersonal;

public interface PersonalSoporteRepository extends JpaRepository<PersonalSoporte, Long> {
    Optional<PersonalSoporte> findByCorreo(String correo);

    boolean existsByCorreo(String correo);

    long countByRolAndActivoTrue(RolPersonal rol);

    List<PersonalSoporte> findAllByOrderByNombreAsc();
}
