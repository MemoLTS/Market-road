package com.marketroad.publication.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Sort;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import com.marketroad.publication.catalogo.Candidato;
import com.marketroad.publication.catalogo.CatalogoConsulta;
import com.marketroad.publication.catalogo.CatalogoProcesador;
import com.marketroad.publication.catalogo.Resultado;
import com.marketroad.publication.dto.AdminPublicacionDTO;
import com.marketroad.publication.dto.CategoriaDTO;
import com.marketroad.publication.dto.ImagenDTO;
import com.marketroad.publication.dto.PaginaDTO;
import com.marketroad.publication.dto.PublicacionResponseDTO;
import com.marketroad.publication.dto.TicketSoporteDTO;
import com.marketroad.publication.dto.TicketSoporteRequestDTO;
import com.marketroad.publication.dto.TicketSoporteRespuestaDTO;
import com.marketroad.publication.exception.ConversacionNoEncontradaException;
import com.marketroad.publication.exception.DemasiadasSolicitudesException;
import com.marketroad.publication.exception.GlobalExceptionHandler;
import com.marketroad.publication.exception.NoAutorizadoException;
import com.marketroad.publication.exception.OperacionNoPermitidaException;
import com.marketroad.publication.exception.PublicacionNoEncontradaException;
import com.marketroad.publication.exception.TicketNoEncontradoException;
import com.marketroad.publication.mensajeria.ConversacionService;
import com.marketroad.publication.mensajeria.LimitadorMensajes;
import com.marketroad.publication.mensajeria.ReglasMensajeria;
import com.marketroad.publication.model.CategoriaPublicacion;
import com.marketroad.publication.model.CategoriaSoporte;
import com.marketroad.publication.model.Conversacion;
import com.marketroad.publication.model.EstadoOferta;
import com.marketroad.publication.model.EstadoPublicacion;
import com.marketroad.publication.model.EstadoTicket;
import com.marketroad.publication.model.ImagenPublicacion;
import com.marketroad.publication.model.MensajeConversacion;
import com.marketroad.publication.model.ModalidadEntrega;
import com.marketroad.publication.model.Publicacion;
import com.marketroad.publication.model.TicketSoporte;
import com.marketroad.publication.model.TipoMensaje;
import com.marketroad.publication.repository.ConversacionRepository;
import com.marketroad.publication.repository.ImagenPublicacionRepository;
import com.marketroad.publication.repository.MensajeConversacionRepository;
import com.marketroad.publication.repository.PublicacionRepository;
import com.marketroad.publication.repository.TicketSoporteRepository;
import com.marketroad.publication.security.Identidad;
import com.marketroad.publication.validacion.Textos;

class PublicationServicesTest {

    private static MockMultipartFile jpegFoto() throws IOException {
        BufferedImage img = new BufferedImage(10, 10, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "jpg", baos);
        return new MockMultipartFile("fotos", "foto.jpg", "image/jpeg", baos.toByteArray());
    }

