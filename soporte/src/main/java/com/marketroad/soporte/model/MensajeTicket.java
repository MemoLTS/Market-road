package com.marketroad.soporte.model;

import java.time.OffsetDateTime;

import jakarta.persistence.*;

/** Mensaje del chat de un ticket (de la persona usuaria, del personal de soporte o avisos del sistema). */
@Entity
@Table(name = "mensajes_ticket", indexes = {
        @Index(name = "idx_mensaje_ticket", columnList = "ticket_id,id")
})
public class MensajeTicket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @Enumerated(EnumType.STRING)
    @Column(name = "autor_tipo", nullable = false, length = 20)
    private AutorTipo autorTipo;

    /** Id del usuario (User-Api) o del integrante de soporte; null en mensajes del sistema. */
    @Column(name = "autor_id")
    private Long autorId;

    @Column(name = "autor_nombre", nullable = false, length = 80)
    private String autorNombre;

    @Column(nullable = false, length = 1000)
    private String contenido;

    /** Leído por la otra parte: los del usuario los lee el personal y los del personal los lee el usuario. */
    @Column(nullable = false)
    private boolean leido = false;

    @Column(nullable = false)
    private OffsetDateTime fecha = OffsetDateTime.now();

    public Long getId() { return id; }
    public Ticket getTicket() { return ticket; }
    public void setTicket(Ticket ticket) { this.ticket = ticket; }
    public AutorTipo getAutorTipo() { return autorTipo; }
    public void setAutorTipo(AutorTipo autorTipo) { this.autorTipo = autorTipo; }
    public Long getAutorId() { return autorId; }
    public void setAutorId(Long autorId) { this.autorId = autorId; }
    public String getAutorNombre() { return autorNombre; }
    public void setAutorNombre(String autorNombre) { this.autorNombre = autorNombre; }
    public String getContenido() { return contenido; }
    public void setContenido(String contenido) { this.contenido = contenido; }
    public boolean isLeido() { return leido; }
    public void setLeido(boolean leido) { this.leido = leido; }
    public OffsetDateTime getFecha() { return fecha; }
}
