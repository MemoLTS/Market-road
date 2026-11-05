package com.marketroad.publication.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import com.marketroad.publication.dto.AdminPublicacionDTO;
import com.marketroad.publication.dto.CategoriaDTO;
import com.marketroad.publication.dto.ConversacionDetalleDTO;
import com.marketroad.publication.dto.ConversacionResumenDTO;
import com.marketroad.publication.dto.ImagenDTO;
import com.marketroad.publication.dto.IniciarConversacionRequestDTO;
import com.marketroad.publication.dto.MensajeRequestDTO;
import com.marketroad.publication.dto.OfertaRequestDTO;
import com.marketroad.publication.dto.PaginaDTO;
import com.marketroad.publication.dto.PublicacionResponseDTO;
import com.marketroad.publication.dto.TicketSoporteDTO;
import com.marketroad.publication.dto.TicketSoporteRequestDTO;
import com.marketroad.publication.dto.TicketSoporteRespuestaDTO;
import com.marketroad.publication.exception.NoAutorizadoException;
import com.marketroad.publication.mensajeria.ConversacionService;
import com.marketroad.publication.model.CategoriaSoporte;
import com.marketroad.publication.model.EstadoTicket;
import com.marketroad.publication.security.Identidad;
import com.marketroad.publication.service.AdminPublicacionService;
import com.marketroad.publication.service.CatalogoService;
import com.marketroad.publication.service.PublicacionService;
import com.marketroad.publication.service.SoporteService;

class PublicationControllersTest {

