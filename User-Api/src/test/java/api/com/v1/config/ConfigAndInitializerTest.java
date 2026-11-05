package api.com.v1.config;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import api.com.v1.model.Rol;
import api.com.v1.model.Usuario;
import api.com.v1.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class ConfigAndInitializerTest {

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    @Test
    void seguridadConfig_creaPasswordEncoderConBCrypt() {
        SeguridadConfig config = new SeguridadConfig();

        PasswordEncoder encoder = config.passwordEncoder();

        assertNotNull(encoder);
        String hash = encoder.encode("Clave1234");
        assertTrue(encoder.matches("Clave1234", hash));
    }

    @Test
    void superusuarioInicializador_noCreaNadaCuandoEstaDeshabilitado() {
        SuperusuarioInicializador inicializador = new SuperusuarioInicializador();
        ReflectionTestUtils.setField(inicializador, "usuarioRepository", usuarioRepository);
        ReflectionTestUtils.setField(inicializador, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(inicializador, "habilitado", false);

        inicializador.run(new DefaultApplicationArguments());

        verify(usuarioRepository, never()).findByCorreo(anyString());
        verify(usuarioRepository, never()).save(any(Usuario.class));
    }

    @Test
    void superusuarioInicializador_creaSuperusuarioCuandoNoExiste() {
        SuperusuarioInicializador inicializador = new SuperusuarioInicializador();
        ReflectionTestUtils.setField(inicializador, "usuarioRepository", usuarioRepository);
        ReflectionTestUtils.setField(inicializador, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(inicializador, "habilitado", true);
        ReflectionTestUtils.setField(inicializador, "correo", "admin@marketroad.local");
        ReflectionTestUtils.setField(inicializador, "contrasena", "Admin12345");
        ReflectionTestUtils.setField(inicializador, "nombre", "Super");
        ReflectionTestUtils.setField(inicializador, "apellido", "Usuario");
        ReflectionTestUtils.setField(inicializador, "apodo", "superadmin");

        when(usuarioRepository.findByCorreo("admin@marketroad.local")).thenReturn(Optional.empty());
        when(usuarioRepository.existsByApodo("superadmin")).thenReturn(false);
        when(passwordEncoder.encode("Admin12345")).thenReturn("hash-super");

        inicializador.run(new DefaultApplicationArguments());

        verify(usuarioRepository).save(any(Usuario.class));
        verify(usuarioRepository).existsByApodo("superadmin");
    }

    @Test
    void superusuarioInicializador_noCreaSiYaExisteComoUsuarioNormal() {
        SuperusuarioInicializador inicializador = new SuperusuarioInicializador();
        ReflectionTestUtils.setField(inicializador, "usuarioRepository", usuarioRepository);
        ReflectionTestUtils.setField(inicializador, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(inicializador, "habilitado", true);
        ReflectionTestUtils.setField(inicializador, "correo", "admin@marketroad.local");

        Usuario existente = new Usuario(1L, "Ana", "García", "ana", "admin@marketroad.local", "hash");
        existente.setRol(Rol.USUARIO);
        when(usuarioRepository.findByCorreo("admin@marketroad.local")).thenReturn(Optional.of(existente));

        inicializador.run(new DefaultApplicationArguments());

        verify(usuarioRepository, never()).save(any(Usuario.class));
    }

    @Test
    void usuarioSchemaMigration_agregaCiudadSiNoExiste() {
        UsuarioSchemaMigration migration = new UsuarioSchemaMigration();
        JdbcTemplate jdbcTemplate = org.mockito.Mockito.mock(JdbcTemplate.class);
        ReflectionTestUtils.setField(migration, "jdbcTemplate", jdbcTemplate);

        when(jdbcTemplate.queryForObject(anyString(), any(Class.class))).thenReturn(0);

        migration.run(new DefaultApplicationArguments());

        verify(jdbcTemplate).execute(org.mockito.ArgumentMatchers.contains("ALTER TABLE usuarios ADD COLUMN ciudad"));
    }

    @Test
    void usuarioSchemaMigration_noCreaCiudadSiYaExiste() {
        UsuarioSchemaMigration migration = new UsuarioSchemaMigration();
        JdbcTemplate jdbcTemplate = org.mockito.Mockito.mock(JdbcTemplate.class);
        ReflectionTestUtils.setField(migration, "jdbcTemplate", jdbcTemplate);

        when(jdbcTemplate.queryForObject(anyString(), any(Class.class))).thenReturn(1);

        migration.run(new DefaultApplicationArguments());

        verify(jdbcTemplate, never()).execute(org.mockito.ArgumentMatchers.contains("ADD COLUMN ciudad"));
    }
}
