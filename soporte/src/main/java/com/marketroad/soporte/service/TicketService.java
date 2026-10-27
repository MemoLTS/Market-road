package com.marketroad.soporte.service;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.marketroad.soporte.dto.CategoriaDTO;
import com.marketroad.soporte.dto.CrearTicketRequestDTO;
import com.marketroad.soporte.dto.MensajeTicketDTO;
import com.marketroad.soporte.dto.NoLeidosDTO;
import com.marketroad.soporte.dto.PaginaDTO;
import com.marketroad.soporte.dto.TicketDetalleDTO;
import com.marketroad.soporte.dto.TicketPanelDetalleDTO;
import com.marketroad.soporte.dto.TicketPanelResumenDTO;
import com.marketroad.soporte.dto.TicketResumenDTO;
import com.marketroad.soporte.dto.UsuarioTicketDTO;
import com.marketroad.soporte.exception.NoAutorizadoException;
import com.marketroad.soporte.exception.OperacionNoPermitidaException;
import com.marketroad.soporte.exception.PersonalNoEncontradoException;
import com.marketroad.soporte.exception.TicketNoEncontradoException;
import com.marketroad.soporte.model.AutorTipo;
import com.marketroad.soporte.model.CategoriaTicket;
import com.marketroad.soporte.model.EstadoTicket;
import com.marketroad.soporte.model.MensajeTicket;
import com.marketroad.soporte.model.PersonalSoporte;
import com.marketroad.soporte.model.PrioridadTicket;
import com.marketroad.soporte.model.Ticket;
import com.marketroad.soporte.reglas.LimitadorAcciones;
import com.marketroad.soporte.reglas.ReglasTicket;
import com.marketroad.soporte.repository.MensajeTicketRepository;
import com.marketroad.soporte.repository.PersonalSoporteRepository;
import com.marketroad.soporte.repository.TicketRepository;
import com.marketroad.soporte.repository.TicketSpecs;
import com.marketroad.soporte.security.IdentidadPersonal;
import com.marketroad.soporte.security.IdentidadUsuario;

/**
 * Tickets y chat de soporte. Tiene dos "lados" con permisos distintos:
 * la persona usuaria solo ve y escribe en SUS tickets; el personal ve los tickets según su rol
 * (ADMIN todos y con los datos de quien escribe; SOPORTE los sin asignar y los suyos).
 */
@Service
public class TicketService {
    private static final String NOMBRE_SISTEMA = "Sistema";
    private static final Set<EstadoTicket> ESTADOS_ACTIVOS = EnumSet.of(EstadoTicket.ABIERTO, EstadoTicket.EN_PROGRESO);

    @Autowired
    private TicketRepository tickets;
    @Autowired
    private MensajeTicketRepository mensajes;
    @Autowired
    private PersonalSoporteRepository personal;
    @Autowired
    @Qualifier("limitadorMensajes")
    private LimitadorAcciones limitadorMensajes;
    @Autowired
    @Qualifier("limitadorTickets")
    private LimitadorAcciones limitadorTickets;

    // =====================================================================
    //  Lado de la persona usuaria
    // =====================================================================

    public List<CategoriaDTO> categorias() {
        return Arrays.stream(CategoriaTicket.values()).map(c -> new CategoriaDTO(c.name(), c.getNombre())).toList();
    }

    @Transactional
    public TicketDetalleDTO crear(IdentidadUsuario yo, CrearTicketRequestDTO body) {
        String asunto = ReglasTicket.normalizarAsunto(body.asunto());
        CategoriaTicket categoria = CategoriaTicket.desdeCodigo(body.categoria());
        String contenido = ReglasTicket.normalizarContenido(body.mensaje());
        ReglasTicket.validarCupo(tickets.countByUsuarioIdAndEstadoIn(yo.usuarioId(), ReglasTicket.ESTADOS_QUE_OCUPAN_CUPO));
        limitadorTickets.registrar("t:" + yo.usuarioId());
        limitadorMensajes.registrar("u:" + yo.usuarioId());

        Ticket ticket = new Ticket();
        ticket.setUsuarioId(yo.usuarioId());
        ticket.setUsuarioApodo(yo.nombreVisible());
        ticket.setUsuarioCorreo(yo.correo());
        ticket.setAsunto(asunto);
        ticket.setCategoria(categoria);
        tickets.save(ticket);

        agregarMensaje(ticket, AutorTipo.USUARIO, yo.usuarioId(), yo.nombreVisible(), contenido);
        agregarMensaje(ticket, AutorTipo.SISTEMA, null, NOMBRE_SISTEMA,
                "Recibimos tu ticket. Una persona del equipo de soporte te responderá por este chat.");
        return detalleUsuario(ticket);
    }

