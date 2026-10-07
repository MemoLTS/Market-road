package com.marketroad.publication.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.marketroad.publication.catalogo.Geo;
import com.marketroad.publication.dto.ImagenDTO;
import com.marketroad.publication.dto.NuevaPublicacionDTO;
import com.marketroad.publication.dto.PublicacionResponseDTO;
import com.marketroad.publication.exception.NoAutorizadoException;
import com.marketroad.publication.exception.PublicacionNoEncontradaException;
import com.marketroad.publication.model.*;
import com.marketroad.publication.repository.*;
import com.marketroad.publication.security.Identidad;
import com.marketroad.publication.validacion.Textos;

@Service
public class PublicacionServiceImpl implements PublicacionService {
    private static final int MAX_FOTOS = 8;
    private static final long MAX_BYTES_POR_FOTO = 5L * 1024 * 1024;
    private static final List<String> TIPOS_PERMITIDOS = List.of("image/jpeg", "image/png", "image/webp");

    @Autowired
    private PublicacionRepository repository;
    @Autowired
    private ImagenPublicacionRepository imagenRepository;

    @Override
    @Transactional
    public PublicacionResponseDTO crear(NuevaPublicacionDTO datos, List<MultipartFile> fotos, Identidad autor) {
        if (autor == null || autor.usuarioId() == null || autor.usuarioId() <= 0) {
            throw new IllegalArgumentException("Usuario autenticado inválido");
        }
        if (datos == null) throw new IllegalArgumentException("Faltan los datos de la publicación");
        String tituloNormalizado = Textos.limpiar(datos.titulo(), false, "El título");
        if (tituloNormalizado.length() < 3 || tituloNormalizado.length() > 100) {
            throw new IllegalArgumentException("El título debe tener entre 3 y 100 caracteres");
        }
        String descripcionNormalizada = Textos.limpiar(datos.descripcion(), true, "La descripción");
        if (descripcionNormalizada.length() < 10 || descripcionNormalizada.length() > 1000) {
            throw new IllegalArgumentException("La descripción debe tener entre 10 y 1000 caracteres");
        }
        String ubicacionNormalizada = Textos.limpiar(datos.ubicacion(), false, "La ubicación");
        if (ubicacionNormalizada.length() < 2 || ubicacionNormalizada.length() > 120) {
            throw new IllegalArgumentException("La ubicación debe tener entre 2 y 120 caracteres");
        }

        CategoriaPublicacion categoria = CategoriaPublicacion.desdeCodigo(datos.categoria());

        Double latitud = datos.latitud();
        Double longitud = datos.longitud();
        if ((latitud == null) != (longitud == null)) {
            throw new IllegalArgumentException("Debes indicar latitud y longitud juntas");
        }
        if (latitud != null && !Geo.coordenadasValidas(latitud, longitud)) {
            throw new IllegalArgumentException("Las coordenadas indicadas no son válidas");
        }

        String precioNormalizado = datos.precio() == null ? "" : datos.precio().trim();
        if (!precioNormalizado.matches("^[0-9]{1,10}(?:\\.[0-9]{1,2})?$")) {
            throw new IllegalArgumentException("El precio debe ser un número positivo de hasta 10 dígitos y máximo 2 decimales");
        }
        BigDecimal precio;
        try {
            precio = new BigDecimal(precioNormalizado);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("El precio debe ser un número válido");
        }
        if (precio.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El precio debe ser mayor que 0 y tener hasta 2 decimales");
        }
        precio = precio.setScale(2, RoundingMode.UNNECESSARY);

        if (fotos == null || fotos.isEmpty() || fotos.size() > MAX_FOTOS) {
            throw new IllegalArgumentException("Debes subir entre 1 y 8 fotos");
        }

        Publicacion publicacion = new Publicacion();
        publicacion.setTitulo(tituloNormalizado);
        publicacion.setPrecio(precio);
        publicacion.setDescripcion(descripcionNormalizada);
        publicacion.setUbicacion(ubicacionNormalizada);
        publicacion.setCategoria(categoria);
        publicacion.setLatitud(latitud);
        publicacion.setLongitud(longitud);
        publicacion.setUsuarioId(autor.usuarioId());
        publicacion.setVendedorApodo(apodoLimpio(autor.apodo()));

        for (int i = 0; i < fotos.size(); i++) {
            MultipartFile foto = fotos.get(i);
            validarFoto(foto);
            try {
                ImagenPublicacion imagen = new ImagenPublicacion();
                imagen.setDatos(foto.getBytes());
                imagen.setTipoContenido(foto.getContentType());
                imagen.setPosicion(i);
                publicacion.agregarImagen(imagen);
            } catch (java.io.IOException ex) {
                throw new IllegalArgumentException("No se pudo leer una de las fotos");
            }
        }

        Publicacion guardada = repository.save(publicacion);
        return PublicacionMapper.aDTO(guardada, fotos.size(), null);
    }

