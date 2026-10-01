package com.marketroad.publication.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import jakarta.persistence.*;

@Entity
@Table(name = "mensajes_conversacion", indexes = {
        @Index(name = "idx_mensaje_conversacion", columnList = "conversacion_id,id")
})
public class MensajeConversacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversacion_id", nullable = false)
    private Conversacion conversacion;

    @Column(name = "remitente_id", nullable = false)
    private Long remitenteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoMensaje tipo = TipoMensaje.TEXTO;

    @Column(nullable = false, length = 1000)
    private String contenido;

    /** Solo para mensajes de tipo OFERTA. */
    @Column(precision = 12, scale = 2)
    private BigDecimal monto;

    /** Solo para mensajes de tipo OFERTA. */
    @Enumerated(EnumType.STRING)
    @Column(name = "estado_oferta", length = 20)
    private EstadoOferta estadoOferta;

    @Column(nullable = false)
    private boolean leido = false;

    @Column(name = "fecha_envio", nullable = false)
    private OffsetDateTime fechaEnvio = OffsetDateTime.now();

    public Long getId() { return id; }
    public Conversacion getConversacion() { return conversacion; }
    public void setConversacion(Conversacion conversacion) { this.conversacion = conversacion; }
    public Long getRemitenteId() { return remitenteId; }
    public void setRemitenteId(Long remitenteId) { this.remitenteId = remitenteId; }
    public TipoMensaje getTipo() { return tipo; }
    public void setTipo(TipoMensaje tipo) { this.tipo = tipo; }
    public String getContenido() { return contenido; }
    public void setContenido(String contenido) { this.contenido = contenido; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public EstadoOferta getEstadoOferta() { return estadoOferta; }
    public void setEstadoOferta(EstadoOferta estadoOferta) { this.estadoOferta = estadoOferta; }
    public boolean isLeido() { return leido; }
    public void setLeido(boolean leido) { this.leido = leido; }
    public OffsetDateTime getFechaEnvio() { return fechaEnvio; }
}
