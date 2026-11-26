package api.com.v1;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;

import api.com.v1.controller.AdminUsuarioController;
import api.com.v1.controller.AuthController;
import api.com.v1.dto.EstadoUsuarioDTO;
import api.com.v1.dto.LoginRequestDTO;
import api.com.v1.dto.UsuarioResponseDTO;
import api.com.v1.model.Rol;
import api.com.v1.model.Usuario;
import api.com.v1.repository.FotoPerfilRepository;
import api.com.v1.repository.DispositivoInicioSesionRepository;
import api.com.v1.repository.UsuarioRepository;
import api.com.v1.security.ControlAccesoUsuariosFilter;
import api.com.v1.security.JwtUtil;
import api.com.v1.service.DispositivoInicioSesionService;
import api.com.v1.service.UsuarioService;
import api.com.v1.service.UsuarioServiceImpl;

/** Deshabilitar y eliminar cuentas: servicio, rutas del superusuario, login y filtro de acceso. */
class DeshabilitarUsuarioTest {

    private UsuarioRepository repo;
    private UsuarioService servicioMock;
    private AdminUsuarioController admin;

    private Usuario usuario(Long id, Rol rol, boolean activo) {
        Usuario u = new Usuario(id, "Nombre", "Apellido", "u" + id, "u" + id + "@correo.cl", "hash");
        u.setRol(rol);
        u.setActivo(activo);
        return u;
    }

    @BeforeEach
    void preparar() {
        repo = mock(UsuarioRepository.class);
        servicioMock = mock(UsuarioService.class);
        admin = new AdminUsuarioController();
        ReflectionTestUtils.setField(admin, "usuarioService", servicioMock);
        ReflectionTestUtils.setField(admin, "usuarioRepository", repo);
        when(repo.findById(1L)).thenReturn(Optional.of(usuario(1L, Rol.SUPERUSUARIO, true)));
        when(repo.findById(2L)).thenReturn(Optional.of(usuario(2L, Rol.USUARIO, true)));
        when(repo.findById(3L)).thenReturn(Optional.of(usuario(3L, Rol.SUPERUSUARIO, true)));
    }

    // ------------------------------------------------------------------ servicio

    @Test
    void elServicioDeshabilitaYHabilitaLaCuenta() {
        UsuarioServiceImpl servicio = new UsuarioServiceImpl();
        ReflectionTestUtils.setField(servicio, "usuarioRepository", repo);
        ReflectionTestUtils.setField(servicio, "fotoPerfilRepository", mock(FotoPerfilRepository.class));
        ReflectionTestUtils.setField(servicio, "dispositivoInicioSesionRepository", mock(DispositivoInicioSesionRepository.class));
        ReflectionTestUtils.setField(servicio, "passwordEncoder", mock(PasswordEncoder.class));
        when(repo.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));

