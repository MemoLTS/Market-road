package api.com.v1.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import api.com.v1.model.DispositivoInicioSesion;

@Repository
public interface DispositivoInicioSesionRepository extends JpaRepository<DispositivoInicioSesion, Long> {

    List<DispositivoInicioSesion> findAllByUsuarioIdOrderByFechaInicioDescIdDesc(Long usuarioId);

    void deleteAllByUsuarioId(Long usuarioId);
}
