package api.com.v1.model;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class UsuarioConstructorTest {

    @Test
    void constructorConTodosLosArgumentosInicializaLosCampos() {
        Usuario usuario = new Usuario(7L, "Ana", "Pérez", "anap", "ana@example.com", "hash");

        assertAll(
                () -> assertEquals(7L, usuario.getId()),
                () -> assertEquals("Ana", usuario.getNombre()),
                () -> assertEquals("Pérez", usuario.getApellido()),
                () -> assertEquals("anap", usuario.getApodo()),
                () -> assertEquals("ana@example.com", usuario.getCorreo()),
                () -> assertEquals("hash", usuario.getContrasena()));
    }
}