        UsuarioResponseDTO deshabilitada = servicio.cambiarEstado(2L, false);
        assertFalse(deshabilitada.activo());
        UsuarioResponseDTO habilitada = servicio.cambiarEstado(2L, true);
        assertTrue(habilitada.activo());
    }

    @Test
    void unaCuentaNuevaEstaHabilitadaPorDefecto() {
        assertTrue(new Usuario().isActivo());
        assertTrue(new UsuarioResponseDTO(1L, "a", "b", "c", "d@e.cl", null, "USUARIO").activo());
    }

    // ------------------------------------------------------------------ rutas del superusuario

    @Test
    void elSuperusuarioDeshabilitaUnaCuenta() {
        when(servicioMock.cambiarEstado(2L, false))
                .thenReturn(new UsuarioResponseDTO(2L, "N", "A", "u2", "u2@correo.cl", null, "USUARIO", false));

        ResponseEntity<UsuarioResponseDTO> r = admin.cambiarEstado(1L, 2L, new EstadoUsuarioDTO(false));

        assertEquals(HttpStatus.OK, r.getStatusCode());
        assertFalse(r.getBody().activo());
    }

    @Test
    void elSuperusuarioEliminaUnaCuenta() {
        ResponseEntity<Void> r = admin.eliminar(1L, 2L);

        assertEquals(HttpStatus.NO_CONTENT, r.getStatusCode());
        verify(servicioMock).eliminar(2L);
    }

    @Test
    void noSePuedeDeshabilitarNiEliminarAOtroSuperusuarioNiASiMismo() {
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> admin.cambiarEstado(1L, 3L, new EstadoUsuarioDTO(false))).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> admin.eliminar(1L, 1L)).getStatusCode());
        verify(servicioMock, never()).cambiarEstado(anyLong(), anyBoolean());
        verify(servicioMock, never()).eliminar(any());
    }

    @Test
    void unaPersonaSinRolDeSuperusuarioNoPuedeUsarEstasRutas() {
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> admin.cambiarEstado(2L, 2L, new EstadoUsuarioDTO(false))).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> admin.eliminar(2L, 1L)).getStatusCode());
    }

    // ------------------------------------------------------------------ login

    @Test
    void unaCuentaDeshabilitadaPuedeIniciarSesionYLaRespuestaLoDice() {
        Usuario u = usuario(5L, Rol.USUARIO, false);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        JwtUtil jwt = mock(JwtUtil.class);
        when(repo.findByCorreo("u5@correo.cl")).thenReturn(Optional.of(u));
        when(encoder.matches("Clave1234", "hash")).thenReturn(true);
        when(jwt.generarToken(any(), any(), any(), any())).thenReturn("tok");
        AuthController auth = new AuthController();
        ReflectionTestUtils.setField(auth, "usuarioRepository", repo);
        ReflectionTestUtils.setField(auth, "passwordEncoder", encoder);
        ReflectionTestUtils.setField(auth, "jwtUtil", jwt);
        ReflectionTestUtils.setField(auth, "dispositivoInicioSesionService", mock(DispositivoInicioSesionService.class));

        var r = auth.login(new LoginRequestDTO("u5@correo.cl", "Clave1234", "disp-1"), new MockHttpServletRequest());

        assertEquals("tok", r.getBody().token());
        assertFalse(r.getBody().usuario().activo());
    }

    // ------------------------------------------------------------------ filtro de acceso

    private ControlAccesoUsuariosFilter filtro() {
        ControlAccesoUsuariosFilter f = new ControlAccesoUsuariosFilter();
        ReflectionTestUtils.setField(f, "usuarioRepository", repo);
        ReflectionTestUtils.setField(f, "objectMapper", new ObjectMapper());
        return f;
    }

    private MockHttpServletResponse pasar(String metodo, String ruta, Long autenticado, MockFilterChain cadena) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest(metodo, ruta);
        req.setAttribute("usuarioAutenticadoId", autenticado);
        MockHttpServletResponse resp = new MockHttpServletResponse();
        filtro().doFilter(req, resp, cadena);
        return resp;
    }

    @Test
    void unaCuentaEliminadaRecibe401AunqueSuTokenSigaVigente() throws Exception {
        when(repo.findById(9L)).thenReturn(Optional.empty());
        MockFilterChain cadena = new MockFilterChain();

        MockHttpServletResponse resp = pasar("GET", "/api/v1/usuarios/9", 9L, cadena);

        assertEquals(401, resp.getStatus());
        assertTrue(resp.getContentAsString().contains("ya no existe"));
        assertEquals(null, cadena.getRequest());
    }

    @Test
    void unaCuentaDeshabilitadaSoloPuedeConsultar() throws Exception {
        when(repo.findById(5L)).thenReturn(Optional.of(usuario(5L, Rol.USUARIO, false)));

        MockFilterChain lectura = new MockFilterChain();
        assertEquals(200, pasar("GET", "/api/v1/usuarios/5", 5L, lectura).getStatus());
        assertNotNull(lectura.getRequest());

        for (String metodo : new String[] { "PATCH", "PUT", "POST", "DELETE" }) {
            MockFilterChain cadena = new MockFilterChain();
            MockHttpServletResponse resp = pasar(metodo, "/api/v1/usuarios/5", 5L, cadena);
            assertEquals(403, resp.getStatus(), metodo);
            assertTrue(resp.getContentAsString().contains("deshabilitada"));
            assertEquals(null, cadena.getRequest());
        }
    }

    @Test
    void unaCuentaHabilitadaSigueFuncionandoIgual() throws Exception {
        MockFilterChain cadena = new MockFilterChain();
        assertEquals(200, pasar("PATCH", "/api/v1/usuarios/2", 2L, cadena).getStatus());
        assertNotNull(cadena.getRequest());
    }

    @Test
    void sinTokenElFiltroNoConsultaLaCuenta() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/usuarios");
        MockFilterChain cadena = new MockFilterChain();
        filtro().doFilter(req, new MockHttpServletResponse(), cadena);
        assertNotNull(cadena.getRequest());
        verify(repo, never()).findById(any());
    }

    // ------------------------------------------------------------------ efecto sobre las publicaciones

    @Test
    void deshabilitarOHabilitarUnaCuentaOcultaOVuelveSusPublicaciones() {
        api.com.v1.service.PublicacionesCliente cliente = mock(api.com.v1.service.PublicacionesCliente.class);
        ReflectionTestUtils.setField(admin, "publicaciones", cliente);
        when(servicioMock.cambiarEstado(anyLong(), anyBoolean()))
                .thenReturn(new UsuarioResponseDTO(2L, "N", "A", "u2", "u2@correo.cl", null, "USUARIO", false));

        admin.cambiarEstado(1L, 2L, new EstadoUsuarioDTO(false));
        admin.cambiarEstado(1L, 2L, new EstadoUsuarioDTO(true));

        verify(cliente).cambiarEstado(2L, false);
        verify(cliente).cambiarEstado(2L, true);
    }

    @Test
    void eliminarUnaCuentaRetiraSusPublicaciones() {
        api.com.v1.service.PublicacionesCliente cliente = mock(api.com.v1.service.PublicacionesCliente.class);
        ReflectionTestUtils.setField(admin, "publicaciones", cliente);

        admin.eliminar(1L, 2L);

        verify(cliente).retirar(2L);
    }

    @Test
    void sinPeticionActualElClienteDePublicacionesNoEnviaNada() {
        // Fuera de una petición HTTP no hay token que reenviar: no intenta la llamada y no falla.
        api.com.v1.service.PublicacionesCliente cliente = new api.com.v1.service.PublicacionesCliente();
        assertFalse(cliente.retirar(2L));
        assertFalse(cliente.cambiarEstado(2L, false));
    }
}