    @Test
    void publicacionServiceImpl_creaPublicacionValidaYRechazaEntradaInvalida() throws Exception {
        PublicacionRepository repository = mock(PublicacionRepository.class);
        ImagenPublicacionRepository imagenRepo = mock(ImagenPublicacionRepository.class);
        PublicacionMapper mapper = mock(PublicacionMapper.class);
        PublicacionServiceImpl service = new PublicacionServiceImpl();
        ReflectionTestUtils.setField(service, "repository", repository);
        ReflectionTestUtils.setField(service, "imagenRepository", imagenRepo);
        ReflectionTestUtils.setField(service, "mapper", mapper);
        ReflectionTestUtils.setField(service, "textos", new Textos());
        ReflectionTestUtils.setField(service, "maxFotos", 8);
        ReflectionTestUtils.setField(service, "maxBytesPorFoto", 5L * 1024 * 1024);
        ReflectionTestUtils.setField(service, "tiposPermitidos", List.of("image/jpeg", "image/png", "image/webp"));

        MockMultipartFile foto = jpegFoto();
        Publicacion publica = new Publicacion();
        ReflectionTestUtils.setField(publica, "id", 42L);
        publica.setTitulo("Laptop gamer");
        publica.setDescripcion("Excelente estado");
        publica.setUbicacion("Santiago");
        publica.setCategoria(CategoriaPublicacion.ELECTRONICA);
        publica.setModalidadesEntrega(EnumSet.of(ModalidadEntrega.ENVIO));
        publica.setLatitud(-33.4);
        publica.setLongitud(-70.6);
        publica.setUsuarioId(7L);
        publica.setVendedorApodo("ana");
        publica.setPrecio(new BigDecimal("250000"));

        when(repository.save(any(Publicacion.class))).thenReturn(publica);
        when(mapper.aDTO(any(Publicacion.class), any(Integer.class), any())).thenReturn(
                new PublicacionResponseDTO(42L, "Laptop gamer", new BigDecimal("250000"), "Excelente estado",
                        "Santiago",
                        "ELECTRONICA", "Electrónica", List.of(), -33.4, -70.6, null, 7L, "ana",
                        "ACTIVA", OffsetDateTime.now(), List.of("/api/v1/publicaciones/42/imagenes/0")));

        PublicacionResponseDTO creada = service.crear(
                new com.marketroad.publication.dto.NuevaPublicacionDTO(
                        "Laptop gamer", "250000", "Excelente estado", "Santiago", "ELECTRONICA",
                        List.of("ENVIO"), -33.4, -70.6),
                List.of(foto), new Identidad(7L, "ana"));

        assertEquals(42L, creada.id());
        assertThrows(IllegalArgumentException.class,
                () -> service.crear(null, List.of(foto), new Identidad(7L, "ana")));
        assertThrows(IllegalArgumentException.class, () -> service.crear(
                new com.marketroad.publication.dto.NuevaPublicacionDTO(
                        "Laptop gamer", "250000", "Muy corta", "Santiago", "ELECTRONICA",
                        List.of("ENVIO"), -33.4, -70.6),
                List.of(foto), new Identidad(7L, "ana")));

        when(repository.findById(42L)).thenReturn(Optional.of(publica));
        when(imagenRepo.findByPublicacionIdAndPosicion(42L, 0)).thenReturn(Optional.of(new ImagenPublicacion()));
        assertEquals(42L, service.obtenerPorId(42L).id());
        assertNotNull(service.obtenerImagen(42L, 0));
        service.eliminar(42L, 7L);
    }