    @Transactional(readOnly = true)
    public List<TicketResumenDTO> listarDeUsuario(IdentidadUsuario yo) {
        List<Ticket> lista = tickets.findByUsuarioIdOrderByFechaActualizacionDesc(yo.usuarioId());
        Map<Long, Long> noLeidos = noLeidosPorTicket(lista, AutorTipo.PERSONAL);
        return lista.stream().map(t -> resumenUsuario(t, noLeidos.getOrDefault(t.getId(), 0L))).toList();
    }

    @Transactional(readOnly = true)
    public NoLeidosDTO contarNoLeidos(IdentidadUsuario yo) {
        return new NoLeidosDTO(mensajes.contarNoLeidosDeUsuario(yo.usuarioId(), AutorTipo.PERSONAL));
    }

    @Transactional
    public TicketDetalleDTO obtenerDeUsuario(Long id, IdentidadUsuario yo) {
        Ticket ticket = ticketDeUsuario(id, yo);
        mensajes.marcarLeidos(ticket.getId(), AutorTipo.PERSONAL);
        return detalleUsuario(ticket);
    }

    @Transactional
    public TicketDetalleDTO responderUsuario(Long id, String contenido, IdentidadUsuario yo) {
        Ticket ticket = ticketDeUsuario(id, yo);
        if (!ReglasTicket.usuarioPuedeEscribir(ticket.getEstado())) {
            throw new OperacionNoPermitidaException("Este ticket está cerrado. Abre uno nuevo si necesitas más ayuda");
        }
        String limpio = ReglasTicket.normalizarContenido(contenido);
        limitadorMensajes.registrar("u:" + yo.usuarioId());
        ReglasTicket.validarLimiteMensajes(mensajes.countByTicketId(ticket.getId()));

        EstadoTicket nuevo = ReglasTicket.estadoTrasMensajeUsuario(ticket.getEstado(), ticket.getAsignadoId());
        if (nuevo != ticket.getEstado()) {
            aplicarEstado(ticket, nuevo, "El ticket se reabrió porque escribiste de nuevo.");
        }
        agregarMensaje(ticket, AutorTipo.USUARIO, yo.usuarioId(), yo.nombreVisible(), limpio);
        mensajes.marcarLeidos(ticket.getId(), AutorTipo.PERSONAL);
        return detalleUsuario(ticket);
    }

    @Transactional
    public TicketDetalleDTO cerrarUsuario(Long id, IdentidadUsuario yo) {
        Ticket ticket = ticketDeUsuario(id, yo);
        if (ticket.getEstado() == EstadoTicket.CERRADO) {
            throw new OperacionNoPermitidaException("Este ticket ya está cerrado");
        }
        aplicarEstado(ticket, EstadoTicket.CERRADO, yo.nombreVisible() + " cerró el ticket.");
        return detalleUsuario(ticket);
    }

    private Ticket ticketDeUsuario(Long id, IdentidadUsuario yo) {
        // Un ticket ajeno responde igual que uno inexistente: no se revela que existe.
        return tickets.findByIdAndUsuarioId(id, yo.usuarioId())
                .orElseThrow(() -> new TicketNoEncontradoException("El ticket no existe"));
    }

    private TicketDetalleDTO detalleUsuario(Ticket ticket) {
        List<MensajeTicketDTO> lista = mensajes.findByTicketIdOrderByIdAsc(ticket.getId()).stream().map(this::mensajeDTO).toList();
        // El detalle siempre se arma después de marcar como leídas las respuestas, por eso no hay pendientes.
        return new TicketDetalleDTO(resumenUsuario(ticket, 0L), lista, ReglasTicket.usuarioPuedeEscribir(ticket.getEstado()));
    }

    private TicketResumenDTO resumenUsuario(Ticket t, long noLeidos) {
        return new TicketResumenDTO(t.getId(), t.getAsunto(), t.getCategoria().name(), t.getCategoria().getNombre(),
                t.getEstado().name(), t.getEstado().getNombre(), t.getUltimoMensaje(), noLeidos,
                t.getFechaCreacion(), t.getFechaActualizacion());
    }

    // =====================================================================
    //  Lado del personal de soporte
    // =====================================================================

