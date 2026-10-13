package com.caso3.inventario.model;

import jakarta.persistence.*;
import lombok.*;
import jakarta.validation.constraints.*;

@Data
@NoArgsConstructor
@Entity
@Table(name = "productos")
public class Producto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre del producto no puede estar vacío")
    @Size(min = 3, max = 100, message = "El nombre debe tener entre 3 y 100 caracteres")
    @Column(nullable = false)
    private String nombre;

    @NotNull(message = "El precio no puede ser nulo")
    @Min(value = 0, message = "El precio debe ser mayor o igual a 0")
    @Column(nullable = false)
    private Double precio;

    @Min(value = 0, message = "El stock no puede ser negativo")
    @Column(nullable = false)
    private int stock;
    
    @ManyToOne
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    @Column(nullable = false)
    private boolean activo = true;

    @Min(value = 0, message = "El descuento no puede ser negativo")
    @Max(value = 100, message = "El descuento no puede ser mayor a 100")
    @Column(nullable = false)
    private double descuentoPorcentaje = 0.0;

    public Producto(Long id, String nombre, Double precio, int stock, Categoria categoria) {
        this.id = id;
        this.nombre = nombre;
        this.precio = precio;
        this.stock = stock;
        this.categoria = categoria;
    }

    public Producto(Long id, String nombre, Double precio, int stock, Categoria categoria, boolean activo, double descuentoPorcentaje) {
        this.id = id;
        this.nombre = nombre;
        this.precio = precio;
        this.stock = stock;
        this.categoria = categoria;
        this.activo = activo;
        this.descuentoPorcentaje = descuentoPorcentaje;
    }

    @Transient
    public Double getPrecioFinal() {
        if (precio == null) {
            return null;
        }
        return precio - (precio * (descuentoPorcentaje / 100.0));
    }
}