    @Test
    void catalogoService_yAdminPublicacionService_devuelvenDatosDeCatalogo() {
        PublicacionRepository repository = mock(PublicacionRepository.class);
        PublicacionMapper mapper = mock(PublicacionMapper.class);
        CatalogoProcesador procesador = mock(CatalogoProcesador.class);
        CatalogoService service = new CatalogoService();
        ReflectionTestUtils.setField(service, "repository", repository);
        ReflectionTestUtils.setField(service, "mapper", mapper);
        ReflectionTestUtils.setField(service, "procesador", procesador);

        Publicacion publicacion = new Publicacion();
        ReflectionTestUtils.setField(publicacion, "id", 10L);
        publicacion.setTitulo("Moto");
        publicacion.setDescripcion("Muy buena");
        publicacion.setCategoria(CategoriaPublicacion.ELECTRONICA);
        publicacion.setPrecio(new BigDecimal("150000"));
        publicacion.setLatitud(-33.4);
        publicacion.setLongitud(-70.6);
        publicacion.setEstado(EstadoPublicacion.ACTIVA);
        publicacion.setUsuarioId(9L);
        publicacion.setVendedorApodo("vendedor");
        ReflectionTestUtils.setField(publicacion, "fechaCreacion", OffsetDateTime.now());

        when(repository.findByEstadoOrderByFechaCreacionDesc(EstadoPublicacion.ACTIVA))
                .thenReturn(List.of(publicacion));
        when(procesador.procesar(any(), any(CatalogoConsulta.class))).thenReturn(
                List.of(new Resultado(new Candidato(10L, "Moto", "Muy buena", CategoriaPublicacion.ELECTRONICA,
                        new BigDecimal("150000"), -33.4, -70.6, OffsetDateTime.now()), 0.0, 10)));
        when(procesador.pagina(any(), any(Integer.class), any(Integer.class)))
                .thenAnswer(inv -> ((List<?>) inv.getArgument(0)).subList(0, 1));
        when(procesador.totalPaginas(any(Integer.class), any(Integer.class))).thenReturn(1);
        when(mapper.contarImagenes(anyCollection())).thenReturn(Map.of(10L, 1));
        when(mapper.aDTO(any(Publicacion.class), any(Integer.class), any())).thenReturn(
                new PublicacionResponseDTO(10L, "Moto", new BigDecimal("150000"), "Muy buena", "Santiago",
                        "ELECTRONICA", "Electrónica", List.of(), -33.4, -70.6, 0.0, 9L, "vendedor",
                        "ACTIVA", OffsetDateTime.now(), List.of("/api/v1/publicaciones/10/imagenes/0")));

        PaginaDTO<PublicacionResponseDTO> pagina = service
                .buscar(new CatalogoConsulta(null, null, null, null, null, null, null, null, 0, 20));
        assertEquals(1, pagina.total());
        assertTrue(service.categorias().stream()
                .anyMatch(c -> "ELECTRONICA".equals(c.codigo()) && "Electrónica".equals(c.nombre())));

        AdminPublicacionService admin = new AdminPublicacionService();
        PublicacionRepository adminRepo = mock(PublicacionRepository.class);
        ReflectionTestUtils.setField(admin, "repository", adminRepo);
        ReflectionTestUtils.setField(admin, "mapper", mapper);
        when(adminRepo.findAll(any(Sort.class))).thenReturn(List.of(publicacion));
        when(mapper.contarImagenes(anyCollection())).thenReturn(Map.of(10L, 1));
        List<AdminPublicacionDTO> adminList = admin.listarTodas();
        assertEquals(1, adminList.size());
    }

    @Test
    void soporteService_creaYRespondeSolicitudes() {
        TicketSoporteRepository ticketRepo = mock(TicketSoporteRepository.class);
        SoporteService service = new SoporteService();
        ReflectionTestUtils.setField(service, "tickets", ticketRepo);

        TicketSoporte ticket = new TicketSoporte();
        ReflectionTestUtils.setField(ticket, "id", 1L);
        ticket.setUsuarioId(9L);
        ticket.setUsuarioApodo("maria");
        ticket.setCategoria(CategoriaSoporte.CUENTA);
        ticket.setAsunto("Pago");
        ticket.setDescripcion("Necesito ayuda con el pago");
        ticket.setEstado(EstadoTicket.ABIERTO);

        when(ticketRepo.countByUsuarioIdAndEstadoNot(9L, EstadoTicket.RESUELTO)).thenReturn(0L);
        when(ticketRepo.save(any(TicketSoporte.class))).thenReturn(ticket);
        when(ticketRepo.findByUsuarioIdOrderByFechaCreacionDesc(9L)).thenReturn(List.of(ticket));
        when(ticketRepo.findAll(any(Sort.class))).thenReturn(List.of(ticket));
        when(ticketRepo.findById(1L)).thenReturn(Optional.of(ticket));

        TicketSoporteDTO creado = service.crear(
                new TicketSoporteRequestDTO(CategoriaSoporte.CUENTA, "Pago", "Necesito ayuda con el pago"),
                new Identidad(9L, "maria"));
        assertEquals("CUENTA", creado.categoria());
        assertEquals(1, service.listarDelUsuario(new Identidad(9L, "maria")).size());
        assertEquals(1, service.listarTodos(new Identidad(9L, "admin", Identidad.ROL_SUPERUSUARIO)).size());
        TicketSoporteDTO respondido = service.responder(1L,
                new TicketSoporteRespuestaDTO(EstadoTicket.RESUELTO, "Listo"),
                new Identidad(9L, "admin", Identidad.ROL_SUPERUSUARIO));
        assertEquals("RESUELTO", respondido.estado());

        assertThrows(NoAutorizadoException.class, () -> service.listarTodos(new Identidad(9L, "cliente")));
    }

