package com.marketroad.publication.catalogo;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Aplica filtros (categoría, precio, texto, radio) y el orden pedido a un conjunto de candidatos.
 * Es lógica pura: no toca base de datos, así se puede probar sin levantar Spring. Bean de Spring.
 */
@Component
public class CatalogoProcesador {
    @Autowired
    private Relevancia relevancia;

    private final Comparator<Resultado> recientes = Comparator
            .<Resultado, OffsetDateTime>comparing(r -> r.candidato().fecha(), Comparator.reverseOrder())
            .thenComparing(r -> r.candidato().id(), Comparator.reverseOrder());

    public List<Resultado> procesar(Collection<Candidato> candidatos, CatalogoConsulta consulta) {
        List<String> terminos = relevancia.terminos(consulta.texto());
        List<Resultado> resultados = new ArrayList<>();

        for (Candidato c : candidatos) {
            if (!consulta.categorias().isEmpty() && !consulta.categorias().contains(c.categoria())) {
                continue;
            }
            if (consulta.precioMin() != null && c.precio().compareTo(consulta.precioMin()) < 0) {
                continue;
            }
            if (consulta.precioMax() != null && c.precio().compareTo(consulta.precioMax()) > 0) {
                continue;
            }

            Double distancia = null;
            if (consulta.tieneUbicacion() && Geo.coordenadasValidas(c.latitud(), c.longitud())) {
                distancia = Geo.distanciaKm(consulta.latitud(), consulta.longitud(), c.latitud(), c.longitud());
            }
            if (consulta.radioKm() != null && (distancia == null || distancia > consulta.radioKm())) {
                continue;
            }

            int puntaje = 0;
            if (!terminos.isEmpty()) {
                puntaje = relevancia.puntaje(terminos, c);
                if (puntaje < 0) {
                    continue;
                }
            }
            resultados.add(new Resultado(c, distancia, puntaje));
        }

        resultados.sort(comparador(consulta.orden()));
        return resultados;
    }

    Comparator<Resultado> comparador(OrdenCatalogo orden) {
        switch (orden) {
            case PRECIO_ASC:
                return Comparator.<Resultado, java.math.BigDecimal>comparing(r -> r.candidato().precio()).thenComparing(recientes);
            case PRECIO_DESC:
                return Comparator.<Resultado, java.math.BigDecimal>comparing(r -> r.candidato().precio(), Comparator.reverseOrder())
                        .thenComparing(recientes);
            case DISTANCIA:
                return Comparator.<Resultado, Double>comparing(Resultado::distanciaKm, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(recientes);
            case RECIENTES:
                return recientes;
            case RELEVANCIA:
            default:
                return Comparator.<Resultado, Integer>comparing(Resultado::puntaje, Comparator.reverseOrder())
                        .thenComparing(recientes);
        }
    }

    public <T> List<T> pagina(List<T> lista, int pagina, int tamano) {
        long desde = (long) pagina * tamano;
        if (desde >= lista.size()) {
            return List.of();
        }
        int hasta = (int) Math.min(lista.size(), desde + tamano);
        return lista.subList((int) desde, hasta);
    }

    public int totalPaginas(long total, int tamano) {
        return (int) ((total + tamano - 1) / tamano);
    }
}
