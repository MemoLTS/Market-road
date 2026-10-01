package com.marketroad.publication.mensajeria;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
import com.marketroad.publication.model.MensajeConversacion;
import com.marketroad.publication.model.Publicacion;
import com.marketroad.publication.model.TipoMensaje;
import com.marketroad.publication.repository.ConversacionRepository;
import com.marketroad.publication.repository.MensajeConversacionRepository;
import com.marketroad.publication.repository.PublicacionRepository;
import com.marketroad.publication.security.Identidad;

/**
 * Mensajería comprador-vendedor alrededor de una publicación: chat, ofertas de precio,
 * aceptación/rechazo por parte del vendedor y cierre de la venta.
 *
 * Reglas principales:
 *  - Solo el comprador inicia la conversación (no se puede escribir en la propia publicación).
 *  - Solo el comprador hace ofertas; solo el vendedor las acepta/rechaza y marca la venta.
 *  - Ofertas, respuestas y venta requieren la publicación ACTIVA; el chat de texto sigue disponible
 *    después de la venta (para coordinar la entrega) salvo que la publicación se elimine.
 *  - Quien no participa de una conversación recibe 404 (no se revela que existe).
 */
@Service
public class ConversacionService {
    private final ConversacionRepository conversaciones;
    private final MensajeConversacionRepository mensajes;
    private final PublicacionRepository publicaciones;
    private final LimitadorMensajes limitador;

    public ConversacionService(ConversacionRepository conversaciones,
                               MensajeConversacionRepository mensajes,
                               PublicacionRepository publicaciones,
                               LimitadorMensajes limitador) {
        this.limitador = limitador;
        this.conversaciones = conversaciones;
        this.mensajes = mensajes;
        this.publicaciones = publicaciones;
    }

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

    /** Devuelve la conversación completa y marca como leídos los mensajes de la otra persona. */
    @Transactional
    public ConversacionDetalleDTO obtener(Long id, Identidad yo) {
        Conversacion c = cargar(id, yo);
        for (MensajeConversacion m : mensajes.findByConversacionIdAndRemitenteIdNotAndLeidoFalse(c.getId(), yo.usuarioId())) {
            m.setLeido(true);
        }
        return detalle(c, yo);
    }

    // ------------------------------------------------------------------ acciones

    /** El comprador escribe por primera vez (o de nuevo) al vendedor de una publicación. */
    @Transactional
    public ConversacionDetalleDTO iniciar(Long publicacionId, String contenido, Identidad yo) {
        if (publicacionId == null || publicacionId <= 0) {
            throw new IllegalArgumentException("La publicación indicada no es válida");
        }
        limitador.registrar(yo.usuarioId());
        Publicacion p = publicaciones.findById(publicacionId)
                .orElseThrow(() -> new PublicacionNoEncontradaException("No se encontró la publicación con id " + publicacionId));
        if (p.getEstado() != EstadoPublicacion.ACTIVA) {
            throw new OperacionNoPermitidaException("La publicación ya no está disponible");
        }
        if (p.getUsuarioId().equals(yo.usuarioId())) {
            throw new IllegalArgumentException("No puedes iniciar una conversación en tu propia publicación");
        }
        String texto = ReglasMensajeria.normalizarContenido(contenido);

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
        String texto = ReglasMensajeria.normalizarContenido(contenido);
        agregarMensaje(c, yo.usuarioId(), TipoMensaje.TEXTO, texto, null, null);
        return detalle(c, yo);
    }

