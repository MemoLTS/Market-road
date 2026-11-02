package api.com.v1.model;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class UsuarioRolTest {

    @Test
    void unUsuarioNuevoNuncaEsSuperusuarioPorDefecto() {
        assertEquals(Rol.USUARIO, new Usuario().getRol());
        assertEquals(Rol.USUARIO, new Usuario(1L, "Ana", "Pérez", "anap", "ana@example.com", "hash").getRol());
    }
}
