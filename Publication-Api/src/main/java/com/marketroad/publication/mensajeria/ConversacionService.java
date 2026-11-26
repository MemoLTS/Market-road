package com.marketroad.publication.mensajeria;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.marketroad.publication.dto.ConversacionDetalleDTO;
import com.marketroad.publication.dto.ConversacionResumenDTO;
import com.marketroad.publication.dto.MensajeDTO;
import com.marketroad.publication.exception.ConversacionNoEncontradaException;
import com.marketroad.publication.exception.OperacionNoPermitidaException;
import com.marketroad.publication.exception.PublicacionNoEncontradaException;
import com.marketroad.publication.mensajeria.ReglasMensajeria.Rol;
import com.marketroad.publication.model.Conversacion;
import com.marketroad.publication.model.EstadoOferta;
import com.marketroad.publication.model.EstadoPublicacion;
import com.marketroad.publication.model.EstadoVenta;
import com.marketroad.publication.model.MensajeConversacion;
import com.marketroad.publication.model.Publicacion;
import com.marketroad.publication.model.TipoMensaje;
import com.marketroad.publication.repository.ConversacionRepository;
import com.marketroad.publication.repository.MensajeConversacionRepository;
import com.marketroad.publication.repository.PublicacionRepository;
import com.marketroad.publication.security.Identidad;

@Service
public class ConversacionService {
    @Autowired
    private ConversacionRepository conversaciones;
    @Autowired
    private MensajeConversacionRepository mensajes;
    @Autowired
    private PublicacionRepository publicaciones;
    @Autowired
    private LimitadorMensajes limitador;
    @Autowired
    private ReglasMensajeria reglas;

    // ------------------------------------------------------------------ consultas