    private void validarFoto(MultipartFile foto) {
        if (foto == null || foto.isEmpty()) throw new IllegalArgumentException("Las fotos no pueden estar vacías");
        if (foto.getSize() > MAX_BYTES_POR_FOTO) throw new IllegalArgumentException("Cada foto puede pesar como máximo 5 MB");
        String tipo = foto.getContentType();
        if (!TIPOS_PERMITIDOS.contains(tipo)) {
            throw new IllegalArgumentException("Solo se permiten imágenes JPG, PNG o WEBP");
        }
        try {
            byte[] bytes = foto.getBytes();
            if (!firmaValida(bytes, tipo)) {
                throw new IllegalArgumentException("El contenido del archivo no corresponde a una imagen válida");
            }
            if (!"image/webp".equals(tipo)) {
                BufferedImage imagen = ImageIO.read(new java.io.ByteArrayInputStream(bytes));
                if (imagen == null || imagen.getWidth() > 10000 || imagen.getHeight() > 10000) {
                    throw new IllegalArgumentException("La imagen no es válida o supera 10000x10000 píxeles");
                }
            }
        } catch (java.io.IOException ex) {
            throw new IllegalArgumentException("No se pudo validar la imagen");
        }
    }

    private boolean firmaValida(byte[] b, String tipo) {
        if ("image/jpeg".equals(tipo)) return b.length >= 3 && (b[0]&255)==0xFF && (b[1]&255)==0xD8 && (b[2]&255)==0xFF;
        if ("image/png".equals(tipo)) return b.length >= 8 && (b[0]&255)==0x89 && b[1]==0x50 && b[2]==0x4E && b[3]==0x47 && b[4]==0x0D && b[5]==0x0A && b[6]==0x1A && b[7]==0x0A;
        return "image/webp".equals(tipo) && b.length >= 12 && b[0]=='R' && b[1]=='I' && b[2]=='F' && b[3]=='F' && b[8]=='W' && b[9]=='E' && b[10]=='B' && b[11]=='P';
    }

    @Override
    @Transactional(readOnly = true)
    public List<PublicacionResponseDTO> obtenerPorUsuario(Long usuarioId) {
        List<Publicacion> propias = repository.findByUsuarioIdAndEstadoNotOrderByFechaCreacionDesc(usuarioId, EstadoPublicacion.ELIMINADA);
        Map<Long, Integer> cantidades = PublicacionMapper.contarImagenes(imagenRepository,
                propias.stream().map(Publicacion::getId).toList());
        return propias.stream()
                .map(p -> PublicacionMapper.aDTO(p, cantidades.getOrDefault(p.getId(), 0), null))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicacionResponseDTO obtenerPorId(Long id) {
        Publicacion p = buscar(id);
        if (p.getEstado() == EstadoPublicacion.ELIMINADA) {
            throw new PublicacionNoEncontradaException("No se encontró la publicación con id " + id);
        }
        int cantidad = PublicacionMapper.contarImagenes(imagenRepository, List.of(p.getId())).getOrDefault(p.getId(), 0);
        return PublicacionMapper.aDTO(p, cantidad, null);
    }

    @Override
    @Transactional(readOnly = true)
    public ImagenDTO obtenerImagen(Long id, Integer posicion) {
        ImagenPublicacion imagen = imagenRepository.findByPublicacionIdAndPosicion(id, posicion)
                .orElseThrow(() -> new PublicacionNoEncontradaException("No existe esa imagen"));
        return new ImagenDTO(imagen.getDatos(), imagen.getTipoContenido());
    }

    @Override
    @Transactional
    public void eliminar(Long id, Long usuarioId) {
        Publicacion p = buscar(id);
        if (!p.getUsuarioId().equals(usuarioId)) throw new NoAutorizadoException("Solo el propietario puede eliminar la publicación");
        p.setEstado(EstadoPublicacion.ELIMINADA);
        repository.save(p);
    }

    private Publicacion buscar(Long id) {
        if (id == null || id <= 0) throw new IllegalArgumentException("El id de publicación debe ser válido");
        return repository.findById(id)
                .orElseThrow(() -> new PublicacionNoEncontradaException("No se encontró la publicación con id " + id));
    }

    private static String apodoLimpio(String apodo) {
        if (apodo == null || apodo.isBlank()) return null;
        String limpio = apodo.trim();
        return limpio.length() > 40 ? limpio.substring(0, 40) : limpio;
    }
}