    @Test
    void conversacionService_iniciaYMarcaVenta() {
        ConversacionRepository conversaciones = mock(ConversacionRepository.class);
        MensajeConversacionRepository mensajes = mock(MensajeConversacionRepository.class);
        PublicacionRepository publicaciones = mock(PublicacionRepository.class);
        LimitadorMensajes limitador = new LimitadorMensajes();
        ReflectionTestUtils.setField(limitador, "reloj",
                Clock.fixed(OffsetDateTime.now().toInstant(), java.time.ZoneOffset.UTC));
        ReflectionTestUtils.setField(limitador, "maximo", 20);
        ReflectionTestUtils.setField(limitador, "ventanaMs", 60000L);
        ReglasMensajeria reglas = new ReglasMensajeria();
        ReflectionTestUtils.setField(reglas, "textos", new Textos());
        ReflectionTestUtils.setField(reglas, "montoMaximo", new BigDecimal("9999999999.99"));

        ConversacionService service = new ConversacionService();
        ReflectionTestUtils.setField(service, "conversaciones", conversaciones);
        ReflectionTestUtils.setField(service, "mensajes", mensajes);
        ReflectionTestUtils.setField(service, "publicaciones", publicaciones);
        ReflectionTestUtils.setField(service, "limitador", limitador);
        ReflectionTestUtils.setField(service, "reglas", reglas);

        Publicacion publicacion = new Publicacion();
        ReflectionTestUtils.setField(publicacion, "id", 4L);
        publicacion.setTitulo("Moto");
        publicacion.setPrecio(new BigDecimal("500000"));
        publicacion.setDescripcion("Buen estado");
        publicacion.setUbicacion("Valparaíso");
        publicacion.setCategoria(CategoriaPublicacion.ELECTRONICA);
        publicacion.setUsuarioId(7L);
        publicacion.setVendedorApodo("vende");
        publicacion.setEstado(EstadoPublicacion.ACTIVA);

        Conversacion conversacion = new Conversacion();
        ReflectionTestUtils.setField(conversacion, "id", 11L);
        conversacion.setPublicacion(publicacion);
        conversacion.setCompradorId(9L);
        conversacion.setVendedorId(7L);
        conversacion.setCompradorApodo("comprador");
        conversacion.setVendedorApodo("vende");
        conversacion.setUltimaActividad(OffsetDateTime.now());

        MensajeConversacion mensaje = new MensajeConversacion();
        ReflectionTestUtils.setField(mensaje, "id", 1L);
        mensaje.setConversacion(conversacion);
        mensaje.setRemitenteId(9L);
        mensaje.setTipo(TipoMensaje.TEXTO);
        mensaje.setContenido("Hola");
        mensaje.setLeido(false);

        when(publicaciones.findById(4L)).thenReturn(Optional.of(publicacion));
        when(conversaciones.findByPublicacionIdAndCompradorId(4L, 9L)).thenReturn(Optional.empty());
        when(conversaciones.save(any(Conversacion.class))).thenAnswer(inv -> {
            Conversacion c = inv.getArgument(0);
            ReflectionTestUtils.setField(c, "id", 11L);
            return c;
        });
        when(mensajes.save(any(MensajeConversacion.class))).thenAnswer(inv -> {
            MensajeConversacion m = inv.getArgument(0);
            ReflectionTestUtils.setField(m, "id", 1L);
            return m;
        });
        when(mensajes.findByConversacionIdOrderByIdAsc(11L)).thenReturn(List.of(mensaje));
        when(mensajes.countByConversacionIdAndRemitenteIdNotAndLeidoFalse(11L, 9L)).thenReturn(0L);
        when(conversaciones.findConPublicacion(11L)).thenReturn(Optional.of(conversacion));
        when(conversaciones.findByPublicacionId(4L)).thenReturn(List.of(conversacion));
        when(mensajes.findByConversacionIdAndTipoAndEstadoOfertaIn(11L, TipoMensaje.OFERTA,
                List.of(EstadoOferta.PENDIENTE))).thenReturn(List.of());
        when(mensajes.findById(1L)).thenReturn(Optional.of(mensaje));
        when(mensajes.findByConversacionIdAndRemitenteIdNotAndLeidoFalse(11L, 9L)).thenReturn(List.of());

        var detalle = service.iniciar(4L, "Hola", new Identidad(9L, "comprador"));
        assertNotNull(detalle);
        assertEquals(11L, detalle.conversacion().id());

        service.marcarVendida(11L, new Identidad(7L, "vende"));
        assertEquals(EstadoPublicacion.VENDIDA, publicacion.getEstado());
    }

