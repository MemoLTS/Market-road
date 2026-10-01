package com.marketroad.publication.catalogo;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import com.marketroad.publication.model.CategoriaPublicacion;

/**
 * Parámetros ya validados de una búsqueda en el catálogo.
 * El constructor lanza {@link IllegalArgumentException} si algo es inconsistente
 * (el manejador global lo convierte en HTTP 400).
 */
public record CatalogoConsulta(
        String texto,
        Set<CategoriaPublicacion> categorias,
        BigDecimal precioMin,
        BigDecimal precioMax,
        Double latitud,
        Double longitud,
        Double radioKm,
        OrdenCatalogo orden,
        int pagina,
        int tamano) {

    public static final int TAMANO_DEFECTO = 12;
    public static final int TAMANO_MAXIMO = 50;
    public static final int TEXTO_MAXIMO = 100;

    public CatalogoConsulta {
        texto = texto == null ? "" : texto.trim();
        if (texto.length() > TEXTO_MAXIMO) {
            throw new IllegalArgumentException("La búsqueda puede tener como máximo " + TEXTO_MAXIMO + " caracteres");
        }
        categorias = categorias == null ? Set.of() : Set.copyOf(categorias);
        orden = orden == null ? OrdenCatalogo.RELEVANCIA : orden;

        if (precioMin != null && precioMin.signum() < 0) {
            throw new IllegalArgumentException("El precio mínimo no puede ser negativo");
        }
        if (precioMax != null && precioMax.signum() < 0) {
            throw new IllegalArgumentException("El precio máximo no puede ser negativo");
        }
        if (precioMin != null && precioMax != null && precioMin.compareTo(precioMax) > 0) {
            throw new IllegalArgumentException("El precio mínimo no puede ser mayor que el máximo");
        }

        if ((latitud == null) != (longitud == null)) {
            throw new IllegalArgumentException("Debes indicar latitud y longitud juntas");
        }
        if (latitud != null && !Geo.coordenadasValidas(latitud, longitud)) {
            throw new IllegalArgumentException("Las coordenadas indicadas no son válidas");
        }
        if (radioKm != null) {
            if (latitud == null) {
                throw new IllegalArgumentException("Para filtrar por radio debes compartir tu ubicación");
            }
            if (radioKm.isNaN() || radioKm <= 0 || radioKm > 20000) {
                throw new IllegalArgumentException("El radio debe ser mayor que 0 km");
            }
        }
        if (orden == OrdenCatalogo.DISTANCIA && latitud == null) {
            throw new IllegalArgumentException("Para ordenar por distancia debes compartir tu ubicación");
        }

        if (pagina < 0) {
            throw new IllegalArgumentException("La página no puede ser negativa");
        }
        if (tamano < 1 || tamano > TAMANO_MAXIMO) {
            throw new IllegalArgumentException("El tamaño de página debe estar entre 1 y " + TAMANO_MAXIMO);
        }
    }

    public boolean tieneUbicacion() {
        return latitud != null && longitud != null;
    }

    /** Construye la consulta desde los parámetros crudos de la URL. Las categorías pueden venir repetidas o separadas por coma. */
    public static CatalogoConsulta de(String q, List<String> categorias, BigDecimal precioMin, BigDecimal precioMax,
                                      Double lat, Double lon, Double radioKm, String orden,
                                      Integer pagina, Integer tamano) {
        Set<CategoriaPublicacion> cats = EnumSet.noneOf(CategoriaPublicacion.class);
        if (categorias != null) {
            for (String valor : categorias) {
                if (valor == null) {
                    continue;
                }
                for (String codigo : valor.split(",")) {
                    if (!codigo.isBlank()) {
                        cats.add(CategoriaPublicacion.desdeCodigo(codigo));
                    }
                }
            }
        }
        return new CatalogoConsulta(q, cats, precioMin, precioMax, lat, lon, radioKm,
                OrdenCatalogo.desdeTexto(orden),
                pagina == null ? 0 : pagina,
                tamano == null ? TAMANO_DEFECTO : tamano);
    }
}
