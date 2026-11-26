package com.marketroad.publication.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.marketroad.publication.exception.PublicacionNoEncontradaException;
import com.marketroad.publication.model.CategoriaPublicacion;
import com.marketroad.publication.model.EstadoPublicacion;
import com.marketroad.publication.model.Publicacion;
import com.marketroad.publication.repository.PublicacionRepository;

/** El superusuario deshabilita/habilita publicaciones, y las de una cuenta deshabilitada o eliminada. */
class AdminEstadoPublicacionTest {

    private PublicacionRepository repo;
    private AdminPublicacionService servicio;

    private Publicacion publicacion(long id, long usuarioId, EstadoPublicacion estado) {
        Publicacion p = new Publicacion();
        ReflectionTestUtils.setField(p, "id", id);
        p.setUsuarioId(usuarioId);
        p.setEstado(estado);
        p.setCategoria(CategoriaPublicacion.OTROS);
        return p;
    }

    @BeforeEach
    void preparar() {
        repo = mock(PublicacionRepository.class);
        PublicacionMapper mapper = mock(PublicacionMapper.class);
        when(mapper.contarImagenes(anyList())).thenReturn(Map.of());
        when(repo.save(any(Publicacion.class))).thenAnswer(i -> i.getArgument(0));
        servicio = new AdminPublicacionService();
        ReflectionTestUtils.setField(servicio, "repository", repo);
        ReflectionTestUtils.setField(servicio, "mapper", mapper);
    }

    @Test
    void deshabilitaUnaPublicacionActivaYLaVuelveAHabilitar() {
        Publicacion p = publicacion(5, 1, EstadoPublicacion.ACTIVA);
        when(repo.findById(5L)).thenReturn(Optional.of(p));

        assertEquals("DESHABILITADA", servicio.cambiarEstado(5L, false).estado());
        assertEquals(EstadoPublicacion.DESHABILITADA, p.getEstado());
        assertEquals("ACTIVA", servicio.cambiarEstado(5L, true).estado());
    }

    @Test
    void noTocaPublicacionesVendidasNiEliminadas() {
        when(repo.findById(6L)).thenReturn(Optional.of(publicacion(6, 1, EstadoPublicacion.VENDIDA)));
        when(repo.findById(7L)).thenReturn(Optional.of(publicacion(7, 1, EstadoPublicacion.ELIMINADA)));

        assertThrows(IllegalArgumentException.class, () -> servicio.cambiarEstado(6L, false));
        assertThrows(IllegalArgumentException.class, () -> servicio.cambiarEstado(7L, true));
        verify(repo, never()).save(any(Publicacion.class));
    }

    @Test
    void unaPublicacionInexistenteDaNoEncontrada() {
        when(repo.findById(99L)).thenReturn(Optional.empty());
        assertThrows(PublicacionNoEncontradaException.class, () -> servicio.cambiarEstado(99L, false));
    }

    @Test
    void alDeshabilitarUnaCuentaSusPublicacionesActivasSalenDelCatalogoYLasVendidasQuedan() {
        Publicacion activa = publicacion(1, 8, EstadoPublicacion.ACTIVA);
        Publicacion vendida = publicacion(2, 8, EstadoPublicacion.VENDIDA);
        when(repo.findByUsuarioId(8L)).thenReturn(List.of(activa, vendida));

        assertEquals(1, servicio.cambiarEstadoDeUsuario(8L, false));
        assertEquals(EstadoPublicacion.DESHABILITADA, activa.getEstado());
        assertEquals(EstadoPublicacion.VENDIDA, vendida.getEstado());
    }

    @Test
    void alHabilitarLaCuentaVuelvenSoloLasDeshabilitadas() {
        Publicacion deshabilitada = publicacion(1, 8, EstadoPublicacion.DESHABILITADA);
        Publicacion eliminada = publicacion(2, 8, EstadoPublicacion.ELIMINADA);
        when(repo.findByUsuarioId(8L)).thenReturn(List.of(deshabilitada, eliminada));

        assertEquals(1, servicio.cambiarEstadoDeUsuario(8L, true));
        assertEquals(EstadoPublicacion.ACTIVA, deshabilitada.getEstado());
        assertEquals(EstadoPublicacion.ELIMINADA, eliminada.getEstado());
    }

    @Test
    void alEliminarLaCuentaSusPublicacionesDejanDeExistirSalvoLasVendidas() {
        Publicacion activa = publicacion(1, 8, EstadoPublicacion.ACTIVA);
        Publicacion deshabilitada = publicacion(2, 8, EstadoPublicacion.DESHABILITADA);
        Publicacion vendida = publicacion(3, 8, EstadoPublicacion.VENDIDA);
        when(repo.findByUsuarioId(8L)).thenReturn(List.of(activa, deshabilitada, vendida));

        assertEquals(2, servicio.retirarDeUsuario(8L));
        assertEquals(EstadoPublicacion.ELIMINADA, activa.getEstado());
        assertEquals(EstadoPublicacion.ELIMINADA, deshabilitada.getEstado());
        assertEquals(EstadoPublicacion.VENDIDA, vendida.getEstado());
    }

    @Test
    void elDetallePublicoNoMuestraPublicacionesDeshabilitadasNiEliminadas() {
        PublicacionServiceImpl detalle = new PublicacionServiceImpl();
        ReflectionTestUtils.setField(detalle, "repository", repo);
        when(repo.findById(1L)).thenReturn(Optional.of(publicacion(1L, 5L, EstadoPublicacion.DESHABILITADA)));
        when(repo.findById(2L)).thenReturn(Optional.of(publicacion(2L, 5L, EstadoPublicacion.ELIMINADA)));

        assertThrows(PublicacionNoEncontradaException.class, () -> detalle.obtenerPorId(1L));
        assertThrows(PublicacionNoEncontradaException.class, () -> detalle.obtenerPorId(2L));
    }
}