    @Transactional(readOnly = true)
    public List<ConversacionResumenDTO> listar(Identidad yo, Long publicacionId) {
        List<Conversacion> lista = conversaciones.findDelUsuario(yo.usuarioId());
        if (publicacionId != null) {
            lista = lista.stream().filter(c -> c.getPublicacion().getId().equals(publicacionId)).toList();
        }
        Map<Long, Long> noLeidos = new HashMap<>();
        if (!lista.isEmpty()) {
            List<Long> ids = lista.stream().map(Conversacion::getId).toList();
            for (Object[] fila : mensajes.contarNoLeidosPorConversacion(ids, yo.usuarioId())) {
                noLeidos.put(((Number) fila[0]).longValue(), ((Number) fila[1]).longValue());
            }
        }
        return lista.stream()
                .map(c -> resumen(c, yo, noLeidos.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public long contarNoLeidos(Identidad yo) {
        return mensajes.contarNoLeidos(yo.usuarioId());
    }

    /**
     * Devuelve la conversación completa y marca como leídos los mensajes de la otra
     * persona.
     */
    @Transactional
    public ConversacionDetalleDTO obtener(Long id, Identidad yo) {
        Conversacion c = cargar(id, yo);
        for (MensajeConversacion m : mensajes.findByConversacionIdAndRemitenteIdNotAndLeidoFalse(c.getId(),
                yo.usuarioId())) {
            m.setLeido(true);
        }
        return detalle(c, yo);
    }

    // ------------------------------------------------------------------ acciones

    /**
     * El comprador escribe por primera vez (o de nuevo) al vendedor de una
     * publicación.
     */
    @Transactional
    public ConversacionDetalleDTO iniciar(Long publicacionId, String contenido, Identidad yo) {
        if (publicacionId == null || publicacionId <= 0) {
            throw new IllegalArgumentException("La publicación indicada no es válida");
        }
        limitador.registrar(yo.usuarioId());
        Publicacion p = publicaciones.findById(publicacionId)
                .orElseThrow(() -> new PublicacionNoEncontradaException(
                        "No se encontró la publicación con id " + publicacionId));
        if (p.getEstado() != EstadoPublicacion.ACTIVA) {
            throw new OperacionNoPermitidaException("La publicación ya no está disponible");
        }
        if (p.getUsuarioId().equals(yo.usuarioId())) {
            throw new IllegalArgumentException("No puedes iniciar una conversación en tu propia publicación");
        }
        String texto = reglas.normalizarContenido(contenido);

        Conversacion c = conversaciones.findByPublicacionIdAndCompradorId(p.getId(), yo.usuarioId()).orElse(null);
        if (c == null) {
            c = new Conversacion();
            c.setPublicacion(p);
            c.setCompradorId(yo.usuarioId());
            c.setVendedorId(p.getUsuarioId());
            c.setCompradorApodo(limpiarApodo(yo.apodo()));
            c.setVendedorApodo(limpiarApodo(p.getVendedorApodo()));
            c = conversaciones.save(c);
        } else {
            sincronizarApodo(c, yo);
        }
        agregarMensaje(c, yo.usuarioId(), TipoMensaje.TEXTO, texto, null, null);
        return detalle(c, yo);
    }

    @Transactional
    public ConversacionDetalleDTO enviarTexto(Long id, String contenido, Identidad yo) {
        limitador.registrar(yo.usuarioId());
        Conversacion c = cargar(id, yo);
        if (c.getPublicacion().getEstado() == EstadoPublicacion.ELIMINADA) {
            throw new OperacionNoPermitidaException("La publicación fue eliminada");
        }
        if (c.getPublicacion().getEstado() == EstadoPublicacion.DESHABILITADA) {
            throw new OperacionNoPermitidaException("La publicación fue deshabilitada por la administración");
        }
        String texto = reglas.normalizarContenido(contenido);
        agregarMensaje(c, yo.usuarioId(), TipoMensaje.TEXTO, texto, null, null);
        return detalle(c, yo);
    }

    @Transactional
    public ConversacionDetalleDTO ofertar(Long id, BigDecimal monto, Identidad yo) {
        limitador.registrar(yo.usuarioId());
        Conversacion c = cargar(id, yo);
        exigirRol(c, yo, Rol.COMPRADOR, "Solo el comprador puede hacer ofertas");
        exigirPublicacionActiva(c);
        BigDecimal oferta = reglas.validarMonto(monto);

        // Una oferta nueva reemplaza a la pendiente (y a una aceptada anterior: se
        // renegoció).
        for (MensajeConversacion previa : mensajes.findByConversacionIdAndTipoAndEstadoOfertaIn(
                c.getId(), TipoMensaje.OFERTA, List.of(EstadoOferta.PENDIENTE, EstadoOferta.ACEPTADA))) {
            previa.setEstadoOferta(EstadoOferta.REEMPLAZADA);
        }
        c.setMontoAcordado(null);
        agregarMensaje(c, yo.usuarioId(), TipoMensaje.OFERTA,
                "Ofertó " + reglas.formatearMonto(oferta), oferta, EstadoOferta.PENDIENTE);
        return detalle(c, yo);
    }

    @Transactional
    public ConversacionDetalleDTO responderOferta(Long id, Long mensajeId, boolean aceptar, Identidad yo) {
        Conversacion c = cargar(id, yo);
        exigirRol(c, yo, Rol.VENDEDOR, "Solo el vendedor puede responder las ofertas");
        exigirPublicacionActiva(c);

        MensajeConversacion oferta = mensajes.findById(mensajeId)
                .orElseThrow(() -> new ConversacionNoEncontradaException("No se encontró la oferta"));
        if (!oferta.getConversacion().getId().equals(c.getId()) || oferta.getTipo() != TipoMensaje.OFERTA) {
            throw new ConversacionNoEncontradaException("No se encontró la oferta");
        }
        if (oferta.getEstadoOferta() != EstadoOferta.PENDIENTE) {
            throw new OperacionNoPermitidaException("Esta oferta ya fue respondida o reemplazada");
        }

        String monto = reglas.formatearMonto(oferta.getMonto());
        if (aceptar) {
            oferta.setEstadoOferta(EstadoOferta.ACEPTADA);
            c.setMontoAcordado(oferta.getMonto());
            agregarMensaje(c, yo.usuarioId(), TipoMensaje.SISTEMA,
                    "Aceptó la oferta de " + monto + ". Coordinen la entrega por este chat.", null, null);
        } else {
            oferta.setEstadoOferta(EstadoOferta.RECHAZADA);
            agregarMensaje(c, yo.usuarioId(), TipoMensaje.SISTEMA, "Rechazó la oferta de " + monto + ".", null, null);
        }
        return detalle(c, yo);
    }

    /**
     * El vendedor cierra la venta con el comprador de esta conversación. El precio
     * de venta es el de la oferta
     * aceptada, o el precio publicado si no hubo oferta. Las demás conversaciones
     * de la publicación quedan
     * avisadas y con sus ofertas pendientes rechazadas.
     */
    @Transactional
    public ConversacionDetalleDTO marcarVendida(Long id, Identidad yo) {
        Conversacion c = cargar(id, yo);
        exigirRol(c, yo, Rol.VENDEDOR, "Solo el vendedor puede marcar la publicación como vendida");
        exigirPublicacionActiva(c);

        Publicacion p = c.getPublicacion();
        BigDecimal precioFinal = c.getMontoAcordado() != null ? c.getMontoAcordado() : p.getPrecio();
        p.setEstado(EstadoPublicacion.VENDIDA);
        p.setCompradorId(c.getCompradorId());
        p.setPrecioVenta(precioFinal);
        p.setFechaVenta(OffsetDateTime.now());
        p.setVentaEstado(EstadoVenta.PENDIENTE_CONFIRMACION);
        p.setVentaDetalle(null);
        publicaciones.save(p);

        agregarMensaje(c, yo.usuarioId(), TipoMensaje.SISTEMA,
                "Marcó la publicación como vendida por " + reglas.formatearMonto(precioFinal)
                        + ". Falta que la otra persona confirme la compra.", null, null);

        for (Conversacion otra : conversaciones.findByPublicacionId(p.getId())) {
            if (otra.getId().equals(c.getId())) {
                continue;
            }
            for (MensajeConversacion pendiente : mensajes.findByConversacionIdAndTipoAndEstadoOfertaIn(
                    otra.getId(), TipoMensaje.OFERTA, List.of(EstadoOferta.PENDIENTE))) {
                pendiente.setEstadoOferta(EstadoOferta.RECHAZADA);
            }
            agregarMensaje(otra, yo.usuarioId(), TipoMensaje.SISTEMA, "La publicación fue vendida a otra persona.",
                    null, null);
        }
        return detalle(c, yo);
    }

    /**
     * La persona señalada como compradora responde a la venta: COMPRADO la confirma; NO_COMPRADO la anula y la
     * publicación vuelve a estar activa; OTRO exige describir lo ocurrido y deja la venta en revisión de soporte.
     */
    @Transactional
    public ConversacionDetalleDTO responderVenta(Long id, String respuesta, String detalle, Identidad yo) {
        Conversacion c = cargar(id, yo);
        exigirRol(c, yo, Rol.COMPRADOR, "Solo la persona señalada como compradora puede responder");
        Publicacion p = c.getPublicacion();
        if (p.getEstado() != EstadoPublicacion.VENDIDA || p.getVentaEstado() != EstadoVenta.PENDIENTE_CONFIRMACION
                || !yo.usuarioId().equals(p.getCompradorId())) {
            throw new OperacionNoPermitidaException("No hay una venta pendiente de tu confirmación");
        }
        String opcion = respuesta == null ? "" : respuesta.trim().toUpperCase();
        switch (opcion) {
            case "COMPRADO" -> {
                p.setVentaEstado(EstadoVenta.CONFIRMADA);
                agregarMensaje(c, yo.usuarioId(), TipoMensaje.SISTEMA, "Confirmó que compró el artículo.", null, null);
            }
            case "NO_COMPRADO" -> {
                p.setEstado(EstadoPublicacion.ACTIVA);
                p.setVentaEstado(null);
                p.setVentaDetalle(null);
                p.setCompradorId(null);
                p.setPrecioVenta(null);
                p.setFechaVenta(null);
                agregarMensaje(c, yo.usuarioId(), TipoMensaje.SISTEMA,
                        "Indicó que no compró el artículo. La venta se anuló y la publicación volvió a estar activa.",
                        null, null);
            }
            case "OTRO" -> {
                String texto = detalle == null ? "" : detalle.trim();
                if (texto.length() < 10) {
                    throw new IllegalArgumentException("Describe lo que sucedió (mínimo 10 caracteres)");
                }
                p.setVentaEstado(EstadoVenta.EN_REVISION);
                p.setVentaDetalle(texto.length() > 1000 ? texto.substring(0, 1000) : texto);
                agregarMensaje(c, yo.usuarioId(), TipoMensaje.SISTEMA,
                        "Informó otra situación sobre la venta. Soporte la revisará.", null, null);
            }
            default -> throw new IllegalArgumentException("La respuesta debe ser COMPRADO, NO_COMPRADO u OTRO");
        }
        publicaciones.save(p);
        return detalle(c, yo);
    }

    // ------------------------------------------------------------------ helpers

    private Conversacion cargar(Long id, Identidad yo) {
        Conversacion c = conversaciones.findConPublicacion(id)
                .orElseThrow(() -> new ConversacionNoEncontradaException("No se encontró la conversación"));
        if (reglas.rolDe(yo.usuarioId(), c.getCompradorId(), c.getVendedorId()) == null) {
            throw new ConversacionNoEncontradaException("No se encontró la conversación");
        }
        sincronizarApodo(c, yo);
        return c;
    }

    private void exigirRol(Conversacion c, Identidad yo, Rol requerido, String mensajeError) {
        if (reglas.rolDe(yo.usuarioId(), c.getCompradorId(), c.getVendedorId()) != requerido) {
            throw new OperacionNoPermitidaException(mensajeError);
        }
    }

    private void exigirPublicacionActiva(Conversacion c) {
        if (c.getPublicacion().getEstado() != EstadoPublicacion.ACTIVA) {
            throw new OperacionNoPermitidaException("La publicación ya no está disponible");
        }
    }

    private MensajeConversacion agregarMensaje(Conversacion c, Long remitenteId, TipoMensaje tipo, String contenido,
            BigDecimal monto, EstadoOferta estadoOferta) {
        MensajeConversacion m = new MensajeConversacion();
        m.setConversacion(c);
        m.setRemitenteId(remitenteId);
        m.setTipo(tipo);
        m.setContenido(contenido);
        m.setMonto(monto);
        m.setEstadoOferta(estadoOferta);
        MensajeConversacion guardado = mensajes.save(m);
        c.setUltimoMensaje(reglas.vistaPrevia(contenido));
        c.setUltimaActividad(guardado.getFechaEnvio());
        conversaciones.save(c);
        return guardado;
    }

    /**
     * Mantiene actualizado el apodo de quien está usando la conversación (viene en
     * su JWT).
     */
    private void sincronizarApodo(Conversacion c, Identidad yo) {
        String apodo = limpiarApodo(yo.apodo());
        if (apodo == null) {
            return;
        }
        if (yo.usuarioId().equals(c.getCompradorId())) {
            if (!apodo.equals(c.getCompradorApodo())) {
                c.setCompradorApodo(apodo);
            }
        } else if (yo.usuarioId().equals(c.getVendedorId()) && !apodo.equals(c.getVendedorApodo())) {
            c.setVendedorApodo(apodo);
        }
    }

    private String limpiarApodo(String apodo) {
        if (apodo == null || apodo.isBlank()) {
            return null;
        }
        String limpio = apodo.trim();
        return limpio.length() > 40 ? limpio.substring(0, 40) : limpio;
    }

    private ConversacionDetalleDTO detalle(Conversacion c, Identidad yo) {
        List<MensajeDTO> lista = mensajes.findByConversacionIdOrderByIdAsc(c.getId()).stream()
                .map(this::aDTO)
                .toList();
        long noLeidos = mensajes.countByConversacionIdAndRemitenteIdNotAndLeidoFalse(c.getId(), yo.usuarioId());
        return new ConversacionDetalleDTO(resumen(c, yo, noLeidos), lista);
    }

    private ConversacionResumenDTO resumen(Conversacion c, Identidad yo, long noLeidos) {
        Publicacion p = c.getPublicacion();
        Rol rol = reglas.rolDe(yo.usuarioId(), c.getCompradorId(), c.getVendedorId());
        boolean soyComprador = rol == Rol.COMPRADOR;
        Long otroId = soyComprador ? c.getVendedorId() : c.getCompradorId();
        String otroApodo = soyComprador ? c.getVendedorApodo() : c.getCompradorApodo();
        // El seguimiento de la venta solo se muestra en la conversación con la persona elegida como compradora.
        boolean esLaVenta = p.getVentaEstado() != null && c.getCompradorId().equals(p.getCompradorId());
        return new ConversacionResumenDTO(
                c.getId(), p.getId(), p.getTitulo(), p.getPrecio(), p.getEstado().name(),
                "/api/v1/publicaciones/" + p.getId() + "/imagenes/0",
                rol.name(), otroId, reglas.apodoODefecto(otroApodo, otroId),
                c.getMontoAcordado(), c.getUltimoMensaje(), c.getUltimaActividad(), noLeidos,
                esLaVenta ? p.getVentaEstado().name() : null, esLaVenta ? p.getVentaDetalle() : null);
    }

    private MensajeDTO aDTO(MensajeConversacion m) {
        return new MensajeDTO(m.getId(), m.getRemitenteId(), m.getTipo().name(), m.getContenido(), m.getMonto(),
                m.getEstadoOferta() == null ? null : m.getEstadoOferta().name(), m.isLeido(), m.getFechaEnvio());
    }
}
