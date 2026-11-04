package com.marketroad.publication.model;

import java.time.OffsetDateTime;

import jakarta.persistence.*;

@Entity
@Table(name = "tickets_soporte", indexes = {
                @Index(name = "idx_ticket_usuario", columnList = "usuario_id"),
                @Index(name = "idx_ticket_estado", columnList = "estado")
})
public class TicketSoporte {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @Column(name = "usuario_id", nullable = false)
        private Long usuarioId;

        @Column(name = "usuario_apodo", length = 40)
        private String usuarioApodo;

        @Enumerated(EnumType.STRING)
        @Column(nullable = false, length = 20)
        private CategoriaSoporte categoria;

        @Column(nullable = false, length = 100)
        private String asunto;

        @Column(nullable = false, length = 1000)
        private String descripcion;

        @Enumerated(EnumType.STRING)
        @Column(nullable = false, length = 20)
        private EstadoTicket estado = EstadoTicket.ABIERTO;

        /** Respuesta del equipo de soporte (null mientras no haya una). */
        @Column(length = 1000)
        private String respuesta;

        @Column(name = "fecha_respuesta")
        private OffsetDateTime fechaRespuesta;

        @Column(name = "fecha_creacion", nullable = false)
        private OffsetDateTime fechaCreacion = OffsetDateTime.now();

        public Long getId() {
                return id;
        }

        public Long getUsuarioId() {
                return usuarioId;
        }

        public void setUsuarioId(Long usuarioId) {
                this.usuarioId = usuarioId;
        }

        public String getUsuarioApodo() {
                return usuarioApodo;
        }

        public void setUsuarioApodo(String usuarioApodo) {
                this.usuarioApodo = usuarioApodo;
        }

        public CategoriaSoporte getCategoria() {
                return categoria;
        }

        public void setCategoria(CategoriaSoporte categoria) {
                this.categoria = categoria;
        }

        public String getAsunto() {
                return asunto;
        }

        public void setAsunto(String asunto) {
                this.asunto = asunto;
        }

        public String getDescripcion() {
                return descripcion;
        }

        public void setDescripcion(String descripcion) {
                this.descripcion = descripcion;
        }

        public EstadoTicket getEstado() {
                return estado;
        }

        public void setEstado(EstadoTicket estado) {
                this.estado = estado;
        }

        public String getRespuesta() {
                return respuesta;
        }

        public void setRespuesta(String respuesta) {
                this.respuesta = respuesta;
        }

        public OffsetDateTime getFechaRespuesta() {
                return fechaRespuesta;
        }

        public void setFechaRespuesta(OffsetDateTime fechaRespuesta) {
                this.fechaRespuesta = fechaRespuesta;
        }

        public OffsetDateTime getFechaCreacion() {
                return fechaCreacion;
        }
}
