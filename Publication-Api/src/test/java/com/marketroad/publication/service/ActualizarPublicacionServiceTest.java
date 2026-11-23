package com.marketroad.publication.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.marketroad.publication.dto.ActualizarPublicacionDTO;
import com.marketroad.publication.model.EstadoPublicacion;
import com.marketroad.publication.model.Publicacion;
import com.marketroad.publication.repository.PublicacionRepository;

/** Edición de una publicación: ahora también guarda las coordenadas de la localidad elegida. */
class ActualizarPublicacionServiceTest {

    private PublicacionServiceImpl servicio;
    private Publicacion publicacion;

    @BeforeEach
    void preparar() {
        PublicacionRepository repo = mock(PublicacionRepository.class);
        PublicacionMapper mapper = mock(PublicacionMapper.class);
        publicacion = new Publicacion();
        // El servicio consulta las imágenes por id (List.of(id) no admite null), así que la entidad necesita uno.
        ReflectionTestUtils.setField(publicacion, "id", 5L);
        publicacion.setUsuarioId(1L);
        publicacion.setEstado(EstadoPublicacion.ACTIVA);
        publicacion.setUbicacion("Concepción");
        when(repo.findById(5L)).thenReturn(Optional.of(publicacion));
        when(repo.save(any(Publicacion.class))).thenAnswer(i -> i.getArgument(0));
        when(mapper.contarImagenes(any())).thenReturn(java.util.Map.of());
        servicio = new PublicacionServiceImpl();
        ReflectionTestUtils.setField(servicio, "repository", repo);
        ReflectionTestUtils.setField(servicio, "mapper", mapper);
    }

    private static ActualizarPublicacionDTO coordenadas(String ubicacion, Double lat, Double lon) {
        return new ActualizarPublicacionDTO(null, null, null, ubicacion, null, null, lat, lon);
    }

    @Test
    void guardaCoordenadasValidasJuntoALaUbicacion() {
        servicio.actualizar(5L, coordenadas("Temuco", -38.73, -72.59), 1L);
        assertEquals("Temuco", publicacion.getUbicacion());
        assertEquals(-38.73, publicacion.getLatitud());
        assertEquals(-72.59, publicacion.getLongitud());
    }

    @Test
    void rechazaLatitudSinLongitud() {
        assertThrows(IllegalArgumentException.class,
                () -> servicio.actualizar(5L, coordenadas("Temuco", -38.73, null), 1L));
    }

    @Test
    void rechazaCoordenadasFueraDeRango() {
        assertThrows(IllegalArgumentException.class,
                () -> servicio.actualizar(5L, coordenadas("Temuco", 120.0, -72.59), 1L));
    }

    @Test
    void sinCoordenadasNoTocaLasExistentes() {
        publicacion.setLatitud(-36.8);
        publicacion.setLongitud(-73.05);
        servicio.actualizar(5L, new ActualizarPublicacionDTO("Titulo nuevo", null, null, null, null), 1L);
        assertEquals(-36.8, publicacion.getLatitud());
        assertEquals(-73.05, publicacion.getLongitud());
    }
}
