package com.marketroad.publication.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import jakarta.persistence.*;

/**
 * Conversación entre un comprador y el vendedor de una publicación.
 * Hay como máximo una por (publicación, comprador).
 */
@Entity
@Table(name = "conversaciones",
        uniqueConstraints = @UniqueConstraint(name = "uk_conversacion_publicacion_comprador",
                columnNames = {"publicacion_id", "comprador_id"}),
        indexes = {
                @Index(name = "idx_conversacion_comprador", columnList = "comprador_id"),
                @Index(name = "idx_conversacion_vendedor", columnList = "vendedor_id")
        })
public class Conversacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "publicacion_id", nullable = false)
    private Publicacion publicacion;

    @Column(name = "comprador_id", nullable = false)
    private Long compradorId;

    @Column(name = "vendedor_id", nullable = false)
    private Long vendedorId;

    @Column(name = "comprador_apodo", length = 40)
    private String compradorApodo;

    @Column(name = "vendedor_apodo", length = 40)
    private String vendedorApodo;

    /** Monto de la última oferta aceptada por el vendedor (null si no hay). */
    @Column(name = "monto_acordado", precision = 12, scale = 2)
    private BigDecimal montoAcordado;

    @Column(name = "ultimo_mensaje", length = 200)
    private String ultimoMensaje;

    @Column(name = "ultima_actividad", nullable = false)
    private OffsetDateTime ultimaActividad = OffsetDateTime.now();

    @Column(name = "fecha_creacion", nullable = false)
    private OffsetDateTime fechaCreacion = OffsetDateTime.now();

    public Long getId() { return id; }
    public Publicacion getPublicacion() { return publicacion; }
    public void setPublicacion(Publicacion publicacion) { this.publicacion = publicacion; }
    public Long getCompradorId() { return compradorId; }
    public void setCompradorId(Long compradorId) { this.compradorId = compradorId; }
    public Long getVendedorId() { return vendedorId; }
    public void setVendedorId(Long vendedorId) { this.vendedorId = vendedorId; }
    public String getCompradorApodo() { return compradorApodo; }
    public void setCompradorApodo(String compradorApodo) { this.compradorApodo = compradorApodo; }
    public String getVendedorApodo() { return vendedorApodo; }
    public void setVendedorApodo(String vendedorApodo) { this.vendedorApodo = vendedorApodo; }
    public BigDecimal getMontoAcordado() { return montoAcordado; }
    public void setMontoAcordado(BigDecimal montoAcordado) { this.montoAcordado = montoAcordado; }
    public String getUltimoMensaje() { return ultimoMensaje; }
    public void setUltimoMensaje(String ultimoMensaje) { this.ultimoMensaje = ultimoMensaje; }
    public OffsetDateTime getUltimaActividad() { return ultimaActividad; }
    public void setUltimaActividad(OffsetDateTime ultimaActividad) { this.ultimaActividad = ultimaActividad; }
    public OffsetDateTime getFechaCreacion() { return fechaCreacion; }
}
