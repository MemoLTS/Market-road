package com.marketroad.publication.dto;

import java.time.OffsetDateTime;

/**
 * Resumen del panel de administración (GET /admin/publicaciones/resumen).
 *
 * @param dias            tamaño de la ventana de tiempo analizada
 * @param desde           inicio de la ventana (ahora - dias)
 * @param nuevas          publicaciones creadas dentro de la ventana (sin contar las eliminadas)
 * @param cerradasVentas  publicaciones cuya venta se cerró dentro de la ventana
 * @param activas         publicaciones activas hoy
 * @param totalVendidas   publicaciones vendidas en total
 */
public record ResumenPublicacionesDTO(
                int dias,
                OffsetDateTime desde,
                long nuevas,
                long cerradasVentas,
                long activas,
                long totalVendidas) {
}
