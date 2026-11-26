package com.marketroad.publication.model;

public enum EstadoPublicacion {
    ACTIVA,
    VENDIDA,
    /** Retirada del catálogo por el superusuario; se puede volver a habilitar. */
    DESHABILITADA,
    /** La persona dueña la ocultó del catálogo; puede volver a mostrarla. */
    OCULTA,
    ELIMINADA
}
