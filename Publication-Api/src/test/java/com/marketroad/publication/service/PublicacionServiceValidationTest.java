package com.marketroad.publication.service;

import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import com.marketroad.publication.dto.NuevaPublicacionDTO;
import com.marketroad.publication.repository.ImagenPublicacionRepository;
import com.marketroad.publication.repository.PublicacionRepository;
import com.marketroad.publication.security.Identidad;

class PublicacionServiceValidationTest {

    private static final String DESC = "Descripción válida del producto";
    private static final String UBICACION = "Concepción";
    private static final Identidad AUTOR = new Identidad(1L, "vendedor");

    private static PublicacionServiceImpl servicio() {
        return new PublicacionServiceImpl(
                org.mockito.Mockito.mock(PublicacionRepository.class),
                org.mockito.Mockito.mock(ImagenPublicacionRepository.class));
    }

    private static NuevaPublicacionDTO datos(String titulo, String precio, String desc, String ubicacion, String categoria,
                                             Double lat, Double lon) {
        return new NuevaPublicacionDTO(titulo, precio, desc, ubicacion, categoria, lat, lon);
    }

    private static NuevaPublicacionDTO validos() {
        return datos("Producto válido", "1000", DESC, UBICACION, "OTROS", null, null);
    }

    private static void rechaza(NuevaPublicacionDTO d, List<MultipartFile> fotos) {
        assertThrows(IllegalArgumentException.class, () -> servicio().crear(d, fotos, AUTOR));
    }

    @Test
    void rechazaSinFotos() {
        rechaza(validos(), List.of());
    }

    @Test
    void rechazaPrecioConMasDeDosDecimales() {
        rechaza(datos("Producto válido", "1000.999", DESC, UBICACION, "OTROS", null, null), List.of());
    }

    @Test
    void rechazaDescripcionCorta() {
        rechaza(datos("Producto válido", "1000", "corta", UBICACION, "OTROS", null, null), List.of());
    }

    @Test
    void rechazaUbicacionVacia() {
        rechaza(datos("Producto válido", "1000", DESC, "", "OTROS", null, null), List.of());
    }

    @Test
    void rechazaCategoriaInvalidaOFaltante() {
        var foto = new MockMultipartFile("fotos", "foto.jpg", "image/jpeg", new byte[] {1});
        rechaza(datos("Producto válido", "1000", DESC, UBICACION, "NO_EXISTE", null, null), List.of(foto));
        rechaza(datos("Producto válido", "1000", DESC, UBICACION, null, null, null), List.of(foto));
    }

    @Test
    void rechazaCoordenadasIncompletasOFueraDeRango() {
        var foto = new MockMultipartFile("fotos", "foto.jpg", "image/jpeg", new byte[] {1});
        rechaza(datos("Producto válido", "1000", DESC, UBICACION, "OTROS", -33.4, null), List.of(foto));
        rechaza(datos("Producto válido", "1000", DESC, UBICACION, "OTROS", 95.0, -70.6), List.of(foto));
    }

    @Test
    void rechazaMasDeOchoFotos() {
        var foto = new MockMultipartFile("fotos", "foto.jpg", "image/jpeg", new byte[] {1});
        rechaza(validos(), Collections.nCopies(9, foto));
    }

    @Test
    void rechazaFormatoNoPermitido() {
        var foto = new MockMultipartFile("fotos", "archivo.txt", "text/plain", new byte[] {1});
        rechaza(validos(), List.of(foto));
    }
}
