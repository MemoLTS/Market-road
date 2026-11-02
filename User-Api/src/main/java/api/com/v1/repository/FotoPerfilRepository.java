package api.com.v1.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import api.com.v1.model.FotoPerfil;

@Repository
public interface FotoPerfilRepository extends JpaRepository<FotoPerfil, Long> {
}
