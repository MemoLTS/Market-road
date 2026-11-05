package com.marketroad.soporte.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.marketroad.soporte.dto.CategoriaDTO;
import com.marketroad.soporte.dto.CrearTicketRequestDTO;
import com.marketroad.soporte.dto.EstadisticasDTO;
import com.marketroad.soporte.dto.LoginResponseDTO;
import com.marketroad.soporte.dto.NoLeidosDTO;
import com.marketroad.soporte.dto.PaginaDTO;
import com.marketroad.soporte.dto.PersonalDTO;
import com.marketroad.soporte.dto.ResumenSoporteDTO;
import com.marketroad.soporte.dto.TicketDetalleDTO;
import com.marketroad.soporte.dto.TicketPanelDetalleDTO;
import com.marketroad.soporte.dto.TicketPanelResumenDTO;
import com.marketroad.soporte.dto.TicketResumenDTO;
import com.marketroad.soporte.exception.GlobalExceptionHandler;
import com.marketroad.soporte.repository.PersonalSoporteRepository;
import com.marketroad.soporte.security.IdentidadPersonal;
import com.marketroad.soporte.security.IdentidadUsuario;
import com.marketroad.soporte.security.JwtPersonalUtil;
import com.marketroad.soporte.security.JwtUsuarioUtil;
import com.marketroad.soporte.service.EstadisticasService;
import com.marketroad.soporte.service.PersonalService;
import com.marketroad.soporte.service.TicketService;