    @Transactional(readOnly = true)
    public PaginaDTO<TicketPanelResumenDTO> listarPanel(IdentidadPersonal yo, String estado, String prioridad,
            String categoria, String asignacion, String texto, int pagina, int tamano) {
        Specification<Ticket> spec = TicketSpecs.todos();
        if (!yo.esAdmin()) {
            spec = spec.and(TicketSpecs.visiblesPara(yo.personalId()));
        }
        if (estado != null && !estado.isBlank()) {
            // "ACTIVOS" agrupa los que necesitan atención (abiertos y en progreso).
            spec = spec.and(TicketSpecs.estadoEn("ACTIVOS".equalsIgnoreCase(estado.trim())
                    ? ESTADOS_ACTIVOS : EnumSet.of(EstadoTicket.desdeCodigo(estado))));
        }
        if (prioridad != null && !prioridad.isBlank()) {
            spec = spec.and(TicketSpecs.prioridad(PrioridadTicket.desdeCodigo(prioridad)));
        }
        if (categoria != null && !categoria.isBlank()) {
            spec = spec.and(TicketSpecs.categoria(CategoriaTicket.desdeCodigo(categoria)));
        }
        if ("MIOS".equalsIgnoreCase(asignacion)) {
            spec = spec.and(TicketSpecs.asignadoA(yo.personalId()));
        } else if ("SIN_ASIGNAR".equalsIgnoreCase(asignacion)) {
            spec = spec.and(TicketSpecs.sinAsignar());
        }
        if (texto != null && !texto.isBlank()) {
            String limpio = texto.trim();
            spec = spec.and(TicketSpecs.busqueda(limpio.length() > 100 ? limpio.substring(0, 100) : limpio));
        }

        int paginaSegura = Math.max(0, pagina);
        int tamanoSeguro = Math.min(50, Math.max(1, tamano));
        Page<Ticket> resultado = tickets.findAll(spec,
                PageRequest.of(paginaSegura, tamanoSeguro, Sort.by(Sort.Direction.DESC, "fechaActualizacion")));

        List<Ticket> lista = resultado.getContent();
        Map<Long, Long> sinLeer = noLeidosPorTicket(lista, AutorTipo.USUARIO);
        Map<Long, String> nombres = nombresDePersonal(lista);
        List<TicketPanelResumenDTO> contenido = lista.stream()
                .map(t -> resumenPanel(t, sinLeer.getOrDefault(t.getId(), 0L), nombres)).toList();
        return new PaginaDTO<>(contenido, resultado.getNumber(), resultado.getSize(),
                resultado.getTotalElements(), resultado.getTotalPages());
    }

    @Transactional
    public TicketPanelDetalleDTO obtenerPanel(Long id, IdentidadPersonal yo) {
        Ticket ticket = ticketVisible(id, yo);
        mensajes.marcarLeidos(ticket.getId(), AutorTipo.USUARIO);
        return detallePanel(ticket, yo);
    }

    @Transactional
    public TicketPanelDetalleDTO responderPanel(Long id, String contenido, IdentidadPersonal yo) {
        Ticket ticket = ticketVisible(id, yo);
        exigirAbierto(ticket);
        if (ticket.getAsignadoId() != null && !ReglasTicket.personalPuedeGestionar(yo.rol(), yo.personalId(), ticket.getAsignadoId())) {
            throw new NoAutorizadoException("Este ticket lo lleva otra persona del equipo");
        }
        String limpio = ReglasTicket.normalizarContenido(contenido);
        limitadorMensajes.registrar("p:" + yo.personalId());
        ReglasTicket.validarLimiteMensajes(mensajes.countByTicketId(ticket.getId()));

        // Responder un ticket sin dueño equivale a tomarlo.
        if (ticket.getAsignadoId() == null) {
            tomarInterno(ticket, yo);
        } else if (ticket.getEstado() == EstadoTicket.ABIERTO) {
            ticket.setEstado(ReglasTicket.estadoTrasRespuestaPersonal(ticket.getEstado()));
        }
        agregarMensaje(ticket, AutorTipo.PERSONAL, yo.personalId(), yo.nombre(), limpio);
        mensajes.marcarLeidos(ticket.getId(), AutorTipo.USUARIO);
        return detallePanel(ticket, yo);
    }

    @Transactional
    public TicketPanelDetalleDTO tomar(Long id, IdentidadPersonal yo) {
        Ticket ticket = ticketVisible(id, yo);
        exigirAbierto(ticket);
        if (yo.personalId().equals(ticket.getAsignadoId())) {
            throw new OperacionNoPermitidaException("Ya llevas este ticket");
        }
        if (ticket.getAsignadoId() != null && !yo.esAdmin()) {
            throw new OperacionNoPermitidaException("Este ticket ya lo lleva otra persona del equipo");
        }
        tomarInterno(ticket, yo);
        return detallePanel(ticket, yo);
    }

