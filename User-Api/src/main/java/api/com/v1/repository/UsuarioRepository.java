package api.com.v1.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import api.com.v1.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByCorreo(String correo);

    Optional<Usuario> findByApodo(String apodo);

    boolean existsByCorreo(String correo);

    boolean existsByApodo(String apodo);
}
