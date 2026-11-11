package api.com.v1.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import api.com.v1.model.DispositivoInicioSesion;

public interface DispositivoInicioSesionRepository extends JpaRepository<DispositivoInicioSesion, Long> {

    List<DispositivoInicioSesion> findAllByUsuarioIdOrderByFechaInicioDescIdDesc(Long usuarioId);

    void deleteAllByUsuarioId(Long usuarioId);
}