    @Test
    void excepciones_mantienenMensajeYtiposEsperados() {
        NoAutorizadoException noAut = assertThrows(NoAutorizadoException.class,
                () -> {
                    throw new NoAutorizadoException("Acceso denegado");
                });
        assertEquals("Acceso denegado", noAut.getMessage());

        OperacionNoPermitidaException operacion = assertThrows(OperacionNoPermitidaException.class,
                () -> {
                    throw new OperacionNoPermitidaException("Operación restringida");
                });
        assertEquals("Operación restringida", operacion.getMessage());

        PublicacionNoEncontradaException publicacion = assertThrows(PublicacionNoEncontradaException.class,
                () -> {
                    throw new PublicacionNoEncontradaException("Publicación no encontrada");
                });
        assertEquals("Publicación no encontrada", publicacion.getMessage());

        ConversacionNoEncontradaException conversacion = assertThrows(ConversacionNoEncontradaException.class,
                () -> {
                    throw new ConversacionNoEncontradaException("Conversación no encontrada");
                });
        assertEquals("Conversación no encontrada", conversacion.getMessage());

        TicketNoEncontradoException ticket = assertThrows(TicketNoEncontradoException.class,
                () -> {
                    throw new TicketNoEncontradoException("Ticket no encontrado");
                });
        assertEquals("Ticket no encontrado", ticket.getMessage());

        DemasiadasSolicitudesException demasiadas = assertThrows(DemasiadasSolicitudesException.class,
                () -> {
                    throw new DemasiadasSolicitudesException("Demasiadas solicitudes");
                });
        assertEquals("Demasiadas solicitudes", demasiadas.getMessage());
    }

    @Test
    void publicacionServiceImpl_rechazaFotoInvalidaYUsuarioInvalido() throws Exception {
        PublicacionRepository repository = mock(PublicacionRepository.class);
        ImagenPublicacionRepository imagenRepo = mock(ImagenPublicacionRepository.class);
        PublicacionMapper mapper = mock(PublicacionMapper.class);
        PublicacionServiceImpl service = new PublicacionServiceImpl();
        ReflectionTestUtils.setField(service, "repository", repository);
        ReflectionTestUtils.setField(service, "imagenRepository", imagenRepo);
        ReflectionTestUtils.setField(service, "mapper", mapper);
        ReflectionTestUtils.setField(service, "textos", new Textos());
        ReflectionTestUtils.setField(service, "maxFotos", 2);
        ReflectionTestUtils.setField(service, "maxBytesPorFoto", 5L * 1024 * 1024);
        ReflectionTestUtils.setField(service, "tiposPermitidos", List.of("image/jpeg", "image/png", "image/webp"));

        byte[] invalid = new byte[] {1, 2, 3};
        MockMultipartFile fotoInvalida = new MockMultipartFile("fotos", "foto.bin", "application/octet-stream", invalid);

        assertThrows(IllegalArgumentException.class, () -> service.crear(
                new com.marketroad.publication.dto.NuevaPublicacionDTO(
                        "Laptop gamer", "250000", "Excelente estado", "Santiago", "ELECTRONICA",
                        List.of("ENVIO"), -33.4, -70.6),
                List.of(fotoInvalida), new Identidad(7L, "ana")));

        assertThrows(IllegalArgumentException.class, () -> service.crear(
                new com.marketroad.publication.dto.NuevaPublicacionDTO(
                        "Laptop gamer", "250000", "Excelente estado", "Santiago", "ELECTRONICA",
                        List.of("ENVIO"), -33.4, -70.6),
                List.of(jpegFoto()), new Identidad(null, "ana")));
    }

