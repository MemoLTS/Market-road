package com.caso3.inventario.dto;

public class StockResponse {

    private Long idProducto;
    private String nombre;
    private Integer stock;
    private Boolean disponible;
    private Boolean alertaBajoStock;
    public Boolean getAlertaBajoStock() {
        return alertaBajoStock;
    }

    public void setAlertaBajoStock(Boolean alertaBajoStock) {
        this.alertaBajoStock = alertaBajoStock;
    }

    public StockResponse() {
    }

    public StockResponse(Long idProducto, String nombre, Integer stock) {
        this.idProducto = idProducto;
        this.nombre = nombre;
        this.stock = stock;
    }
    public StockResponse(Long idProducto, String nombre,
                        Integer stock, Boolean disponible,
                        Boolean alertaBajoStock) {
        this.idProducto = idProducto;
        this.nombre = nombre;
        this.stock = stock;
        this.disponible = disponible;
        this.alertaBajoStock = alertaBajoStock;
    }
    public StockResponse(Long idProducto, String nombre,
                        Integer stock, Boolean disponible) {
        this.idProducto = idProducto;
        this.nombre = nombre;
        this.stock = stock;
        this.disponible = disponible;
    }

    public Long getIdProducto() {
        return idProducto;
    }

    public void setIdProducto(Long idProducto) {
        this.idProducto = idProducto;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public Boolean getDisponible() {
        return disponible;
    }

    public void setDisponible(Boolean disponible) {
        this.disponible = disponible;
    }
}