    @Transactional
    public TicketPanelDetalleDTO cambiarEstado(Long id, String estado, IdentidadPersonal yo) {
        Ticket ticket = ticketVisible(id, yo);
        if (ticket.getAsignadoId() == null && !yo.esAdmin()) {
            throw new NoAutorizadoException("Toma el ticket antes de cambiar su estado");
        }
        if (!ReglasTicket.personalPuedeGestionar(yo.rol(), yo.personalId(), ticket.getAsignadoId())) {
            throw new NoAutorizadoException("Este ticket lo lleva otra persona del equipo");
        }
        EstadoTicket nuevo = EstadoTicket.desdeCodigo(estado);
        if (!ReglasTicket.transicionPermitida(ticket.getEstado(), nuevo, yo.esAdmin())) {
            throw new OperacionNoPermitidaException("No se puede pasar el ticket de «" + ticket.getEstado().getNombre()
                    + "» a «" + nuevo.getNombre() + "»");
        }
        aplicarEstado(ticket, nuevo, yo.nombre() + " cambió el estado a «" + nuevo.getNombre() + "».");
        return detallePanel(ticket, yo);
    }

    @Transactional
    public TicketPanelDetalleDTO cambiarPrioridad(Long id, String prioridad, IdentidadPersonal yo) {
        Ticket ticket = ticketVisible(id, yo);
        ticket.setPrioridad(PrioridadTicket.desdeCodigo(prioridad));
        return detallePanel(ticket, yo);
    }

    /** Solo ADMIN: asigna el ticket a cualquier integrante activo, o lo deja sin asignar (personalId null). */
    @Transactional
    public TicketPanelDetalleDTO asignar(Long id, Long personalId, IdentidadPersonal yo) {
        yo.exigirAdmin();
        Ticket ticket = ticketVisible(id, yo);
        exigirAbierto(ticket);
        if (personalId == null) {
            ticket.setAsignadoId(null);
            if (ticket.getEstado() == EstadoTicket.EN_PROGRESO) {
                ticket.setEstado(EstadoTicket.ABIERTO);
            }
            agregarMensaje(ticket, AutorTipo.SISTEMA, null, NOMBRE_SISTEMA, "El ticket quedó sin asignar.");
        } else {
            PersonalSoporte destino = personal.findById(personalId)
                    .orElseThrow(() -> new PersonalNoEncontradoException("La persona indicada no existe"));
            if (!destino.isActivo()) {
                throw new OperacionNoPermitidaException("Esa cuenta de soporte está desactivada");
            }
            ticket.setAsignadoId(destino.getId());
            if (ticket.getEstado() == EstadoTicket.ABIERTO) {
                ticket.setEstado(EstadoTicket.EN_PROGRESO);
            }
            agregarMensaje(ticket, AutorTipo.SISTEMA, null, NOMBRE_SISTEMA, "El ticket fue asignado a " + destino.getNombre() + ".");
        }
        return detallePanel(ticket, yo);
    }

    private Ticket ticketVisible(Long id, IdentidadPersonal yo) {
        Ticket ticket = tickets.findById(id).orElseThrow(() -> new TicketNoEncontradoException("El ticket no existe"));
        if (!ReglasTicket.personalPuedeVer(yo.rol(), yo.personalId(), ticket.getAsignadoId())) {
            throw new TicketNoEncontradoException("El ticket no existe");
        }
        return ticket;
    }

    private void exigirAbierto(Ticket ticket) {
        if (ticket.getEstado() == EstadoTicket.CERRADO) {
            throw new OperacionNoPermitidaException("El ticket está cerrado");
        }
    }

    private void tomarInterno(Ticket ticket, IdentidadPersonal yo) {
        ticket.setAsignadoId(yo.personalId());
        if (ticket.getEstado() == EstadoTicket.ABIERTO) {
            ticket.setEstado(EstadoTicket.EN_PROGRESO);
        }
        agregarMensaje(ticket, AutorTipo.SISTEMA, null, NOMBRE_SISTEMA, yo.nombre() + " tomó el ticket.");
    }