    @Test
    void catalogoService_yAdminPublicacionService_devuelvenVacíoCuandoNoHayDatos() {
        PublicacionRepository repository = mock(PublicacionRepository.class);
        PublicacionMapper mapper = mock(PublicacionMapper.class);
        CatalogoProcesador procesador = mock(CatalogoProcesador.class);
        CatalogoService service = new CatalogoService();
        ReflectionTestUtils.setField(service, "repository", repository);
        ReflectionTestUtils.setField(service, "mapper", mapper);
        ReflectionTestUtils.setField(service, "procesador", procesador);

        when(repository.findByEstadoOrderByFechaCreacionDesc(EstadoPublicacion.ACTIVA)).thenReturn(List.of());
        when(procesador.procesar(any(), any(CatalogoConsulta.class))).thenReturn(List.of());
        when(procesador.pagina(any(), any(Integer.class), any(Integer.class))).thenReturn(List.of());
        when(procesador.totalPaginas(any(Integer.class), any(Integer.class))).thenReturn(0);

        PaginaDTO<PublicacionResponseDTO> pagina = service
                .buscar(new CatalogoConsulta(null, null, null, null, null, null, null, null, 0, 20));
        assertEquals(0, pagina.total());
        assertEquals(0, pagina.contenido().size());

        AdminPublicacionService admin = new AdminPublicacionService();
        PublicacionRepository adminRepo = mock(PublicacionRepository.class);
        ReflectionTestUtils.setField(admin, "repository", adminRepo);
        ReflectionTestUtils.setField(admin, "mapper", mapper);
        when(adminRepo.findAll(any(Sort.class))).thenReturn(List.of());

        assertTrue(admin.listarTodas().isEmpty());
    }

    @Test
    void publicacionMapper_aDTOYContarImagenesGeneraUrlsYConteos() {
        PublicacionMapper mapper = new PublicacionMapper();
        ImagenPublicacionRepository imagenRepo = mock(ImagenPublicacionRepository.class);
        ReflectionTestUtils.setField(mapper, "imagenRepository", imagenRepo);

        Publicacion publicacion = new Publicacion();
        ReflectionTestUtils.setField(publicacion, "id", 7L);
        publicacion.setTitulo("Bicicleta");
        publicacion.setDescripcion("Usada");
        publicacion.setUbicacion("Concepción");
        publicacion.setCategoria(CategoriaPublicacion.DEPORTES);
        publicacion.setModalidadesEntrega(EnumSet.of(ModalidadEntrega.ENVIO, ModalidadEntrega.ENTREGA_PERSONAL));
        publicacion.setLatitud(-36.8);
        publicacion.setLongitud(-73.1);
        publicacion.setUsuarioId(11L);
        publicacion.setVendedorApodo("pedro");
        publicacion.setEstado(EstadoPublicacion.ACTIVA);
        publicacion.setPrecio(new BigDecimal("850000"));

        PublicacionResponseDTO dto = mapper.aDTO(publicacion, 2, 12.5);
        assertEquals(7L, dto.id());
        assertEquals(2, dto.imagenUrls().size());
        assertEquals("/api/v1/publicaciones/7/imagenes/0", dto.imagenUrls().get(0));
        assertEquals("DEPORTES", dto.categoria());
        assertTrue(dto.modalidadesEntrega().stream().anyMatch(m -> "Entrega en persona".equals(m.nombre())));
        assertTrue(dto.modalidadesEntrega().stream().anyMatch(m -> "Envío".equals(m.nombre())));

        when(imagenRepo.contarPorPublicacion(List.of(7L, 8L))).thenReturn(List.of(new Object[] {7L, 2}, new Object[] {8L, 1}));
        Map<Long, Integer> conteos = mapper.contarImagenes(List.of(7L, 8L));
        assertEquals(2, conteos.get(7L));
        assertEquals(1, conteos.get(8L));
    }

