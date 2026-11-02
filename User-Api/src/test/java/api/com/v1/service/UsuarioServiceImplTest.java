package api.com.v1.service;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import api.com.v1.dto.CambioCorreoDTO;
import api.com.v1.dto.FotoPerfilDTO;
import api.com.v1.dto.UsuarioRequestDTO;
import api.com.v1.dto.UsuarioResponseDTO;
import api.com.v1.dto.UsuarioUpdateDTO;
import api.com.v1.exception.CredencialesInvalidasException;
import api.com.v1.exception.RecursoDuplicadoException;
import api.com.v1.exception.RecursoNoEncontradoException;
import api.com.v1.model.FotoPerfil;
import api.com.v1.model.Rol;
import api.com.v1.model.Usuario;
import api.com.v1.repository.DispositivoInicioSesionRepository;
import api.com.v1.repository.FotoPerfilRepository;
import api.com.v1.repository.UsuarioRepository;


@ExtendWith(MockitoExtension.class)
class UsuarioServiceImplTest {

    private static final Long ID = 1L;
    private static final Long OTRO_ID = 2L;

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private FotoPerfilRepository fotoPerfilRepository;
    @Mock
    private DispositivoInicioSesionRepository dispositivoInicioSesionRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UsuarioServiceImpl servicio;

    private Usuario usuario(Long id, String apodo, String correo) {
        Usuario u = new Usuario(id, "Juan", "Perez", apodo, correo, "hash-actual");
        u.setCiudad("Santiago");
        return u;
    }

    private UsuarioRequestDTO request(String apodo, String correo) {
        return new UsuarioRequestDTO("Maria", "Gonzalez", apodo, correo, "Clave1234");
    }

    private UsuarioUpdateDTO update(String nombre, String apellido, String apodo, String ciudad, String contrasena) {
        return new UsuarioUpdateDTO(nombre, apellido, apodo, ciudad, contrasena);
    }