@WebMvcTest(controllers = {
        SoporteUsuarioController.class,
        PanelAuthController.class,
        PanelPersonalController.class,
        PanelTicketController.class,
        PanelEstadisticasController.class,
        AdminTicketController.class
})
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class ControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TicketService ticketService;

    @MockBean
    private PersonalService personalService;

    @MockBean
    private EstadisticasService estadisticasService;

    @MockBean
    private JwtUsuarioUtil jwtUsuarioUtil;

    @MockBean
    private JwtPersonalUtil jwtPersonalUtil;

    @MockBean
    private PersonalSoporteRepository personalSoporteRepository;

    @Test
    void soporteUsuarioControllerListaCategorias() throws Exception {
        when(ticketService.categorias()).thenReturn(List.of(new CategoriaDTO("CUENTA", "Cuenta")));

        mockMvc.perform(get("/api/v1/soporte/categorias"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].codigo").value("CUENTA"));
    }

    @Test
    void usuarioControllerListaTicketsConIdentidad() throws Exception {
        when(ticketService.listarDeUsuario(any())).thenReturn(List.of(new TicketResumenDTO(
                1L, "Asunto", "CUENTA", "Cuenta", "ABIERTO", "Abierto", "mensaje", 0L,
                OffsetDateTime.now(), OffsetDateTime.now())));

        mockMvc.perform(get("/api/v1/soporte/tickets")
                .requestAttr(IdentidadUsuario.ATRIBUTO,
                        new IdentidadUsuario(5L, "Ana", "ana@marketroad.cl", "CLIENTE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1));
    }

    @Test
    void panelAuthControllerLoginYYo() throws Exception {
        PersonalDTO personal = new PersonalDTO(10L, "Ana", "ana@marketroad.cl", "SOPORTE", "Soporte", true,
                OffsetDateTime.now(), null, 3L);
        when(personalService.login(any())).thenReturn(new LoginResponseDTO("token-abc", 300000L, personal));
        when(personalService.yo(any())).thenReturn(personal);

        mockMvc.perform(post("/api/v1/soporte/panel/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"correo\":\"ana@marketroad.cl\",\"contrasena\":\"Clave1234\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token-abc"));

        mockMvc.perform(get("/api/v1/soporte/panel/auth/yo")
                .requestAttr(IdentidadPersonal.ATRIBUTO, new IdentidadPersonal(10L, "Ana", com.marketroad.soporte.model.RolPersonal.SOPORTE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    void panelPersonalControllerListaYCrear() throws Exception {
        PersonalDTO personal = new PersonalDTO(11L, "Patricia", "patricia@marketroad.cl", "SOPORTE", "Soporte", true,
                OffsetDateTime.now(), null, 1L);
        when(personalService.listar(any())).thenReturn(List.of(personal));
        when(personalService.crear(any(), any())).thenReturn(personal);

        mockMvc.perform(get("/api/v1/soporte/panel/personal")
                .requestAttr(IdentidadPersonal.ATRIBUTO, new IdentidadPersonal(9L, "Admin", com.marketroad.soporte.model.RolPersonal.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].correo").value("patricia@marketroad.cl"));

        mockMvc.perform(post("/api/v1/soporte/panel/personal")
                .requestAttr(IdentidadPersonal.ATRIBUTO, new IdentidadPersonal(9L, "Admin", com.marketroad.soporte.model.RolPersonal.ADMIN))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Patricia\",\"correo\":\"patricia@marketroad.cl\",\"contrasena\":\"Clave1234\",\"rol\":\"SOPORTE\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void panelEstadisticasYAdminListanTickets() throws Exception {
        when(estadisticasService.obtener(any())).thenReturn(new EstadisticasDTO(
                3L, 1L, 0L, 1L,
                Map.of("ABIERTO", 1L), Map.of("CUENTA", 1L), Map.of("NORMAL", 1L), List.of()));
        when(ticketService.listarParaSuperusuario(any(), any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new PaginaDTO<>(List.of(new TicketPanelResumenDTO(
                        9L, "Asunto", "CUENTA", "Cuenta", "ABIERTO", "Abierto", "NORMAL", "Normal",
                        "Ana", 7L, "Patricia", 0L, "mensaje", OffsetDateTime.now(), OffsetDateTime.now())), 0, 20, 1, 1));

        mockMvc.perform(get("/api/v1/soporte/panel/estadisticas")
                .requestAttr(IdentidadPersonal.ATRIBUTO, new IdentidadPersonal(9L, "Admin", com.marketroad.soporte.model.RolPersonal.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTickets").value(3));

        mockMvc.perform(get("/api/v1/soporte/admin/tickets")
                .requestAttr(IdentidadUsuario.ATRIBUTO,
                        new IdentidadUsuario(1L, "Admin", "admin@marketroad.cl", "SUPERUSUARIO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[0].id").value(9));
    }

    @Test
    void usuarioControllerNoLeidosYCrearTicket() throws Exception {
        when(ticketService.contarNoLeidos(any())).thenReturn(new NoLeidosDTO(3L));
        when(ticketService.crear(any(), any())).thenReturn(new TicketDetalleDTO(
                new TicketResumenDTO(50L, "Pago", "CUENTA", "Cuenta", "ABIERTO", "Abierto", "mensaje", 0L,
                        OffsetDateTime.now(), OffsetDateTime.now()),
                List.of(), true));

        mockMvc.perform(get("/api/v1/soporte/tickets/no-leidos")
                .requestAttr(IdentidadUsuario.ATRIBUTO,
                        new IdentidadUsuario(5L, "Ana", "ana@marketroad.cl", "CLIENTE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cantidad").value(3));

        mockMvc.perform(post("/api/v1/soporte/tickets")
                .requestAttr(IdentidadUsuario.ATRIBUTO,
                        new IdentidadUsuario(5L, "Ana", "ana@marketroad.cl", "CLIENTE"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"asunto\":\"Pago\",\"categoria\":\"CUENTA\",\"mensaje\":\"Necesito ayuda\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ticket.id").value(50));
    }

    @Test
    void panelTicketControllerGestionaAccionesYAdminResumen() throws Exception {
        TicketPanelDetalleDTO detalle = new TicketPanelDetalleDTO(
                new TicketPanelResumenDTO(8L, "Asunto", "CUENTA", "Cuenta", "ABIERTO", "Abierto", "NORMAL",
                        "Normal", "Ana", null, null, 1L, "mensaje", OffsetDateTime.now(), OffsetDateTime.now()),
                new com.marketroad.soporte.dto.UsuarioTicketDTO(5L, "Ana", "ana@marketroad.cl"),
                List.of(), true, List.of("EN_PROGRESO", "CERRADO"), true);

        when(ticketService.obtenerPanel(eq(8L), any())).thenReturn(detalle);
        when(ticketService.responderPanel(eq(8L), any(), any())).thenReturn(detalle);
        when(ticketService.tomar(eq(8L), any())).thenReturn(detalle);
        when(ticketService.asignar(eq(8L), eq(3L), any())).thenReturn(detalle);
        when(ticketService.resumenParaSuperusuario()).thenReturn(
                new ResumenSoporteDTO(4L, 1L, Map.of("ABIERTO", 2L, "CERRADO", 2L)));
        when(ticketService.obtenerParaSuperusuario(7L)).thenReturn(detalle);

        mockMvc.perform(get("/api/v1/soporte/panel/tickets/8")
                .requestAttr(IdentidadPersonal.ATRIBUTO,
                        new IdentidadPersonal(7L, "Patricia", com.marketroad.soporte.model.RolPersonal.SOPORTE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticket.id").value(8));

        mockMvc.perform(post("/api/v1/soporte/panel/tickets/8/mensajes")
                .requestAttr(IdentidadPersonal.ATRIBUTO,
                        new IdentidadPersonal(7L, "Patricia", com.marketroad.soporte.model.RolPersonal.SOPORTE))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"contenido\":\"Hola\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/soporte/panel/tickets/8/tomar")
                .requestAttr(IdentidadPersonal.ATRIBUTO,
                        new IdentidadPersonal(7L, "Patricia", com.marketroad.soporte.model.RolPersonal.SOPORTE)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/soporte/panel/tickets/8/asignacion")
                .requestAttr(IdentidadPersonal.ATRIBUTO,
                        new IdentidadPersonal(9L, "Admin", com.marketroad.soporte.model.RolPersonal.ADMIN))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"personalId\":3}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/soporte/admin/tickets/resumen")
                .requestAttr(IdentidadUsuario.ATRIBUTO,
                        new IdentidadUsuario(1L, "Admin", "admin@marketroad.cl", "SUPERUSUARIO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(4));

        mockMvc.perform(get("/api/v1/soporte/admin/tickets/7")
                .requestAttr(IdentidadUsuario.ATRIBUTO,
                        new IdentidadUsuario(1L, "Admin", "admin@marketroad.cl", "SUPERUSUARIO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ticket.id").value(8));
    }

    @Test
    void panelAuthControllerCambiaContrasenaYPersonalActualiza() throws Exception {
        PersonalDTO actualizado = new PersonalDTO(12L, "Luis", "luis@marketroad.cl", "SOPORTE", "Soporte", true,
                OffsetDateTime.now(), null, 2L);
        doNothing().when(personalService).cambiarContrasenaPropia(any(), any());
        when(personalService.crear(any(), any())).thenReturn(actualizado);
        when(personalService.actualizar(any(), eq(12L), any())).thenReturn(actualizado);

        mockMvc.perform(post("/api/v1/soporte/panel/auth/contrasena")
                .requestAttr(IdentidadPersonal.ATRIBUTO,
                        new IdentidadPersonal(12L, "Luis", com.marketroad.soporte.model.RolPersonal.SOPORTE))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"actual\":\"Vieja1234\",\"nueva\":\"Nueva1234\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/soporte/panel/personal")
                .requestAttr(IdentidadPersonal.ATRIBUTO,
                        new IdentidadPersonal(9L, "Admin", com.marketroad.soporte.model.RolPersonal.ADMIN))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Luis\",\"correo\":\"luis@marketroad.cl\",\"contrasena\":\"Nueva1234\",\"rol\":\"SOPORTE\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/v1/soporte/panel/personal/12")
                .requestAttr(IdentidadPersonal.ATRIBUTO,
                        new IdentidadPersonal(9L, "Admin", com.marketroad.soporte.model.RolPersonal.ADMIN))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Luis\",\"activo\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.correo").value("luis@marketroad.cl"));
    }
}
