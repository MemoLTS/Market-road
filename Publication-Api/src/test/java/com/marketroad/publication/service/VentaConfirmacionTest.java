package com.marketroad.publication.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.marketroad.publication.exception.NoAutorizadoException;
import com.marketroad.publication.exception.OperacionNoPermitidaException;
import com.marketroad.publication.mensajeria.ConversacionService;
import com.marketroad.publication.mensajeria.ReglasMensajeria;
import com.marketroad.publication.model.CategoriaPublicacion;
import com.marketroad.publication.model.Conversacion;
import com.marketroad.publication.model.EstadoPublicacion;
import com.marketroad.publication.model.EstadoVenta;
import com.marketroad.publication.model.MensajeConversacion;
import com.marketroad.publication.model.Publicacion;
import com.marketroad.publication.repository.ConversacionRepository;
import com.marketroad.publication.repository.ImagenPublicacionRepository;
import com.marketroad.publication.repository.MensajeConversacionRepository;
import com.marketroad.publication.repository.PublicacionRepository;
import com.marketroad.publication.security.Identidad;
import com.marketroad.publication.validacion.Textos;

/** La contraparte responde a una venta marcada, y la persona dueña oculta o muestra su publicación. */
class VentaConfirmacionTest {

    private static final Identidad VENDEDOR = new Identidad(7L, "vende");
    private static final Identidad COMPRADOR = new Identidad(9L, "compra");

    private PublicacionRepository publicaciones;
    private ConversacionService servicio;
    private Publicacion publicacion;
    private Conversacion conversacion;

    @BeforeEach
    void preparar() {
        ConversacionRepository conversaciones = mock(ConversacionRepository.class);
        MensajeConversacionRepository mensajes = mock(MensajeConversacionRepository.class);
        publicaciones = mock(PublicacionRepository.class);
        ReglasMensajeria reglas = new ReglasMensajeria();
        ReflectionTestUtils.setField(reglas, "textos", new Textos());
        ReflectionTestUtils.setField(reglas, "montoMaximo", new BigDecimal("9999999999.99"));

        servicio = new ConversacionService();
        ReflectionTestUtils.setField(servicio, "conversaciones", conversaciones);
        ReflectionTestUtils.setField(servicio, "mensajes", mensajes);
        ReflectionTestUtils.setField(servicio, "publicaciones", publicaciones);
        ReflectionTestUtils.setField(servicio, "reglas", reglas);

        publicacion = new Publicacion();
        ReflectionTestUtils.setField(publicacion, "id", 4L);
        publicacion.setTitulo("Moto");
        publicacion.setPrecio(new BigDecimal("500000"));
        publicacion.setCategoria(CategoriaPublicacion.OTROS);
        publicacion.setUsuarioId(7L);
        publicacion.setEstado(EstadoPublicacion.VENDIDA);
        publicacion.setCompradorId(9L);
        publicacion.setPrecioVenta(new BigDecimal("450000"));
        publicacion.setFechaVenta(OffsetDateTime.now());
        publicacion.setVentaEstado(EstadoVenta.PENDIENTE_CONFIRMACION);

        conversacion = new Conversacion();
        ReflectionTestUtils.setField(conversacion, "id", 11L);
        conversacion.setPublicacion(publicacion);
        conversacion.setCompradorId(9L);
        conversacion.setVendedorId(7L);
        conversacion.setUltimaActividad(OffsetDateTime.now());

        when(conversaciones.findConPublicacion(11L)).thenReturn(Optional.of(conversacion));
        when(conversaciones.save(any(Conversacion.class))).thenAnswer(i -> i.getArgument(0));
        when(mensajes.save(any(MensajeConversacion.class))).thenAnswer(i -> i.getArgument(0));
        when(mensajes.findByConversacionIdOrderByIdAsc(11L)).thenReturn(List.of());
    }

    @Test
    void elCompradorConfirmaLaVenta() {
        var detalle = servicio.responderVenta(11L, "COMPRADO", null, COMPRADOR);

        assertEquals(EstadoVenta.CONFIRMADA, publicacion.getVentaEstado());
        assertEquals(EstadoPublicacion.VENDIDA, publicacion.getEstado());
        assertEquals("CONFIRMADA", detalle.conversacion().ventaEstado());
    }

