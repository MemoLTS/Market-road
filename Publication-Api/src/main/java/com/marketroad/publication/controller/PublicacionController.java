package com.marketroad.publication.controller;

import java.math.BigDecimal;
import java.net.URI;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.marketroad.publication.catalogo.CatalogoConsulta;
import com.marketroad.publication.dto.CategoriaDTO;
import com.marketroad.publication.dto.ImagenDTO;
import com.marketroad.publication.dto.NuevaPublicacionDTO;
import com.marketroad.publication.dto.PaginaDTO;
import com.marketroad.publication.dto.PublicacionResponseDTO;
import com.marketroad.publication.security.Identidad;
import com.marketroad.publication.service.CatalogoService;
import com.marketroad.publication.service.PublicacionService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Positive;

@Validated
@RestController
@RequestMapping("/api/v1/publicaciones")
public class PublicacionController {
    @Autowired
    private PublicacionService service;
    @Autowired
    private CatalogoService catalogo;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PublicacionResponseDTO> crear(
            @RequestParam("titulo") String titulo,
            @RequestParam("precio") String precio,
            @RequestParam("descripcion") String descripcion,
            @RequestParam("ubicacion") String ubicacion,
            @RequestParam(value = "categoria", required = false) String categoria,
            @RequestParam(value = "latitud", required = false) Double latitud,
            @RequestParam(value = "longitud", required = false) Double longitud,
            @RequestParam("fotos") List<MultipartFile> fotos,
            HttpServletRequest request) {
        NuevaPublicacionDTO datos = new NuevaPublicacionDTO(titulo, precio, descripcion, ubicacion, categoria, latitud, longitud);
        PublicacionResponseDTO creada = service.crear(datos, fotos, Identidad.de(request));
        return ResponseEntity.created(URI.create("/api/v1/publicaciones/" + creada.id())).body(creada);
    }

    /**
     * Catálogo público paginado.
     * Parámetros: q, categoria (repetible o separada por comas), precioMin, precioMax, lat, lon, radioKm,
     * orden (RELEVANCIA | PRECIO_ASC | PRECIO_DESC | DISTANCIA | RECIENTES), pagina (desde 0), tamano.
     */
    @GetMapping
    public ResponseEntity<PaginaDTO<PublicacionResponseDTO>> catalogo(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "categoria", required = false) List<String> categoria,
            @RequestParam(value = "precioMin", required = false) BigDecimal precioMin,
            @RequestParam(value = "precioMax", required = false) BigDecimal precioMax,
            @RequestParam(value = "lat", required = false) Double lat,
            @RequestParam(value = "lon", required = false) Double lon,
            @RequestParam(value = "radioKm", required = false) Double radioKm,
            @RequestParam(value = "orden", required = false) String orden,
            @RequestParam(value = "pagina", required = false) Integer pagina,
            @RequestParam(value = "tamano", required = false) Integer tamano) {
        CatalogoConsulta consulta = CatalogoConsulta.de(q, categoria, precioMin, precioMax, lat, lon, radioKm,
                orden, pagina, tamano);
        return ResponseEntity.ok(catalogo.buscar(consulta));
    }

    @GetMapping("/categorias")
    public ResponseEntity<List<CategoriaDTO>> categorias() {
        return ResponseEntity.ok(catalogo.categorias());
    }

    @GetMapping("/mias")
    public ResponseEntity<List<PublicacionResponseDTO>> obtenerMias(HttpServletRequest request) {
        return ResponseEntity.ok(service.obtenerPorUsuario(Identidad.de(request).usuarioId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PublicacionResponseDTO> obtener(@PathVariable @Positive(message = "El identificador indicado no es válido") Long id) {
        return ResponseEntity.ok(service.obtenerPorId(id));
    }

    @GetMapping("/{id}/imagenes/{posicion}")
    public ResponseEntity<byte[]> imagen(@PathVariable @Positive(message = "El identificador indicado no es válido") Long id, @PathVariable Integer posicion) {
        if (posicion == null || posicion < 0 || posicion > 7) {
            return ResponseEntity.badRequest().build();
        }
        ImagenDTO imagen = service.obtenerImagen(id, posicion);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .contentType(MediaType.parseMediaType(imagen.tipoContenido()))
                .body(imagen.datos());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable @Positive(message = "El identificador indicado no es válido") Long id, HttpServletRequest request) {
        service.eliminar(id, Identidad.de(request).usuarioId());
        return ResponseEntity.noContent().build();
    }
}
