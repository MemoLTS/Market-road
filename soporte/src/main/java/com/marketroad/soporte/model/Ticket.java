package com.marketroad.soporte.model;

import java.time.OffsetDateTime;

import jakarta.persistence.*;

/**
 * Ticket de soporte abierto por un usuario de la plataforma. El usuario vive en User-Api (otra base de datos),
 * por eso aquí solo se guarda su id y una copia de su apodo y correo al momento de abrir el ticket.
 */
@Entity
@Table(name = "tickets", indexes = {
        @Index(name = "idx_ticket_usuario", columnList = "usuario_id,fecha_actualizacion"),
        @Index(name = "idx_ticket_estado", columnList = "estado,fecha_actualizacion"),
        @Index(name = "idx_ticket_asignado", columnList = "asignado_id")
})
public class Ticket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "usuario_apodo", nullable = false, length = 80)
    private String usuarioApodo;

    @Column(name = "usuario_correo", length = 254)
    private String usuarioCorreo;

    @Column(nullable = false, length = 120)
    private String asunto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CategoriaTicket categoria;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoTicket estado = EstadoTicket.ABIERTO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PrioridadTicket prioridad = PrioridadTicket.NORMAL;

    /** Id del integrante de soporte que lleva el ticket (null = sin asignar). */
    @Column(name = "asignado_id")
    private Long asignadoId;

    /** Vista previa del último mensaje de una persona (no cuenta los avisos del sistema). */
    @Column(name = "ultimo_mensaje", length = 120)
    private String ultimoMensaje;

    @Column(name = "fecha_creacion", nullable = false)
    private OffsetDateTime fechaCreacion = OffsetDateTime.now();

    @Column(name = "fecha_actualizacion", nullable = false)
    private OffsetDateTime fechaActualizacion = OffsetDateTime.now();

    @Column(name = "fecha_cierre")
    private OffsetDateTime fechaCierre;

    public Long getId() { return id; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getUsuarioApodo() { return usuarioApodo; }
    public void setUsuarioApodo(String usuarioApodo) { this.usuarioApodo = usuarioApodo; }
    public String getUsuarioCorreo() { return usuarioCorreo; }
    public void setUsuarioCorreo(String usuarioCorreo) { this.usuarioCorreo = usuarioCorreo; }
    public String getAsunto() { return asunto; }
    public void setAsunto(String asunto) { this.asunto = asunto; }
    public CategoriaTicket getCategoria() { return categoria; }
    public void setCategoria(CategoriaTicket categoria) { this.categoria = categoria; }
    public EstadoTicket getEstado() { return estado; }
    public void setEstado(EstadoTicket estado) { this.estado = estado; }
    public PrioridadTicket getPrioridad() { return prioridad; }
    public void setPrioridad(PrioridadTicket prioridad) { this.prioridad = prioridad; }
    public Long getAsignadoId() { return asignadoId; }
    public void setAsignadoId(Long asignadoId) { this.asignadoId = asignadoId; }
    public String getUltimoMensaje() { return ultimoMensaje; }
    public void setUltimoMensaje(String ultimoMensaje) { this.ultimoMensaje = ultimoMensaje; }
    public OffsetDateTime getFechaCreacion() { return fechaCreacion; }
    public OffsetDateTime getFechaActualizacion() { return fechaActualizacion; }
    public void setFechaActualizacion(OffsetDateTime fechaActualizacion) { this.fechaActualizacion = fechaActualizacion; }
    public OffsetDateTime getFechaCierre() { return fechaCierre; }
    public void setFechaCierre(OffsetDateTime fechaCierre) { this.fechaCierre = fechaCierre; }
}
