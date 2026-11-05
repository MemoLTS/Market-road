package api.com.v1.controller;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import api.com.v1.dto.CambioCorreoDTO;
import api.com.v1.dto.DispositivoInicioSesionDTO;
import api.com.v1.dto.FotoPerfilDTO;
import api.com.v1.dto.LoginRequestDTO;
import api.com.v1.dto.LoginResponseDTO;
import api.com.v1.dto.UsuarioRequestDTO;
import api.com.v1.dto.UsuarioResponseDTO;
import api.com.v1.dto.UsuarioUpdateDTO;
import api.com.v1.exception.CredencialesInvalidasException;
import api.com.v1.model.Rol;
import api.com.v1.model.Usuario;
import api.com.v1.repository.UsuarioRepository;
import api.com.v1.security.JwtUtil;
import api.com.v1.service.DispositivoInicioSesionService;
import api.com.v1.service.UsuarioService;

@ExtendWith(MockitoExtension.class)
class ControllerTest {

    @Mock
    private UsuarioService usuarioService;
    @Mock
    private DispositivoInicioSesionService dispositivoInicioSesionService;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtUtil jwtUtil;

    private AdminUsuarioController adminUsuarioController;
    private AuthController authController;
    private UsuarioController usuarioController;

    @BeforeEach
    void setUp() {
        adminUsuarioController = new AdminUsuarioController();
        authController = new AuthController();
        usuarioController = new UsuarioController();

        ReflectionTestUtils.setField(adminUsuarioController, "usuarioService", usuarioService);
        ReflectionTestUtils.setField(adminUsuarioController, "usuarioRepository", usuarioRepository);

        ReflectionTestUtils.setField(authController, "usuarioRepository", usuarioRepository);
        ReflectionTestUtils.setField(authController, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(authController, "jwtUtil", jwtUtil);
        ReflectionTestUtils.setField(authController, "dispositivoInicioSesionService", dispositivoInicioSesionService);

        ReflectionTestUtils.setField(usuarioController, "usuarioService", usuarioService);
        ReflectionTestUtils.setField(usuarioController, "dispositivoInicioSesionService",
                dispositivoInicioSesionService);
        ReflectionTestUtils.setField(usuarioController, "tamanoMaximoFoto", 5L * 1024 * 1024);
    }

    private Usuario usuario(Long id, String apodo, String correo, Rol rol) {
        Usuario u = new Usuario(id, "Nombre", "Apellido", apodo, correo, "hash1234");
        u.setCiudad("Santiago");
        u.setRol(rol);
        return u;
    }

    @Nested
    class AdminUsuarioControllerTests {

        @Test
        void listar_devuelveUsuariosCuandoElUsuarioEsSuperusuario() {
            Usuario admin = usuario(1L, "admin", "admin@correo.cl", Rol.SUPERUSUARIO);
            UsuarioResponseDTO dto = new UsuarioResponseDTO(1L, "Nombre", "Apellido", "admin", "admin@correo.cl",
                    "Santiago", "SUPERUSUARIO");

            when(usuarioRepository.findById(1L)).thenReturn(Optional.of(admin));
            when(usuarioService.obtenerTodos()).thenReturn(List.of(dto));

            ResponseEntity<List<UsuarioResponseDTO>> response = adminUsuarioController.listar(1L);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(1, response.getBody().size());
            assertEquals(dto, response.getBody().get(0));
        }

        @Test
        void listar_lanzaForbiddenCuandoElUsuarioNoEsSuperusuario() {
            Usuario usuarioNormal = usuario(2L, "juan", "juan@correo.cl", Rol.USUARIO);
            when(usuarioRepository.findById(2L)).thenReturn(Optional.of(usuarioNormal));

            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> adminUsuarioController.listar(2L));

            assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
            assertEquals("Acceso restringido al superusuario", ex.getReason());
        }

        @Test
        void listar_lanzaForbiddenCuandoElUsuarioNoExiste() {
            when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> adminUsuarioController.listar(99L));

            assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
            assertEquals("Acceso restringido al superusuario", ex.getReason());
        }
    }

    @Nested
    class AuthControllerTests {

        @Test
        void login_devuelveTokenYUsuarioCuandoLasCredencialesSonValidas() {
            String correo = "juan@correo.cl";
            String password = "Clave1234";
            String dispositivoId = UUID.randomUUID().toString();
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader("User-Agent", "Mozilla/5.0");
            Usuario usuario = usuario(10L, "juan", correo, Rol.USUARIO);
            usuario.setContrasena("hashGuardado");

            when(usuarioRepository.findByCorreo(correo)).thenReturn(Optional.of(usuario));
            when(passwordEncoder.matches(password, "hashGuardado")).thenReturn(true);
            when(jwtUtil.generarToken(10L, correo, "juan", Rol.USUARIO)).thenReturn("token-123");
            when(jwtUtil.getExpiracionMs()).thenReturn(3600000L);

            LoginResponseDTO response = authController
                    .login(new LoginRequestDTO(correo, password, dispositivoId), request)
                    .getBody();

            assertNotNull(response);
            assertEquals("token-123", response.token());
            assertEquals(3600000L, response.expiraEnMs());
            assertEquals("juan@correo.cl", response.usuario().correo());
            verify(dispositivoInicioSesionService).registrar(10L, dispositivoId, "Mozilla/5.0");
        }

        @Test
        void login_lanzaExcepcionCuandoElCorreoNoExiste() {
            String correo = "noexiste@correo.cl";
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader("User-Agent", "Chrome");

            when(usuarioRepository.findByCorreo(correo)).thenReturn(Optional.empty());

            CredencialesInvalidasException ex = assertThrows(CredencialesInvalidasException.class,
                    () -> authController.login(new LoginRequestDTO(correo, "Clave1234", UUID.randomUUID().toString()),
                            request));

            assertEquals("Correo o contraseña incorrectos", ex.getMessage());
            verify(dispositivoInicioSesionService, never()).registrar(any(), any(), any());
        }

        @Test
        void login_lanzaExcepcionCuandoLaContrasenaEsIncorrecta() {
            Usuario usuario = usuario(11L, "maria", "maria@correo.cl", Rol.USUARIO);
            usuario.setContrasena("hashGuardado");
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader("User-Agent", "Safari");

            when(usuarioRepository.findByCorreo("maria@correo.cl")).thenReturn(Optional.of(usuario));
            when(passwordEncoder.matches("PassErronea", "hashGuardado")).thenReturn(false);

            CredencialesInvalidasException ex = assertThrows(CredencialesInvalidasException.class,
                    () -> authController.login(new LoginRequestDTO("maria@correo.cl", "PassErronea",
                            UUID.randomUUID().toString()), request));

            assertEquals("Correo o contraseña incorrectos", ex.getMessage());
            verify(dispositivoInicioSesionService, never()).registrar(any(), any(), any());
        }

        @Test
        void logout_devuelveNoContent() {
            ResponseEntity<Void> response = authController.logout();

            assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        }
    }

    @Nested
    class UsuarioControllerTests {

        @Test
        void obtenerDispositivos_devuelveListaCuandoElUsuarioEsElPropietario() {
            DispositivoInicioSesionDTO dto = new DispositivoInicioSesionDTO("Chrome en Windows",
                    List.of(Instant.now(), Instant.now().minusSeconds(60)));
            when(dispositivoInicioSesionService.obtenerHistorial(7L)).thenReturn(List.of(dto));

            ResponseEntity<List<DispositivoInicioSesionDTO>> response = usuarioController.obtenerDispositivos(7L, 7L);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(1, response.getBody().size());
            assertEquals(dto, response.getBody().get(0));
        }

        @Test
        void obtenerDispositivos_lanzaForbiddenCuandoElIdNoCoincide() {
            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> usuarioController.obtenerDispositivos(7L, 8L));

            assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
            assertEquals("Solo puedes consultar tu propio historial", ex.getReason());
        }

        @Test
        void crear_devuelveCreatedConElUsuarioCreado() {
            UsuarioRequestDTO dto = new UsuarioRequestDTO("Ana", "Pérez", "ana", "ana@correo.cl", "Clave1234");
            UsuarioResponseDTO creado = new UsuarioResponseDTO(3L, "Ana", "Pérez", "ana", "ana@correo.cl",
                    "Santiago", "USUARIO");
            when(usuarioService.crear(dto)).thenReturn(creado);

            ResponseEntity<UsuarioResponseDTO> response = usuarioController.crear(dto);

            assertEquals(HttpStatus.CREATED, response.getStatusCode());
            assertEquals("/api/v1/usuarios/3", response.getHeaders().getLocation().toString());
            assertEquals(creado, response.getBody());
        }

        @Test
        void obtenerTodos_devuelveListaCompleta() {
            UsuarioResponseDTO dto = new UsuarioResponseDTO(1L, "Ana", "Pérez", "ana", "ana@correo.cl", "Santiago",
                    "USUARIO");
            when(usuarioService.obtenerTodos()).thenReturn(List.of(dto));

            ResponseEntity<List<UsuarioResponseDTO>> response = usuarioController.obtenerTodos();

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(List.of(dto), response.getBody());
        }

        @Test
        void obtenerPorId_devuelveUsuarioSolicitado() {
            UsuarioResponseDTO dto = new UsuarioResponseDTO(2L, "Luis", "Gómez", "luis", "luis@correo.cl", "Valparaíso",
                    "USUARIO");
            when(usuarioService.obtenerPorId(2L)).thenReturn(dto);

            ResponseEntity<UsuarioResponseDTO> response = usuarioController.obtenerPorId(2L);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(dto, response.getBody());
        }

        @Test
        void actualizar_devuelveUsuarioActualizadoCuandoEsElMismoUsuario() {
            UsuarioRequestDTO dto = new UsuarioRequestDTO("Luis", "Gómez", "luis", "luis@correo.cl", "Clave1234");
            UsuarioResponseDTO actualizado = new UsuarioResponseDTO(2L, "Luis", "Gómez", "luis", "luis@correo.cl",
                    "Santiago", "USUARIO");
            when(usuarioService.actualizar(2L, dto)).thenReturn(actualizado);

            ResponseEntity<UsuarioResponseDTO> response = usuarioController.actualizar(2L, 2L, dto);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(actualizado, response.getBody());
        }

        @Test
        void actualizar_lanzaForbiddenCuandoElIdNoCoincide() {
            UsuarioRequestDTO dto = new UsuarioRequestDTO("Luis", "Gómez", "luis", "luis@correo.cl", "Clave1234");

            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> usuarioController.actualizar(2L, 1L, dto));

            assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
            assertEquals("Solo puedes cambiar tu propio perfil", ex.getReason());
        }

        @Test
        void actualizarParcial_devuelveUsuarioActualizadoCuandoEsElMismoUsuario() {
            UsuarioUpdateDTO dto = new UsuarioUpdateDTO("Luis", "Gómez", "luis", "Santiago", "Clave1234");
            UsuarioResponseDTO actualizado = new UsuarioResponseDTO(2L, "Luis", "Gómez", "luis", "luis@correo.cl",
                    "Santiago", "USUARIO");
            when(usuarioService.actualizarParcial(2L, dto)).thenReturn(actualizado);

            ResponseEntity<UsuarioResponseDTO> response = usuarioController.actualizarParcial(2L, 2L, dto);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(actualizado, response.getBody());
        }

        @Test
        void actualizarParcial_lanzaForbiddenCuandoElIdNoCoincide() {
            UsuarioUpdateDTO dto = new UsuarioUpdateDTO("Luis", "Gómez", "luis", "Santiago", "Clave1234");

            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> usuarioController.actualizarParcial(2L, 1L, dto));

            assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
            assertEquals("Solo puedes cambiar tu propio perfil", ex.getReason());
        }

        @Test
        void cambiarCorreo_devuelveUsuarioActualizadoCuandoEsElMismoUsuario() {
            CambioCorreoDTO dto = new CambioCorreoDTO("nuevo@correo.cl", "ClaveActual123");
            UsuarioResponseDTO actualizado = new UsuarioResponseDTO(2L, "Luis", "Gómez", "luis", "nuevo@correo.cl",
                    "Santiago", "USUARIO");
            when(usuarioService.cambiarCorreo(2L, dto)).thenReturn(actualizado);

            ResponseEntity<UsuarioResponseDTO> response = usuarioController.cambiarCorreo(2L, 2L, dto);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(actualizado, response.getBody());
        }

        @Test
        void cambiarCorreo_lanzaForbiddenCuandoElIdNoCoincide() {
            CambioCorreoDTO dto = new CambioCorreoDTO("nuevo@correo.cl", "ClaveActual123");

            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> usuarioController.cambiarCorreo(2L, 1L, dto));

            assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
            assertEquals("Solo puedes cambiar tu propio correo", ex.getReason());
        }

        @Test
        void eliminar_devuelveNoContentYDisparaServicio() {
            doNothing().when(usuarioService).eliminar(5L);

            ResponseEntity<Void> response = usuarioController.eliminar(5L);

            assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
            verify(usuarioService).eliminar(5L);
        }

        @Test
        void actualizarFotoPerfil_devuelveNoContentCuandoLaImagenEsValida() throws Exception {
            byte[] png = new byte[] { (byte) 0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00 };
            MockMultipartFile foto = new MockMultipartFile("foto", "avatar.png", "image/png", png);

            ResponseEntity<Void> response = usuarioController.actualizarFotoPerfil(4L, 4L, foto);

            assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
            verify(usuarioService).actualizarFotoPerfil(eq(4L), eq(png), eq("image/png"));
        }

        @Test
        void actualizarFotoPerfil_lanzaForbiddenCuandoElIdNoCoincide() {
            byte[] png = new byte[] { (byte) 0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00 };
            MockMultipartFile foto = new MockMultipartFile("foto", "avatar.png", "image/png", png);

            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> usuarioController.actualizarFotoPerfil(4L, 2L, foto));

            assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
            assertEquals("Solo puedes cambiar tu propia foto de perfil", ex.getReason());
        }

        @Test
        void actualizarFotoPerfil_lanzaBadRequestCuandoLaImagenVieneVacia() {
            MockMultipartFile foto = new MockMultipartFile("foto", "avatar.png", "image/png", new byte[0]);

            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> usuarioController.actualizarFotoPerfil(4L, 4L, foto));

            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
            assertEquals("La imagen debe pesar entre 1 byte y 5 MB", ex.getReason());
        }

        @Test
        void actualizarFotoPerfil_lanzaBadRequestCuandoLaImagenTieneTipoInvalido() {
            byte[] bytes = "texto-plano".getBytes(StandardCharsets.UTF_8);
            MockMultipartFile foto = new MockMultipartFile("foto", "avatar.txt", "text/plain", bytes);

            ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                    () -> usuarioController.actualizarFotoPerfil(4L, 4L, foto));

            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
            assertEquals("La foto debe ser JPG, PNG o WEBP", ex.getReason());
        }

        @Test
        void detectarTipoImagen_reconoceJpgPngYWebp() {
            byte[] jpg = new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 'a', 'b' };
            byte[] png = new byte[] { (byte) 0x89, 'P', 'N', 'G', 0x0d, 0x0a, 0x1a, 0x0a, 'x', 'y' };
            byte[] webp = new byte[] { 'R', 'I', 'F', 'F', 0x00, 0x00, 0x00, 0x00, 'W', 'E', 'B', 'P' };

            assertEquals("image/jpeg", ReflectionTestUtils.invokeMethod(usuarioController, "detectarTipoImagen", jpg));
            assertEquals("image/png", ReflectionTestUtils.invokeMethod(usuarioController, "detectarTipoImagen", png));
            assertEquals("image/webp", ReflectionTestUtils.invokeMethod(usuarioController, "detectarTipoImagen", webp));
            assertNull((String) ReflectionTestUtils.invokeMethod(usuarioController, "detectarTipoImagen",
                    new byte[] { 1, 2, 3 }));
        }

        @Test
        void obtenerFotoPerfil_devuelveFotoPredeterminadaCuandoNoHayImagen() {
            when(usuarioService.obtenerFotoPerfil(11L)).thenReturn(Optional.empty());

            ResponseEntity<byte[]> response = usuarioController.obtenerFotoPerfil(11L);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals("image/svg+xml", response.getHeaders().getContentType().toString());
            assertNotNull(response.getBody());
            assertTrue(response.getBody().length > 0);
        }

        @Test
        void obtenerFotoPerfil_devuelveLaFotoGuardadaCuandoExiste() {
            byte[] contenido = "jpeg-bytes".getBytes(StandardCharsets.UTF_8);
            when(usuarioService.obtenerFotoPerfil(12L))
                    .thenReturn(Optional.of(new FotoPerfilDTO(contenido, "image/jpeg")));

            ResponseEntity<byte[]> response = usuarioController.obtenerFotoPerfil(12L);

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals("image/jpeg", response.getHeaders().getContentType().toString());
            assertArrayEquals(contenido, response.getBody());
        }
    }
}
