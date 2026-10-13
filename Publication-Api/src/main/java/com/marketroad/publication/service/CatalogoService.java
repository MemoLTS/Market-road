package com.marketroad.publication.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.marketroad.publication.catalogo.Candidato;
import com.marketroad.publication.catalogo.CatalogoConsulta;
import com.marketroad.publication.catalogo.CatalogoProcesador;
import com.marketroad.publication.catalogo.Resultado;
import com.marketroad.publication.dto.CategoriaDTO;
import com.marketroad.publication.dto.PaginaDTO;
import com.marketroad.publication.dto.PublicacionResponseDTO;
import com.marketroad.publication.model.CategoriaPublicacion;
import com.marketroad.publication.model.EstadoPublicacion;
import com.marketroad.publication.model.Publicacion;
import com.marketroad.publication.repository.ImagenPublicacionRepository;
import com.marketroad.publication.repository.PublicacionRepository;

/**
 * Catálogo público: búsqueda por texto, filtros (categoría, precio, radio) y orden
 * (relevancia, precio, distancia, recientes) con paginación.
 *
 * Nota de escala: se cargan las publicaciones ACTIVAS (sin fotos) y se filtran/ordenan en memoria.
 * Es simple y suficiente para un catálogo de miles de publicaciones; si creciera mucho habría que
 * mover los filtros a SQL (y la distancia a PostGIS o a una fórmula en la consulta).
 */
@Service
public class CatalogoService {
    @Autowired
    private PublicacionRepository repository;
    @Autowired
    private ImagenPublicacionRepository imagenRepository;

    public List<CategoriaDTO> categorias() {
        return Arrays.stream(CategoriaPublicacion.values())
                .map(c -> new CategoriaDTO(c.name(), c.getNombre()))
                .toList();
    }

    @Transactional(readOnly = true)
    public PaginaDTO<PublicacionResponseDTO> buscar(CatalogoConsulta consulta) {
        List<Publicacion> activas = repository.findByEstadoOrderByFechaCreacionDesc(EstadoPublicacion.ACTIVA);

        Map<Long, Publicacion> porId = new HashMap<>();
        List<Candidato> candidatos = new ArrayList<>(activas.size());
        for (Publicacion p : activas) {
            porId.put(p.getId(), p);
            candidatos.add(new Candidato(p.getId(), p.getTitulo(), p.getDescripcion(), p.getCategoria(),
                    p.getPrecio(), p.getLatitud(), p.getLongitud(), p.getFechaCreacion()));
        }

        List<Resultado> ordenados = CatalogoProcesador.procesar(candidatos, consulta);
        List<Resultado> pagina = CatalogoProcesador.pagina(ordenados, consulta.pagina(), consulta.tamano());

        Map<Long, Integer> imagenes = PublicacionMapper.contarImagenes(imagenRepository,
                pagina.stream().map(r -> r.candidato().id()).toList());

        List<PublicacionResponseDTO> contenido = pagina.stream()
                .map(r -> PublicacionMapper.aDTO(porId.get(r.candidato().id()),
                        imagenes.getOrDefault(r.candidato().id(), 0), redondear(r.distanciaKm())))
                .toList();

        return new PaginaDTO<>(contenido, consulta.pagina(), consulta.tamano(), ordenados.size(),
                CatalogoProcesador.totalPaginas(ordenados.size(), consulta.tamano()));
    }

    private static Double redondear(Double km) {
        return km == null ? null : Math.round(km * 10.0) / 10.0;
    }
}
