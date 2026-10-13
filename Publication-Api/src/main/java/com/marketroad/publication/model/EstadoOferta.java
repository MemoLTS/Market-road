package com.marketroad.publication.model;

public enum EstadoOferta {
    PENDIENTE,
    ACEPTADA,
    RECHAZADA,
    /** El comprador hizo una oferta nueva que reemplaza a esta. */
    REEMPLAZADA
}
