package com.marketroad.publication.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import jakarta.persistence.*;

@Entity
@Table(name = "publicaciones")
public class Publicacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String titulo;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal precio;

    @Column(nullable = false, length = 1000, columnDefinition = "varchar(1000) default 'Sin descripción'")
    private String descripcion;

    @Column(nullable = false, length = 120, columnDefinition = "varchar(120) default 'Sin ubicación'")
    private String ubicacion;

    /** Código de la categoría. El default permite agregar la columna a una tabla que ya tiene filas. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30, columnDefinition = "varchar(30) not null default 'OTROS'")
    private CategoriaPublicacion categoria = CategoriaPublicacion.OTROS;

    @ElementCollection
    @CollectionTable(name = "publicacion_modalidades_entrega",
            joinColumns = @JoinColumn(name = "publicacion_id"))
    @Column(name = "modalidad", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private Set<ModalidadEntrega> modalidadesEntrega = EnumSet.noneOf(ModalidadEntrega.class);

    /** Coordenadas opcionales del producto; sin ellas la publicación no participa en filtros ni orden por distancia. */
    private Double latitud;

    private Double longitud;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "vendedor_apodo", length = 40)
    private String vendedorApodo;

    /** Se completan al cerrar la venta. */
    @Column(name = "comprador_id")
    private Long compradorId;

    @Column(name = "precio_venta", precision = 12, scale = 2)
    private BigDecimal precioVenta;

    @Column(name = "fecha_venta")
    private OffsetDateTime fechaVenta;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoPublicacion estado = EstadoPublicacion.ACTIVA;

    @Column(nullable = false)
    private OffsetDateTime fechaCreacion = OffsetDateTime.now();

    @OneToMany(mappedBy = "publicacion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("posicion ASC")
    private List<ImagenPublicacion> imagenes = new ArrayList<>();

    public Long getId() { return id; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public String getUbicacion() { return ubicacion; }
    public void setUbicacion(String ubicacion) { this.ubicacion = ubicacion; }
    public CategoriaPublicacion getCategoria() { return categoria; }
    public void setCategoria(CategoriaPublicacion categoria) { this.categoria = categoria; }
    public Set<ModalidadEntrega> getModalidadesEntrega() { return modalidadesEntrega; }
    public void setModalidadesEntrega(Set<ModalidadEntrega> modalidadesEntrega) {
        this.modalidadesEntrega = modalidadesEntrega == null || modalidadesEntrega.isEmpty()
                ? EnumSet.noneOf(ModalidadEntrega.class)
                : EnumSet.copyOf(modalidadesEntrega);
    }
    public Double getLatitud() { return latitud; }
    public void setLatitud(Double latitud) { this.latitud = latitud; }
    public Double getLongitud() { return longitud; }
    public void setLongitud(Double longitud) { this.longitud = longitud; }
    public String getVendedorApodo() { return vendedorApodo; }
    public void setVendedorApodo(String vendedorApodo) { this.vendedorApodo = vendedorApodo; }
    public Long getCompradorId() { return compradorId; }
    public void setCompradorId(Long compradorId) { this.compradorId = compradorId; }
    public BigDecimal getPrecioVenta() { return precioVenta; }
    public void setPrecioVenta(BigDecimal precioVenta) { this.precioVenta = precioVenta; }
    public OffsetDateTime getFechaVenta() { return fechaVenta; }
    public void setFechaVenta(OffsetDateTime fechaVenta) { this.fechaVenta = fechaVenta; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public EstadoPublicacion getEstado() { return estado; }
    public void setEstado(EstadoPublicacion estado) { this.estado = estado; }
    public OffsetDateTime getFechaCreacion() { return fechaCreacion; }
    public List<ImagenPublicacion> getImagenes() { return imagenes; }
    public void agregarImagen(ImagenPublicacion imagen) {
        imagen.setPublicacion(this);
        imagenes.add(imagen);
    }
}