    @Test
    void siNoComproLaVentaSeAnulaYLaPublicacionVuelveAEstarActiva() {
        servicio.responderVenta(11L, "NO_COMPRADO", null, COMPRADOR);

        assertEquals(EstadoPublicacion.ACTIVA, publicacion.getEstado());
        assertNull(publicacion.getVentaEstado());
        assertNull(publicacion.getCompradorId());
        assertNull(publicacion.getPrecioVenta());
        assertNull(publicacion.getFechaVenta());
    }

    @Test
    void otraOpcionExigeDescribirYDejaLaVentaEnRevision() {
        assertThrows(IllegalArgumentException.class, () -> servicio.responderVenta(11L, "OTRO", "corto", COMPRADOR));
        assertEquals(EstadoVenta.PENDIENTE_CONFIRMACION, publicacion.getVentaEstado());

        var detalle = servicio.responderVenta(11L, "OTRO", "El vendedor nunca me entregó el artículo", COMPRADOR);

        assertEquals(EstadoVenta.EN_REVISION, publicacion.getVentaEstado());
        assertEquals("El vendedor nunca me entregó el artículo", detalle.conversacion().ventaDetalle());
    }

    @Test
    void soloLaPersonaSeñaladaComoCompradoraPuedeResponderUnaVezYConUnaOpcionValida() {
        assertThrows(OperacionNoPermitidaException.class, () -> servicio.responderVenta(11L, "COMPRADO", null, VENDEDOR));
        assertThrows(IllegalArgumentException.class, () -> servicio.responderVenta(11L, "TAL VEZ", null, COMPRADOR));

        servicio.responderVenta(11L, "COMPRADO", null, COMPRADOR);
        assertThrows(OperacionNoPermitidaException.class, () -> servicio.responderVenta(11L, "COMPRADO", null, COMPRADOR));
    }

    // ------------------------------------------------------------------ ocultar y mostrar

    private PublicacionServiceImpl servicioDePublicaciones(EstadoPublicacion estado) {
        PublicacionServiceImpl impl = new PublicacionServiceImpl();
        PublicacionMapper mapper = mock(PublicacionMapper.class);
        ReflectionTestUtils.setField(impl, "repository", publicaciones);
        ReflectionTestUtils.setField(impl, "mapper", mapper);
        publicacion.setEstado(estado);
        when(publicaciones.findById(4L)).thenReturn(Optional.of(publicacion));
        when(publicaciones.save(any(Publicacion.class))).thenAnswer(i -> i.getArgument(0));
        return impl;
    }

    @Test
    void laPersonaDuenaOcultaYVuelveAMostrarSuPublicacion() {
        PublicacionServiceImpl impl = servicioDePublicaciones(EstadoPublicacion.ACTIVA);

        impl.cambiarVisibilidad(4L, false, 7L);
        assertEquals(EstadoPublicacion.OCULTA, publicacion.getEstado());

        impl.cambiarVisibilidad(4L, true, 7L);
        assertEquals(EstadoPublicacion.ACTIVA, publicacion.getEstado());
    }

    @Test
    void ocultarSoloLoHaceLaPersonaDuenaYSoloEnPublicacionesActivasUOcultas() {
        PublicacionServiceImpl impl = servicioDePublicaciones(EstadoPublicacion.ACTIVA);
        assertThrows(NoAutorizadoException.class, () -> impl.cambiarVisibilidad(4L, false, 99L));

        publicacion.setEstado(EstadoPublicacion.VENDIDA);
        assertThrows(IllegalArgumentException.class, () -> impl.cambiarVisibilidad(4L, false, 7L));
        publicacion.setEstado(EstadoPublicacion.DESHABILITADA);
        assertThrows(IllegalArgumentException.class, () -> impl.cambiarVisibilidad(4L, true, 7L));
    }

    @Test
    void elDetallePublicoNoMuestraUnaPublicacionOculta() {
        PublicacionServiceImpl impl = servicioDePublicaciones(EstadoPublicacion.OCULTA);
        ReflectionTestUtils.setField(impl, "imagenRepository", mock(ImagenPublicacionRepository.class));

        assertThrows(com.marketroad.publication.exception.PublicacionNoEncontradaException.class, () -> impl.obtenerPorId(4L));
    }
}