    private void guardaTalCual() {
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Nested
    @DisplayName("crear")
    class Crear {

        @Test
        void creaUsuarioCodificandoLaContrasenaYSinCiudad() {
            when(usuarioRepository.existsByCorreo("maria@correo.cl")).thenReturn(false);
            when(usuarioRepository.existsByApodo("mari")).thenReturn(false);
            when(passwordEncoder.encode("Clave1234")).thenReturn("hash-nuevo");
            when(usuarioRepository.save(any(Usuario.class))).thenAnswer(inv -> {
                Usuario u = inv.getArgument(0);
                u.setId(10L);
                return u;
            });

            UsuarioResponseDTO resultado = servicio.crear(request("mari", "maria@correo.cl"));

            ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
            verify(usuarioRepository).save(captor.capture());
            Usuario guardado = captor.getValue();
            assertEquals("Maria", guardado.getNombre());
            assertEquals("Gonzalez", guardado.getApellido());
            assertEquals("mari", guardado.getApodo());
            assertEquals("maria@correo.cl", guardado.getCorreo());
            assertEquals("hash-nuevo", guardado.getContrasena());
            assertNull(guardado.getCiudad());
            assertEquals(Rol.USUARIO, guardado.getRol());

            assertEquals(10L, resultado.id());
            assertEquals("maria@correo.cl", resultado.correo());
            assertEquals("USUARIO", resultado.rol());
        }

        @Test
        void nuncaExponeLaContrasenaEnLaRespuesta() {
            when(passwordEncoder.encode(anyString())).thenReturn("hash-nuevo");
            guardaTalCual();

            UsuarioResponseDTO resultado = servicio.crear(request(null, "maria@correo.cl"));

            assertTrue(!resultado.toString().contains("hash-nuevo"));
            assertTrue(!resultado.toString().contains("Clave1234"));
        }

        @Test
        void recortaEspaciosDelApodo() {
            when(usuarioRepository.existsByApodo("mari")).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("hash");
            guardaTalCual();

            UsuarioResponseDTO resultado = servicio.crear(request("  mari  ", "maria@correo.cl"));

            assertEquals("mari", resultado.apodo());
            verify(usuarioRepository).existsByApodo("mari");
        }

        @Test
        void apodoEnBlancoSeGuardaComoNuloYNoConsultaDisponibilidad() {
            when(passwordEncoder.encode(anyString())).thenReturn("hash");
            guardaTalCual();

            UsuarioResponseDTO resultado = servicio.crear(request("   ", "maria@correo.cl"));

            assertNull(resultado.apodo());
            verify(usuarioRepository, never()).existsByApodo(anyString());
        }

        @Test
        void apodoNuloSeGuardaComoNulo() {
            when(passwordEncoder.encode(anyString())).thenReturn("hash");
            guardaTalCual();

            assertNull(servicio.crear(request(null, "maria@correo.cl")).apodo());
            verify(usuarioRepository, never()).existsByApodo(anyString());
        }

        @Test
        void rechazaCorreoDuplicadoSinGuardarNiCodificar() {
            when(usuarioRepository.existsByCorreo("maria@correo.cl")).thenReturn(true);

            RecursoDuplicadoException ex = assertThrows(RecursoDuplicadoException.class,
                    () -> servicio.crear(request("mari", "maria@correo.cl")));

            assertEquals("Ya existe un usuario registrado con ese correo", ex.getMessage());
            verify(usuarioRepository, never()).save(any());
            verifyNoInteractions(passwordEncoder);
        }

        @Test
        void rechazaApodoDuplicadoSinGuardarNiCodificar() {
            when(usuarioRepository.existsByApodo("mari")).thenReturn(true);

            RecursoDuplicadoException ex = assertThrows(RecursoDuplicadoException.class,
                    () -> servicio.crear(request("mari", "maria@correo.cl")));

            assertEquals("Ya existe un usuario registrado con ese apodo", ex.getMessage());
            verify(usuarioRepository, never()).save(any());
            verifyNoInteractions(passwordEncoder);
        }
    }

    @Nested
    @DisplayName("obtenerTodos / obtenerPorId")
    class Consultas {

        @Test
        void obtenerTodosMapeaCadaUsuarioAlDTO() {
            Usuario admin = usuario(OTRO_ID, null, "admin@correo.cl");
            admin.setRol(Rol.SUPERUSUARIO);
            when(usuarioRepository.findAll()).thenReturn(List.of(usuario(ID, "juan", "juan@correo.cl"), admin));

            List<UsuarioResponseDTO> resultado = servicio.obtenerTodos();

            assertEquals(2, resultado.size());
            assertEquals(new UsuarioResponseDTO(ID, "Juan", "Perez", "juan", "juan@correo.cl", "Santiago", "USUARIO"),
                    resultado.get(0));
            assertEquals("SUPERUSUARIO", resultado.get(1).rol());
        }

        @Test
        void obtenerTodosDevuelveListaVaciaSiNoHayUsuarios() {
            when(usuarioRepository.findAll()).thenReturn(List.of());

            assertTrue(servicio.obtenerTodos().isEmpty());
        }

        @Test
        void obtenerPorIdDevuelveElUsuario() {
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(usuario(ID, "juan", "juan@correo.cl")));

            UsuarioResponseDTO resultado = servicio.obtenerPorId(ID);

            assertEquals(ID, resultado.id());
            assertEquals("juan@correo.cl", resultado.correo());
        }

        @Test
        void obtenerPorIdLanzaSiNoExiste() {
            when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

            RecursoNoEncontradoException ex = assertThrows(RecursoNoEncontradoException.class,
                    () -> servicio.obtenerPorId(99L));

            assertEquals("No se encontró el usuario con id 99", ex.getMessage());
        }
    }

    @Nested
    @DisplayName("actualizar (PUT)")
    class Actualizar {

        @Test
        void actualizaLosDatosYCodificaLaNuevaContrasena() {
            Usuario existente = usuario(ID, "juan", "juan@correo.cl");
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(existente));
            when(usuarioRepository.findByApodo("mari")).thenReturn(Optional.empty());
            when(passwordEncoder.encode("Clave1234")).thenReturn("hash-nuevo");
            guardaTalCual();

            UsuarioResponseDTO resultado = servicio.actualizar(ID, request("mari", "juan@correo.cl"));

            assertEquals("Maria", resultado.nombre());
            assertEquals("Gonzalez", resultado.apellido());
            assertEquals("mari", resultado.apodo());
            assertEquals("hash-nuevo", existente.getContrasena());
            assertEquals("Santiago", existente.getCiudad(), "La ciudad no se modifica en el PUT");
        }

        @Test
        void aceptaElMismoCorreoSinDistinguirMayusculas() {
            Usuario existente = usuario(ID, null, "juan@correo.cl");
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(existente));
            when(passwordEncoder.encode(anyString())).thenReturn("hash");
            guardaTalCual();