    private TicketPanelDetalleDTO detallePanel(Ticket ticket, IdentidadPersonal yo) {
        Map<Long, String> nombres = nombresDePersonal(List.of(ticket));
        TicketPanelResumenDTO resumen = resumenPanel(ticket, 0L, nombres);
        UsuarioTicketDTO usuario = yo.esAdmin()
                ? new UsuarioTicketDTO(ticket.getUsuarioId(), ticket.getUsuarioApodo(), ticket.getUsuarioCorreo())
                : new UsuarioTicketDTO(null, ticket.getUsuarioApodo(), null);
        List<MensajeTicketDTO> lista = mensajes.findByTicketIdOrderByIdAsc(ticket.getId()).stream().map(this::mensajeDTO).toList();

        boolean abierto = ticket.getEstado() != EstadoTicket.CERRADO;
        boolean gestiona = ReglasTicket.personalPuedeGestionar(yo.rol(), yo.personalId(), ticket.getAsignadoId());
        boolean puedeResponder = abierto && (ticket.getAsignadoId() == null || gestiona);
        List<String> estados = gestiona
                ? ReglasTicket.siguientesEstados(ticket.getEstado(), yo.esAdmin()).stream().map(EstadoTicket::name).toList()
                : List.of();
        boolean puedeTomar = abierto && !yo.personalId().equals(ticket.getAsignadoId())
                && (ticket.getAsignadoId() == null || yo.esAdmin());
        return new TicketPanelDetalleDTO(resumen, usuario, lista, puedeResponder, estados, puedeTomar);
    }

    private TicketPanelResumenDTO resumenPanel(Ticket t, long sinLeer, Map<Long, String> nombres) {
        return new TicketPanelResumenDTO(t.getId(), t.getAsunto(), t.getCategoria().name(), t.getCategoria().getNombre(),
                t.getEstado().name(), t.getEstado().getNombre(), t.getPrioridad().name(), t.getPrioridad().getNombre(),
                t.getUsuarioApodo(), t.getAsignadoId(), t.getAsignadoId() == null ? null : nombres.get(t.getAsignadoId()),
                sinLeer, t.getUltimoMensaje(), t.getFechaCreacion(), t.getFechaActualizacion());
    }

    // =====================================================================
    //  Comunes
    // =====================================================================

    private MensajeTicket agregarMensaje(Ticket ticket, AutorTipo tipo, Long autorId, String autorNombre, String contenido) {
        MensajeTicket mensaje = new MensajeTicket();
        mensaje.setTicket(ticket);
        mensaje.setAutorTipo(tipo);
        mensaje.setAutorId(autorId);
        mensaje.setAutorNombre(autorNombre);
        mensaje.setContenido(contenido);
        // Los avisos del sistema no cuentan como "sin leer" para nadie.
        mensaje.setLeido(tipo == AutorTipo.SISTEMA);
        mensajes.save(mensaje);

        ticket.setFechaActualizacion(OffsetDateTime.now());
        if (tipo != AutorTipo.SISTEMA) {
            ticket.setUltimoMensaje(ReglasTicket.vistaPrevia(contenido));
        }
        return mensaje;
    }

    /** Cambia el estado dejando un aviso en el chat. Volver a "abierto" libera el ticket (queda sin asignar). */
    private void aplicarEstado(Ticket ticket, EstadoTicket nuevo, String aviso) {
        ticket.setEstado(nuevo);
        ticket.setFechaCierre(nuevo == EstadoTicket.CERRADO ? OffsetDateTime.now() : null);
        if (nuevo == EstadoTicket.ABIERTO) {
            ticket.setAsignadoId(null);
        }
        agregarMensaje(ticket, AutorTipo.SISTEMA, null, NOMBRE_SISTEMA, aviso);
    }

    private MensajeTicketDTO mensajeDTO(MensajeTicket m) {
        return new MensajeTicketDTO(m.getId(), m.getAutorTipo().name(), m.getAutorNombre(), m.getContenido(), m.getFecha());
    }

    private Map<Long, Long> noLeidosPorTicket(Collection<Ticket> lista, AutorTipo autor) {
        Map<Long, Long> resultado = new HashMap<>();
        if (lista.isEmpty()) {
            return resultado;
        }
        List<Long> ids = lista.stream().map(Ticket::getId).toList();
        for (Object[] fila : mensajes.contarNoLeidosPorTicket(ids, autor)) {
            resultado.put((Long) fila[0], (Long) fila[1]);
        }
        return resultado;
    }

    private Map<Long, String> nombresDePersonal(Collection<Ticket> lista) {
        List<Long> ids = lista.stream().map(Ticket::getAsignadoId).filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return new HashMap<>();
        }
        return personal.findAllById(ids).stream().collect(Collectors.toMap(PersonalSoporte::getId, PersonalSoporte::getNombre));
    }
}
