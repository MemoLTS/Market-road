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
import com.marketroad.publication.repository.PublicacionRepository;

@Service
public class CatalogoService {
        @Autowired
        private PublicacionRepository repository;
        @Autowired
        private PublicacionMapper mapper;
        @Autowired
        private CatalogoProcesador procesador;

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

                List<Resultado> ordenados = procesador.procesar(candidatos, consulta);
                List<Resultado> pagina = procesador.pagina(ordenados, consulta.pagina(), consulta.tamano());

                Map<Long, Integer> imagenes = mapper.contarImagenes(
                                pagina.stream().map(r -> r.candidato().id()).toList());

                List<PublicacionResponseDTO> contenido = pagina.stream()
                                .map(r -> mapper.aDTO(porId.get(r.candidato().id()),
                                                imagenes.getOrDefault(r.candidato().id(), 0),
                                                redondear(r.distanciaKm())))
                                .toList();

                return new PaginaDTO<>(contenido, consulta.pagina(), consulta.tamano(), ordenados.size(),
                                procesador.totalPaginas(ordenados.size(), consulta.tamano()));
        }

        private Double redondear(Double km) {
                return km == null ? null : Math.round(km * 10.0) / 10.0;
        }
}