    private MockHttpServletRequest requestConIdentidad(Long id, String apodo) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(Identidad.ATRIBUTO, new Identidad(id, apodo, Identidad.ROL_SUPERUSUARIO));
        return request;
    }

    @Test
    void publicacionController_creaCatalogoYLogicaBasica() {
        PublicacionController controller = new PublicacionController();
        PublicacionService service = mock(PublicacionService.class);
        CatalogoService catalogo = mock(CatalogoService.class);
        ReflectionTestUtils.setField(controller, "service", service);
        ReflectionTestUtils.setField(controller, "catalogo", catalogo);

        MockMultipartFile foto = new MockMultipartFile("fotos", "foto.jpg", "image/jpeg", new byte[] {1, 2, 3});
        PublicacionResponseDTO dto = new PublicacionResponseDTO(
                99L, "Laptop", new BigDecimal("230000"), "Buen estado", "Santiago",
                "OTROS", "Otros", List.of(), -33.4, -70.6, 0.0, 7L, "ana",
                "ACTIVA", OffsetDateTime.now(), List.of("/api/v1/publicaciones/99/imagenes/0"));

        when(service.crear(any(), anyList(), any())).thenReturn(dto);
        when(catalogo.buscar(any())).thenReturn(new PaginaDTO<>(List.of(dto), 0, 20, 1, 1));
        when(catalogo.categorias()).thenReturn(List.of(new CategoriaDTO("OTROS", "Otros")));

        ResponseEntity<PublicacionResponseDTO> creada = controller.crear(
                "Laptop", "230000", "Buen estado", "Santiago", "OTROS",
                List.of("ENVIO"), -33.4, -70.6, List.of((MultipartFile) foto), requestConIdentidad(7L, "ana"));
        assertEquals(201, creada.getStatusCode().value());

        ResponseEntity<PaginaDTO<PublicacionResponseDTO>> pagina = controller.catalogo(null, null, null, null, null, null, null, null, null, null);
        assertEquals(200, pagina.getStatusCode().value());

        ResponseEntity<List<CategoriaDTO>> categorias = controller.categorias();
        assertEquals(1, categorias.getBody().size());

        when(service.obtenerPorUsuario(7L)).thenReturn(List.of(dto));
        assertEquals(200, controller.obtenerMias(requestConIdentidad(7L, "ana")).getStatusCode().value());

        when(service.obtenerPorId(99L)).thenReturn(dto);
        assertEquals(200, controller.obtener(99L).getStatusCode().value());

        when(service.obtenerImagen(99L, 0)).thenReturn(new ImagenDTO(new byte[] {1, 2, 3}, "image/jpeg"));
        assertEquals(200, controller.imagen(99L, 0).getStatusCode().value());

        controller.eliminar(99L, requestConIdentidad(7L, "ana"));
        verify(service).eliminar(99L, 7L);
    }

    @Test
    void adminPublicacionController_validaSuperusuario() {
        AdminPublicacionController controller = new AdminPublicacionController();
        AdminPublicacionService service = mock(AdminPublicacionService.class);
        ReflectionTestUtils.setField(controller, "service", service);

        when(service.listarTodas()).thenReturn(List.of(new AdminPublicacionDTO(
                1L, "Titulo", new BigDecimal("5000"), "OTROS", "Otros", "Santiago",
                "ACTIVA", 4L, "vendedor", 8L, new BigDecimal("5000"), OffsetDateTime.now(), OffsetDateTime.now(), 2)));

        ResponseEntity<List<AdminPublicacionDTO>> ok = controller.listar(requestConIdentidad(1L, "admin"));
        assertEquals(200, ok.getStatusCode().value());

        assertThrows(NoAutorizadoException.class, () -> controller.listar(new MockHttpServletRequest()));
    }

    @Test
    void soporteControllers_listanYCreanYCierre() {
        SoporteController soporte = new SoporteController();
        SoporteService service = mock(SoporteService.class);
        ReflectionTestUtils.setField(soporte, "service", service);

        TicketSoporteDTO ticket = new TicketSoporteDTO(
                5L, 10L, "usuario", "CUENTA", "Mi cuenta", "Asunto del ticket",
                "Descripcion del ticket", "ABIERTO", null, null, OffsetDateTime.now());
        when(service.crear(any(TicketSoporteRequestDTO.class), any(Identidad.class))).thenReturn(ticket);
        when(service.listarDelUsuario(any(Identidad.class))).thenReturn(List.of(ticket));

        ResponseEntity<TicketSoporteDTO> creado = soporte.crear(
                new TicketSoporteRequestDTO(CategoriaSoporte.CUENTA, "Asunto del ticket", "Descripcion del ticket"),
                requestConIdentidad(10L, "usuario"));
        assertEquals(201, creado.getStatusCode().value());
        assertEquals(200, soporte.misSolicitudes(requestConIdentidad(10L, "usuario")).getStatusCode().value());

        AdminSoporteController admin = new AdminSoporteController();
        ReflectionTestUtils.setField(admin, "service", service);
        when(service.listarTodos(any(Identidad.class))).thenReturn(List.of(ticket));
        when(service.responder(anyLong(), any(TicketSoporteRespuestaDTO.class), any(Identidad.class))).thenReturn(ticket);

        assertEquals(200, admin.listar(requestConIdentidad(1L, "admin")).getStatusCode().value());
        assertEquals(200, admin.responder(5L,
                new TicketSoporteRespuestaDTO(EstadoTicket.RESUELTO, "Respuesta"),
                requestConIdentidad(1L, "admin")).getStatusCode().value());
    }

    @Test
    void conversacionController_exponeEndpointsDeMensajeria() {
        ConversacionController controller = new ConversacionController();
        ConversacionService service = mock(ConversacionService.class);
        ReflectionTestUtils.setField(controller, "service", service);

        ConversacionResumenDTO resumen = new ConversacionResumenDTO(
                2L, 3L, "Moto", new BigDecimal("1000"), "ACTIVA", "/api/v1/publicaciones/3/imagenes/0",
                "COMPRADOR", 8L, "vendor", null, "Hola", OffsetDateTime.now(), 0L);
        ConversacionDetalleDTO detalle = new ConversacionDetalleDTO(resumen, List.of());
        when(service.listar(any(Identidad.class), any())).thenReturn(List.of(resumen));
        when(service.contarNoLeidos(any(Identidad.class))).thenReturn(1L);
        when(service.iniciar(anyLong(), any(), any(Identidad.class))).thenReturn(detalle);
        when(service.obtener(anyLong(), any(Identidad.class))).thenReturn(detalle);
        when(service.enviarTexto(anyLong(), any(), any(Identidad.class))).thenReturn(detalle);
        when(service.ofertar(anyLong(), any(), any(Identidad.class))).thenReturn(detalle);
        when(service.responderOferta(anyLong(), anyLong(), anyBoolean(), any(Identidad.class))).thenReturn(detalle);
        when(service.marcarVendida(anyLong(), any(Identidad.class))).thenReturn(detalle);

        assertEquals(200, controller.listar(null, requestConIdentidad(8L, "comprador")).getStatusCode().value());
        assertEquals(200, controller.noLeidos(requestConIdentidad(8L, "comprador")).getStatusCode().value());
        assertEquals(201, controller.iniciar(new IniciarConversacionRequestDTO(3L, "Hola"), requestConIdentidad(8L, "comprador")).getStatusCode().value());
        assertEquals(200, controller.obtener(2L, requestConIdentidad(8L, "comprador")).getStatusCode().value());
        assertEquals(200, controller.enviar(2L, new MensajeRequestDTO("Mensaje"), requestConIdentidad(8L, "comprador")).getStatusCode().value());
        assertEquals(200, controller.ofertar(2L, new OfertaRequestDTO(new BigDecimal("500")), requestConIdentidad(8L, "comprador")).getStatusCode().value());
        assertEquals(200, controller.aceptar(2L, 1L, requestConIdentidad(8L, "comprador")).getStatusCode().value());
        assertEquals(200, controller.rechazar(2L, 1L, requestConIdentidad(8L, "comprador")).getStatusCode().value());
        assertEquals(200, controller.vender(2L, requestConIdentidad(8L, "comprador")).getStatusCode().value());
    }
}