    @Test
    void limitadorMensajes_soloPermiteNumeroDeAccionesConfigurado() {
        LimitadorMensajes limitador = new LimitadorMensajes();
        ReflectionTestUtils.setField(limitador, "reloj", Clock.fixed(OffsetDateTime.parse("2025-01-01T10:00:00Z").toInstant(), java.time.ZoneOffset.UTC));
        ReflectionTestUtils.setField(limitador, "maximo", 2);
        ReflectionTestUtils.setField(limitador, "ventanaMs", 1000L);

        limitador.registrar(99L);
        limitador.registrar(99L);
        assertThrows(DemasiadasSolicitudesException.class, () -> limitador.registrar(99L));
    }

    @Test
    void reglasMensajeria_validanContenidoMontoYRol() {
        ReglasMensajeria reglas = new ReglasMensajeria();
        ReflectionTestUtils.setField(reglas, "textos", new Textos());
        ReflectionTestUtils.setField(reglas, "montoMaximo", new BigDecimal("1000000"));

        assertEquals("Hola   mundo", reglas.normalizarContenido("  Hola   mundo  "));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarContenido("   "));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarContenido("x".repeat(2001)));

        assertEquals(new BigDecimal("250.50").setScale(2), reglas.validarMonto(new BigDecimal("250.5")));
        assertThrows(IllegalArgumentException.class, () -> reglas.validarMonto(BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class, () -> reglas.validarMonto(new BigDecimal("1.234")));
        assertThrows(IllegalArgumentException.class, () -> reglas.validarMonto(new BigDecimal("1000001")));

        assertEquals("Hola mundo", reglas.vistaPrevia("Hola        mundo"));
        assertEquals("Usuario #8", reglas.apodoODefecto(null, 8L));
        assertEquals(ReglasMensajeria.Rol.COMPRADOR, reglas.rolDe(10L, 10L, 12L));
        assertEquals(ReglasMensajeria.Rol.VENDEDOR, reglas.rolDe(12L, 10L, 12L));
        assertEquals("$250,5", reglas.formatearMonto(new BigDecimal("250.5")));
    }

    @Test
    void publicacionServiceImpl_rechazaDatosInvalidosEnVariasRutas() throws Exception {
        PublicacionRepository repository = mock(PublicacionRepository.class);
        ImagenPublicacionRepository imagenRepo = mock(ImagenPublicacionRepository.class);
        PublicacionMapper mapper = mock(PublicacionMapper.class);
        PublicacionServiceImpl service = new PublicacionServiceImpl();
        ReflectionTestUtils.setField(service, "repository", repository);
        ReflectionTestUtils.setField(service, "imagenRepository", imagenRepo);
        ReflectionTestUtils.setField(service, "mapper", mapper);
        ReflectionTestUtils.setField(service, "textos", new Textos());
        ReflectionTestUtils.setField(service, "maxFotos", 2);
        ReflectionTestUtils.setField(service, "maxBytesPorFoto", 5L * 1024 * 1024);
        ReflectionTestUtils.setField(service, "tiposPermitidos", List.of("image/jpeg", "image/png", "image/webp"));

        assertThrows(IllegalArgumentException.class, () -> service.crear(
                new com.marketroad.publication.dto.NuevaPublicacionDTO(
                        "Laptop gamer", "0", "Excelente estado", "Santiago", "ELECTRONICA",
                        List.of("ENVIO"), -33.4, -70.6),
                List.of(jpegFoto()), new Identidad(7L, "ana")));

        assertThrows(IllegalArgumentException.class, () -> service.crear(
                new com.marketroad.publication.dto.NuevaPublicacionDTO(
                        "Laptop gamer", "250000", "Excelente estado", "Santiago", "CATEGORIA_INEXISTENTE",
                        List.of("ENVIO"), -33.4, -70.6),
                List.of(jpegFoto()), new Identidad(7L, "ana")));

        assertThrows(IllegalArgumentException.class, () -> service.crear(
                new com.marketroad.publication.dto.NuevaPublicacionDTO(
                        "Laptop gamer", "250000", "Excelente estado", "Santiago", "ELECTRONICA",
                        List.of("ENVIO"), null, -70.6),
                List.of(jpegFoto()), new Identidad(7L, "ana")));
    }

    @Test
    void soporteService_rechazaResponderSinPermisoYsinTextoCuandoSeResuelve() {
        TicketSoporteRepository ticketRepo = mock(TicketSoporteRepository.class);
        SoporteService service = new SoporteService();
        ReflectionTestUtils.setField(service, "tickets", ticketRepo);

        TicketSoporte ticket = new TicketSoporte();
        ReflectionTestUtils.setField(ticket, "id", 99L);
        ticket.setUsuarioId(3L);
        ticket.setUsuarioApodo("pedro");
        ticket.setCategoria(CategoriaSoporte.CUENTA);
        ticket.setAsunto("Pago");
        ticket.setDescripcion("Necesito ayuda con el pago");
        ticket.setEstado(EstadoTicket.ABIERTO);

        when(ticketRepo.findById(99L)).thenReturn(Optional.of(ticket));
        when(ticketRepo.save(any(TicketSoporte.class))).thenReturn(ticket);

        assertThrows(NoAutorizadoException.class, () -> service.responder(99L,
                new TicketSoporteRespuestaDTO(EstadoTicket.RESUELTO, "Listo"),
                new Identidad(3L, "pedro")));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.responder(99L,
                new TicketSoporteRespuestaDTO(EstadoTicket.RESUELTO, ""),
                new Identidad(9L, "admin", Identidad.ROL_SUPERUSUARIO)));
        assertTrue(ex.getMessage().contains("respuesta"));
    }

    @Test
    void limitadorMensajes_reiniciaDespuesDeLaVentana() {
        AtomicLong now = new AtomicLong(1000L);
        LimitadorMensajes limitador = new LimitadorMensajes();
        ReflectionTestUtils.setField(limitador, "reloj", new Clock() {
            @Override public ZoneId getZone() { return ZoneId.of("UTC"); }
            @Override public Clock withZone(ZoneId zone) { return this; }
            @Override public Instant instant() { return Instant.ofEpochMilli(now.get()); }
        });
        ReflectionTestUtils.setField(limitador, "maximo", 1);
        ReflectionTestUtils.setField(limitador, "ventanaMs", 500L);

        limitador.registrar(15L);
        assertThrows(DemasiadasSolicitudesException.class, () -> limitador.registrar(15L));

        now.set(2000L);
        limitador.registrar(15L);
    }

    @Test
    void reglasMensajeria_rechazaContenidoNuloYTruncaVistaPrevia() {
        ReglasMensajeria reglas = new ReglasMensajeria();
        ReflectionTestUtils.setField(reglas, "textos", new Textos());
        ReflectionTestUtils.setField(reglas, "montoMaximo", new BigDecimal("50000"));

        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarContenido(null));
        assertEquals("Usuario #44", reglas.apodoODefecto("   ", 44L));
        assertEquals("x".repeat(119) + "…", reglas.vistaPrevia("x".repeat(500)));
        assertNull(reglas.rolDe(100L, null, null));
        assertEquals("$2.500", reglas.formatearMonto(new BigDecimal("2500")));
    }

    @Test
    void globalExceptionHandler_respondeMapasEsperadas() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();

        assertEquals("mensaje", handler.argumento(new IllegalArgumentException("Faltan datos")).keySet().iterator().next());
        assertEquals("Faltan datos", handler.argumento(new IllegalArgumentException("Faltan datos")).get("mensaje"));
        assertEquals("Acceso denegado", handler.noAutorizado(new NoAutorizadoException("Acceso denegado")).get("mensaje"));
        assertEquals("Publicación no encontrada", handler.noEncontrada(new PublicacionNoEncontradaException("Publicación no encontrada")).get("mensaje"));
        assertEquals("Conversación no encontrada", handler.conversacionNoEncontrada(new ConversacionNoEncontradaException("Conversación no encontrada")).get("mensaje"));
        assertEquals("Demasiadas solicitudes", handler.demasiadas(new DemasiadasSolicitudesException("Demasiadas solicitudes")).get("mensaje"));
        assertEquals("Operación restringida", handler.conflicto(new OperacionNoPermitidaException("Operación restringida")).get("mensaje"));
        assertEquals("Ocurrió un error inesperado en el servidor", handler.generico(new RuntimeException("boom")).get("mensaje"));
    }
}