    @Transactional
    public ConversacionDetalleDTO ofertar(Long id, BigDecimal monto, Identidad yo) {
        limitador.registrar(yo.usuarioId());
        Conversacion c = cargar(id, yo);
        exigirRol(c, yo, Rol.COMPRADOR, "Solo el comprador puede hacer ofertas");
        exigirPublicacionActiva(c);
        BigDecimal oferta = ReglasMensajeria.validarMonto(monto);

        // Una oferta nueva reemplaza a la pendiente (y a una aceptada anterior: se renegoció).
        for (MensajeConversacion previa : mensajes.findByConversacionIdAndTipoAndEstadoOfertaIn(
                c.getId(), TipoMensaje.OFERTA, List.of(EstadoOferta.PENDIENTE, EstadoOferta.ACEPTADA))) {
            previa.setEstadoOferta(EstadoOferta.REEMPLAZADA);
        }
        c.setMontoAcordado(null);
        agregarMensaje(c, yo.usuarioId(), TipoMensaje.OFERTA,
                "Ofertó " + ReglasMensajeria.formatearMonto(oferta), oferta, EstadoOferta.PENDIENTE);
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

        String monto = ReglasMensajeria.formatearMonto(oferta.getMonto());
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
     * El vendedor cierra la venta con el comprador de esta conversación. El precio de venta es el de la oferta
     * aceptada, o el precio publicado si no hubo oferta. Las demás conversaciones de la publicación quedan
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
        publicaciones.save(p);

        agregarMensaje(c, yo.usuarioId(), TipoMensaje.SISTEMA,
                "Marcó la publicación como vendida por " + ReglasMensajeria.formatearMonto(precioFinal) + ".", null, null);

        for (Conversacion otra : conversaciones.findByPublicacionId(p.getId())) {
            if (otra.getId().equals(c.getId())) {
                continue;
            }
            for (MensajeConversacion pendiente : mensajes.findByConversacionIdAndTipoAndEstadoOfertaIn(
                    otra.getId(), TipoMensaje.OFERTA, List.of(EstadoOferta.PENDIENTE))) {
                pendiente.setEstadoOferta(EstadoOferta.RECHAZADA);
            }
            agregarMensaje(otra, yo.usuarioId(), TipoMensaje.SISTEMA, "La publicación fue vendida a otra persona.", null, null);
        }
        return detalle(c, yo);
    }

    // ------------------------------------------------------------------ helpers

    private Conversacion cargar(Long id, Identidad yo) {
        Conversacion c = conversaciones.findConPublicacion(id)
                .orElseThrow(() -> new ConversacionNoEncontradaException("No se encontró la conversación"));
        if (ReglasMensajeria.rolDe(yo.usuarioId(), c.getCompradorId(), c.getVendedorId()) == null) {
            throw new ConversacionNoEncontradaException("No se encontró la conversación");
        }
        sincronizarApodo(c, yo);
        return c;
    }

    private void exigirRol(Conversacion c, Identidad yo, Rol requerido, String mensajeError) {
        if (ReglasMensajeria.rolDe(yo.usuarioId(), c.getCompradorId(), c.getVendedorId()) != requerido) {
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
        c.setUltimoMensaje(ReglasMensajeria.vistaPrevia(contenido));
        c.setUltimaActividad(guardado.getFechaEnvio());
        conversaciones.save(c);
        return guardado;
    }

    /** Mantiene actualizado el apodo de quien está usando la conversación (viene en su JWT). */
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

    private static String limpiarApodo(String apodo) {
        if (apodo == null || apodo.isBlank()) {
            return null;
        }
        String limpio = apodo.trim();
        return limpio.length() > 40 ? limpio.substring(0, 40) : limpio;
    }

    private ConversacionDetalleDTO detalle(Conversacion c, Identidad yo) {
        List<MensajeDTO> lista = mensajes.findByConversacionIdOrderByIdAsc(c.getId()).stream()
                .map(ConversacionService::aDTO)
                .toList();
        long noLeidos = mensajes.countByConversacionIdAndRemitenteIdNotAndLeidoFalse(c.getId(), yo.usuarioId());
        return new ConversacionDetalleDTO(resumen(c, yo, noLeidos), lista);
    }

    private ConversacionResumenDTO resumen(Conversacion c, Identidad yo, long noLeidos) {
        Publicacion p = c.getPublicacion();
        Rol rol = ReglasMensajeria.rolDe(yo.usuarioId(), c.getCompradorId(), c.getVendedorId());
        boolean soyComprador = rol == Rol.COMPRADOR;
        Long otroId = soyComprador ? c.getVendedorId() : c.getCompradorId();
        String otroApodo = soyComprador ? c.getVendedorApodo() : c.getCompradorApodo();
        return new ConversacionResumenDTO(
                c.getId(), p.getId(), p.getTitulo(), p.getPrecio(), p.getEstado().name(),
                "/api/v1/publicaciones/" + p.getId() + "/imagenes/0",
                rol.name(), otroId, ReglasMensajeria.apodoODefecto(otroApodo, otroId),
                c.getMontoAcordado(), c.getUltimoMensaje(), c.getUltimaActividad(), noLeidos);
    }

    private static MensajeDTO aDTO(MensajeConversacion m) {
        return new MensajeDTO(m.getId(), m.getRemitenteId(), m.getTipo().name(), m.getContenido(), m.getMonto(),
                m.getEstadoOferta() == null ? null : m.getEstadoOferta().name(), m.isLeido(), m.getFechaEnvio());
    }
}
