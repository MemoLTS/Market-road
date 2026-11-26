package com.marketroad.publication.model;

/** Seguimiento de una venta marcada por el vendedor: la contraparte debe confirmarla. */
public enum EstadoVenta {
    /** El vendedor eligió al comprador y falta que este responda. */
    PENDIENTE_CONFIRMACION,
    /** El comprador confirmó que sí compró. */
    CONFIRMADA,
    /** El comprador indicó otra situación o un error: la revisa soporte. */
    EN_REVISION
}