            servicio.actualizar(ID, request(null, "JUAN@Correo.CL"));

            assertEquals("juan@correo.cl", existente.getCorreo(), "El correo no cambia");
        }

        @Test
        void rechazaCambiarElCorreoPorEstaVia() {
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(usuario(ID, null, "juan@correo.cl")));

            CredencialesInvalidasException ex = assertThrows(CredencialesInvalidasException.class,
                    () -> servicio.actualizar(ID, request(null, "otro@correo.cl")));

            assertEquals("Usa la opción de cambio de correo con tu contraseña actual", ex.getMessage());
            verify(usuarioRepository, never()).save(any());
        }

        @Test
        void rechazaApodoUsadoPorOtroUsuario() {
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(usuario(ID, "juan", "juan@correo.cl")));
            when(usuarioRepository.findByApodo("mari"))
                    .thenReturn(Optional.of(usuario(OTRO_ID, "mari", "otra@correo.cl")));

            assertThrows(RecursoDuplicadoException.class,
                    () -> servicio.actualizar(ID, request("mari", "juan@correo.cl")));

            verify(usuarioRepository, never()).save(any());
        }

        @Test
        void permiteConservarSuPropioApodo() {
            Usuario existente = usuario(ID, "juan", "juan@correo.cl");
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(existente));
            when(usuarioRepository.findByApodo("juan")).thenReturn(Optional.of(existente));
            when(passwordEncoder.encode(anyString())).thenReturn("hash");
            guardaTalCual();

            assertEquals("juan", servicio.actualizar(ID, request("juan", "juan@correo.cl")).apodo());
        }

        @Test
        void apodoEnBlancoLoBorra() {
            Usuario existente = usuario(ID, "juan", "juan@correo.cl");
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(existente));
            when(passwordEncoder.encode(anyString())).thenReturn("hash");
            guardaTalCual();

            assertNull(servicio.actualizar(ID, request("  ", "juan@correo.cl")).apodo());
            verify(usuarioRepository, never()).findByApodo(anyString());
        }

        @Test
        void lanzaSiElUsuarioNoExiste() {
            when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

            assertThrows(RecursoNoEncontradoException.class,
                    () -> servicio.actualizar(99L, request(null, "juan@correo.cl")));
        }
    }

    @Nested
    @DisplayName("actualizarParcial (PATCH)")
    class ActualizarParcial {

        @Test
        void sinCamposNoModificaNada() {
            Usuario existente = usuario(ID, "juan", "juan@correo.cl");
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(existente));
            guardaTalCual();

            UsuarioResponseDTO resultado = servicio.actualizarParcial(ID, update(null, null, null, null, null));

            assertEquals("Juan", resultado.nombre());
            assertEquals("Perez", resultado.apellido());
            assertEquals("juan", resultado.apodo());
            assertEquals("Santiago", resultado.ciudad());
            assertEquals("hash-actual", existente.getContrasena());
            verifyNoInteractions(passwordEncoder);
        }

        @Test
        void actualizaSoloLosCamposRecibidos() {
            Usuario existente = usuario(ID, "juan", "juan@correo.cl");
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(existente));
            guardaTalCual();

            UsuarioResponseDTO resultado = servicio.actualizarParcial(ID, update("Pedro", null, null, null, null));

            assertEquals("Pedro", resultado.nombre());
            assertEquals("Perez", resultado.apellido());
            assertEquals("juan", resultado.apodo());
        }

        @Test
        void actualizaNombreApellidoCiudadYContrasena() {
            Usuario existente = usuario(ID, "juan", "juan@correo.cl");
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(existente));
            when(passwordEncoder.encode("Nueva1234")).thenReturn("hash-nuevo");
            guardaTalCual();

            UsuarioResponseDTO resultado = servicio.actualizarParcial(ID,
                    update("Pedro", "Soto", null, "  Valparaíso  ", "Nueva1234"));

            assertEquals("Pedro", resultado.nombre());
            assertEquals("Soto", resultado.apellido());
            assertEquals("Valparaíso", resultado.ciudad(), "La ciudad se recorta");
            assertEquals("hash-nuevo", existente.getContrasena());
        }

        @Test
        void ciudadEnBlancoLaBorra() {
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(usuario(ID, null, "juan@correo.cl")));
            guardaTalCual();

            assertNull(servicio.actualizarParcial(ID, update(null, null, null, "   ", null)).ciudad());
        }

        @Test
        void apodoEnBlancoLoBorraSinConsultarDisponibilidad() {
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(usuario(ID, "juan", "juan@correo.cl")));
            guardaTalCual();

            assertNull(servicio.actualizarParcial(ID, update(null, null, "", null, null)).apodo());
            verify(usuarioRepository, never()).findByApodo(anyString());
        }

        @Test
        void asignaApodoDisponible() {
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(usuario(ID, null, "juan@correo.cl")));
            when(usuarioRepository.findByApodo("nuevo")).thenReturn(Optional.empty());
            guardaTalCual();

            assertEquals("nuevo", servicio.actualizarParcial(ID, update(null, null, "nuevo", null, null)).apodo());
        }

        @Test
        void rechazaApodoUsadoPorOtroUsuario() {
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(usuario(ID, "juan", "juan@correo.cl")));
            when(usuarioRepository.findByApodo("mari"))
                    .thenReturn(Optional.of(usuario(OTRO_ID, "mari", "otra@correo.cl")));

            assertThrows(RecursoDuplicadoException.class,
                    () -> servicio.actualizarParcial(ID, update(null, null, "mari", null, null)));

            verify(usuarioRepository, never()).save(any());
        }

        @Test
        void permiteReenviarSuPropioApodo() {
            Usuario existente = usuario(ID, "juan", "juan@correo.cl");
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(existente));
            when(usuarioRepository.findByApodo("juan")).thenReturn(Optional.of(existente));
            guardaTalCual();

            assertEquals("juan", servicio.actualizarParcial(ID, update(null, null, "juan", null, null)).apodo());
        }

        @Test
        void lanzaSiElUsuarioNoExiste() {
            when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

            assertThrows(RecursoNoEncontradoException.class,
                    () -> servicio.actualizarParcial(99L, update("Pedro", null, null, null, null)));
        }
    }

    @Nested
    @DisplayName("cambiarCorreo")
    class CambiarCorreo {

        @Test
        void cambiaElCorreoSiLaContrasenaEsCorrectaYElNuevoEstaLibre() {
            Usuario existente = usuario(ID, "juan", "juan@correo.cl");
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(existente));
            when(passwordEncoder.matches("Clave1234", "hash-actual")).thenReturn(true);
            when(usuarioRepository.findByCorreo("nuevo@correo.cl")).thenReturn(Optional.empty());
            guardaTalCual();

            UsuarioResponseDTO resultado = servicio.cambiarCorreo(ID,
                    new CambioCorreoDTO("  nuevo@correo.cl  ", "Clave1234"));

            assertEquals("nuevo@correo.cl", resultado.correo(), "El correo se recorta");
            assertEquals("nuevo@correo.cl", existente.getCorreo());
        }

        @Test
        void rechazaContrasenaActualIncorrectaSinGuardar() {
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(usuario(ID, null, "juan@correo.cl")));
            when(passwordEncoder.matches("mala", "hash-actual")).thenReturn(false);

            CredencialesInvalidasException ex = assertThrows(CredencialesInvalidasException.class,
                    () -> servicio.cambiarCorreo(ID, new CambioCorreoDTO("nuevo@correo.cl", "mala")));

            assertEquals("La contraseña actual no es correcta", ex.getMessage());
            verify(usuarioRepository, never()).findByCorreo(anyString());
            verify(usuarioRepository, never()).save(any());
        }

        @Test
        void rechazaCorreoUsadoPorOtroUsuario() {
            Usuario existente = usuario(ID, null, "juan@correo.cl");
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(existente));
            when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
            when(usuarioRepository.findByCorreo("ocupado@correo.cl"))
                    .thenReturn(Optional.of(usuario(OTRO_ID, null, "ocupado@correo.cl")));

            RecursoDuplicadoException ex = assertThrows(RecursoDuplicadoException.class,
                    () -> servicio.cambiarCorreo(ID, new CambioCorreoDTO("ocupado@correo.cl", "Clave1234")));

            assertEquals("Ya existe un usuario registrado con ese correo", ex.getMessage());
            assertEquals("juan@correo.cl", existente.getCorreo());
            verify(usuarioRepository, never()).save(any());
        }

        @Test
        void permiteReenviarSuPropioCorreo() {
            Usuario existente = usuario(ID, null, "juan@correo.cl");
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(existente));
            when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
            when(usuarioRepository.findByCorreo("juan@correo.cl")).thenReturn(Optional.of(existente));
            guardaTalCual();

            assertEquals("juan@correo.cl",
                    servicio.cambiarCorreo(ID, new CambioCorreoDTO("juan@correo.cl", "Clave1234")).correo());
        }

        @Test
        void lanzaSiElUsuarioNoExiste() {
            when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

            assertThrows(RecursoNoEncontradoException.class,
                    () -> servicio.cambiarCorreo(99L, new CambioCorreoDTO("nuevo@correo.cl", "Clave1234")));

            verifyNoInteractions(passwordEncoder);
        }
    }

    @Nested
    @DisplayName("eliminar")
    class Eliminar {

        @Test
        void borraDispositivosFotoYUsuarioEnEseOrden() {
            Usuario existente = usuario(ID, "juan", "juan@correo.cl");
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(existente));

            servicio.eliminar(ID);

            InOrder orden = inOrder(dispositivoInicioSesionRepository, fotoPerfilRepository, usuarioRepository);
            orden.verify(dispositivoInicioSesionRepository).deleteAllByUsuarioId(ID);
            orden.verify(fotoPerfilRepository).deleteById(ID);
            orden.verify(usuarioRepository).delete(existente);
        }

        @Test
        void siNoExisteLanzaYNoBorraNada() {
            when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

            assertThrows(RecursoNoEncontradoException.class, () -> servicio.eliminar(99L));

            verifyNoInteractions(dispositivoInicioSesionRepository, fotoPerfilRepository);
            verify(usuarioRepository, never()).delete(any());
        }
    }

    @Nested
    @DisplayName("foto de perfil")
    class Foto {

        private final byte[] contenido = { 1, 2, 3, 4 };

        @Test
        void creaUnaFotoNuevaSiElUsuarioNoTeniaUna() {
            Usuario existente = usuario(ID, null, "juan@correo.cl");
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(existente));
            when(fotoPerfilRepository.findById(ID)).thenReturn(Optional.empty());

            servicio.actualizarFotoPerfil(ID, contenido, "image/png");

            ArgumentCaptor<FotoPerfil> captor = ArgumentCaptor.forClass(FotoPerfil.class);
            verify(fotoPerfilRepository).save(captor.capture());
            FotoPerfil guardada = captor.getValue();
            assertSame(existente, guardada.getUsuario());
            assertArrayEquals(contenido, guardada.getContenido());
            assertEquals("image/png", guardada.getTipoContenido());
        }

        @Test
        void reemplazaLaFotoExistenteSinCrearOtra() {
            Usuario existente = usuario(ID, null, "juan@correo.cl");
            FotoPerfil anterior = new FotoPerfil();
            anterior.setContenido(new byte[] { 9 });
            anterior.setTipoContenido("image/jpeg");
            when(usuarioRepository.findById(ID)).thenReturn(Optional.of(existente));
            when(fotoPerfilRepository.findById(ID)).thenReturn(Optional.of(anterior));

            servicio.actualizarFotoPerfil(ID, contenido, "image/png");

            ArgumentCaptor<FotoPerfil> captor = ArgumentCaptor.forClass(FotoPerfil.class);
            verify(fotoPerfilRepository).save(captor.capture());
            assertSame(anterior, captor.getValue());
            assertArrayEquals(contenido, anterior.getContenido());
            assertEquals("image/png", anterior.getTipoContenido());
        }

        @Test
        void noGuardaFotoSiElUsuarioNoExiste() {
            when(usuarioRepository.findById(99L)).thenReturn(Optional.empty());

            assertThrows(RecursoNoEncontradoException.class,
                    () -> servicio.actualizarFotoPerfil(99L, contenido, "image/png"));

            verifyNoInteractions(fotoPerfilRepository);
        }

        @Test
        void obtenerFotoDevuelveContenidoYTipo() {
            FotoPerfil foto = new FotoPerfil();
            foto.setContenido(contenido);
            foto.setTipoContenido("image/webp");
            when(fotoPerfilRepository.findById(ID)).thenReturn(Optional.of(foto));

            Optional<FotoPerfilDTO> resultado = servicio.obtenerFotoPerfil(ID);

            assertTrue(resultado.isPresent());
            assertArrayEquals(contenido, resultado.get().contenido());
            assertEquals("image/webp", resultado.get().tipoContenido());
        }

        @Test
        void obtenerFotoDevuelveVacioSiNoHay() {
            when(fotoPerfilRepository.findById(ID)).thenReturn(Optional.empty());

            assertTrue(servicio.obtenerFotoPerfil(ID).isEmpty());
        }
    }
}
