package com.marketroad.publication.catalogo;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.marketroad.publication.model.CategoriaPublicacion;

class CatalogoProcesadorTest {

    // Coordenadas de referencia
    private static final double SCL_LAT = -33.4489, SCL_LON = -70.6693;   // Santiago
    private static final double VLP_LAT = -33.0472, VLP_LON = -71.6127;   // Valparaíso
    private static final double CCP_LAT = -36.8201, CCP_LON = -73.0444;   // Concepción

    private static final OffsetDateTime BASE = OffsetDateTime.parse("2026-01-01T12:00:00Z");

    private static Candidato item(long id, String titulo, String desc, CategoriaPublicacion cat, String precio,
                                  Double lat, Double lon, int diasDespuesDeBase) {
        return new Candidato(id, titulo, desc, cat, new BigDecimal(precio), lat, lon, BASE.plusDays(diasDespuesDeBase));
    }

    private static CatalogoConsulta consulta(String q, EnumSet<CategoriaPublicacion> cats, String min, String max,
                                             Double lat, Double lon, Double radio, OrdenCatalogo orden) {
        return new CatalogoConsulta(q, cats, min == null ? null : new BigDecimal(min), max == null ? null : new BigDecimal(max),
                lat, lon, radio, orden, 0, 50);
    }

    private static List<Long> ids(List<Resultado> r) {
        List<Long> ids = new ArrayList<>();
        r.forEach(x -> ids.add(x.candidato().id()));
        return ids;
    }

    private static List<Candidato> muestra() {
        return List.of(
                item(1, "Notebook Lenovo", "Notebook usado en buen estado", CategoriaPublicacion.ELECTRONICA, "300000", CCP_LAT, CCP_LON, 1),
                item(2, "Cámara fotográfica", "Cámara réflex con lente", CategoriaPublicacion.ELECTRONICA, "150000", SCL_LAT, SCL_LON, 2),
                item(3, "Bicicleta de montaña", "Aro 29, poco uso", CategoriaPublicacion.DEPORTES, "220000", VLP_LAT, VLP_LON, 3),
                item(4, "Sofá de tres cuerpos", "Sofá gris, sin manchas", CategoriaPublicacion.HOGAR, "90000", null, null, 4));
    }

    @Test
    void distanciaEntreElMismoPuntoEsCero() {
        assertEquals(0.0, Geo.distanciaKm(SCL_LAT, SCL_LON, SCL_LAT, SCL_LON), 0.0001);
    }

    @Test
    void distanciaSantiagoValparaisoEsCercanaACienKm() {
        double d = Geo.distanciaKm(SCL_LAT, SCL_LON, VLP_LAT, VLP_LON);
        assertEquals(100.0, d, 5.0);
    }

    @Test
    void distanciaSantiagoConcepcionEsCercanaA432Km() {
        double d = Geo.distanciaKm(SCL_LAT, SCL_LON, CCP_LAT, CCP_LON);
        assertEquals(432.5, d, 5.0);
    }

    @Test
    void coordenadasFueraDeRangoSonInvalidas() {
        assertFalse(Geo.coordenadasValidas(91.0, 0.0));
        assertFalse(Geo.coordenadasValidas(0.0, 181.0));
        assertFalse(Geo.coordenadasValidas(null, 0.0));
        assertTrue(Geo.coordenadasValidas(-33.4, -70.6));
    }

    @Test
    void filtraPorCategoria() {
        var r = CatalogoProcesador.procesar(muestra(),
                consulta("", EnumSet.of(CategoriaPublicacion.ELECTRONICA), null, null, null, null, null, OrdenCatalogo.RECIENTES));
        assertEquals(List.of(2L, 1L), ids(r));
    }

    @Test
    void filtraPorVariasCategorias() {
        var r = CatalogoProcesador.procesar(muestra(),
                consulta("", EnumSet.of(CategoriaPublicacion.DEPORTES, CategoriaPublicacion.HOGAR), null, null, null, null, null, OrdenCatalogo.RECIENTES));
        assertEquals(List.of(4L, 3L), ids(r));
    }

    @Test
    void filtraPorRangoDePrecioInclusivo() {
        var r = CatalogoProcesador.procesar(muestra(),
                consulta("", EnumSet.noneOf(CategoriaPublicacion.class), "150000", "220000", null, null, null, OrdenCatalogo.PRECIO_ASC));
        assertEquals(List.of(2L, 3L), ids(r));
    }

    @Test
    void ordenaPorPrecioAscendenteYDescendente() {
        var asc = CatalogoProcesador.procesar(muestra(), consulta("", null, null, null, null, null, null, OrdenCatalogo.PRECIO_ASC));
        assertEquals(List.of(4L, 2L, 3L, 1L), ids(asc));
        var desc = CatalogoProcesador.procesar(muestra(), consulta("", null, null, null, null, null, null, OrdenCatalogo.PRECIO_DESC));
        assertEquals(List.of(1L, 3L, 2L, 4L), ids(desc));
    }

    @Test
    void empateDePrecioSeResuelveConLaMasReciente() {
        List<Candidato> l = List.of(
                item(10, "Mesa", "Mesa de comedor", CategoriaPublicacion.HOGAR, "50000", null, null, 1),
                item(11, "Silla", "Silla de comedor", CategoriaPublicacion.HOGAR, "50000", null, null, 5));
        var r = CatalogoProcesador.procesar(l, consulta("", null, null, null, null, null, null, OrdenCatalogo.PRECIO_ASC));
        assertEquals(List.of(11L, 10L), ids(r));
    }

    @Test
    void ordenaPorDistanciaConSinCoordenadasAlFinal() {
        // Usuario en Santiago: Cámara (0 km) < Bicicleta (~100 km) < Notebook (~430 km) < Sofá (sin coordenadas)
        var r = CatalogoProcesador.procesar(muestra(), consulta("", null, null, null, SCL_LAT, SCL_LON, null, OrdenCatalogo.DISTANCIA));
        assertEquals(List.of(2L, 3L, 1L, 4L), ids(r));
        assertNull(r.get(3).distanciaKm());
        assertEquals(0.0, r.get(0).distanciaKm(), 0.01);
    }

    @Test
    void radioExcluyeLosLejanosYLosSinCoordenadas() {
        var r = CatalogoProcesador.procesar(muestra(), consulta("", null, null, null, SCL_LAT, SCL_LON, 150.0, OrdenCatalogo.DISTANCIA));
        assertEquals(List.of(2L, 3L), ids(r));
    }

    @Test
    void sinUbicacionNoSeCalculaDistancia() {
        var r = CatalogoProcesador.procesar(muestra(), consulta("", null, null, null, null, null, null, OrdenCatalogo.RECIENTES));
        r.forEach(x -> assertNull(x.distanciaKm()));
    }

    @Test
    void busquedaIgnoraTildesYMayusculas() {
        var r = CatalogoProcesador.procesar(muestra(), consulta("CAMARA", null, null, null, null, null, null, OrdenCatalogo.RELEVANCIA));
        assertEquals(List.of(2L), ids(r));
    }

    @Test
    void busquedaExigeTodosLosTerminos() {
        var r = CatalogoProcesador.procesar(muestra(), consulta("notebook lenovo", null, null, null, null, null, null, OrdenCatalogo.RELEVANCIA));
        assertEquals(List.of(1L), ids(r));
        var ninguno = CatalogoProcesador.procesar(muestra(), consulta("notebook sofa", null, null, null, null, null, null, OrdenCatalogo.RELEVANCIA));
        assertTrue(ninguno.isEmpty());
    }

    @Test
    void busquedaPorPrefijoDePalabraDelTitulo() {
        var r = CatalogoProcesador.procesar(muestra(), consulta("bici", null, null, null, null, null, null, OrdenCatalogo.RELEVANCIA));
        assertEquals(List.of(3L), ids(r));
    }

    @Test
    void busquedaTambienCoincideConElNombreDeLaCategoria() {
        var r = CatalogoProcesador.procesar(muestra(), consulta("deportes", null, null, null, null, null, null, OrdenCatalogo.RELEVANCIA));
        assertEquals(List.of(3L), ids(r));
    }

    @Test
    void relevanciaPrefiereCoincidenciaEnElTituloSobreLaDescripcionAunqueSeaMasAntigua() {
        List<Candidato> l = List.of(
                item(20, "Funda protectora", "Sirve para guardar tu cámara", CategoriaPublicacion.ELECTRONICA, "5000", null, null, 10),
                item(21, "Cámara Canon", "Poco uso", CategoriaPublicacion.ELECTRONICA, "200000", null, null, 1));
        var r = CatalogoProcesador.procesar(l, consulta("camara", null, null, null, null, null, null, OrdenCatalogo.RELEVANCIA));
        assertEquals(List.of(21L, 20L), ids(r));
        assertTrue(r.get(0).puntaje() > r.get(1).puntaje());
    }

    @Test
    void sinTextoLaRelevanciaEsPorRecencia() {
        var r = CatalogoProcesador.procesar(muestra(), consulta("", null, null, null, null, null, null, OrdenCatalogo.RELEVANCIA));
        assertEquals(List.of(4L, 3L, 2L, 1L), ids(r));
    }

    @Test
    void combinaCategoriaPrecioYTexto() {
        var r = CatalogoProcesador.procesar(muestra(),
                consulta("usado", EnumSet.of(CategoriaPublicacion.ELECTRONICA), null, "400000", null, null, null, OrdenCatalogo.PRECIO_ASC));
        assertEquals(List.of(1L), ids(r));
    }

    @Test
    void ordenarPorDistanciaSinUbicacionEsInvalido() {
        assertThrows(IllegalArgumentException.class,
                () -> consulta("", null, null, null, null, null, null, OrdenCatalogo.DISTANCIA));
    }

    @Test
    void radioSinUbicacionEsInvalido() {
        assertThrows(IllegalArgumentException.class,
                () -> consulta("", null, null, null, null, null, 10.0, OrdenCatalogo.RELEVANCIA));
    }

    @Test
    void latitudSinLongitudEsInvalido() {
        assertThrows(IllegalArgumentException.class,
                () -> consulta("", null, null, null, -33.0, null, null, OrdenCatalogo.RELEVANCIA));
    }

    @Test
    void coordenadasFueraDeRangoSonInvalidasEnLaConsulta() {
        assertThrows(IllegalArgumentException.class,
                () -> consulta("", null, null, null, 120.0, 10.0, null, OrdenCatalogo.RELEVANCIA));
    }

    @Test
    void precioMinimoMayorQueMaximoEsInvalido() {
        assertThrows(IllegalArgumentException.class,
                () -> consulta("", null, "500", "100", null, null, null, OrdenCatalogo.RELEVANCIA));
    }

    @Test
    void tamanoDePaginaFueraDeRangoEsInvalido() {
        assertThrows(IllegalArgumentException.class,
                () -> new CatalogoConsulta("", null, null, null, null, null, null, null, 0, 0));
        assertThrows(IllegalArgumentException.class,
                () -> new CatalogoConsulta("", null, null, null, null, null, null, null, 0, 51));
        assertThrows(IllegalArgumentException.class,
                () -> new CatalogoConsulta("", null, null, null, null, null, null, null, -1, 10));
    }

    @Test
    void categoriasSePuedenEnviarRepetidasOSeparadasPorComa() {
        var c = CatalogoConsulta.de(null, List.of("electronica,hogar", "DEPORTES", " "), null, null, null, null, null, null, null, null);
        assertEquals(EnumSet.of(CategoriaPublicacion.ELECTRONICA, CategoriaPublicacion.HOGAR, CategoriaPublicacion.DEPORTES), c.categorias());
        assertEquals(OrdenCatalogo.RELEVANCIA, c.orden());
        assertEquals(CatalogoConsulta.TAMANO_DEFECTO, c.tamano());
        assertEquals(0, c.pagina());
    }

    @Test
    void categoriaDesconocidaEsInvalida() {
        assertThrows(IllegalArgumentException.class,
                () -> CatalogoConsulta.de(null, List.of("ARMAS"), null, null, null, null, null, null, null, null));
    }

    @Test
    void ordenDesdeTextoAceptaNombresYAlias() {
        assertEquals(OrdenCatalogo.PRECIO_DESC, OrdenCatalogo.desdeTexto("precio_desc"));
        assertEquals(OrdenCatalogo.PRECIO_DESC, OrdenCatalogo.desdeTexto("PRECIO-DESC"));
        assertEquals(OrdenCatalogo.PRECIO_ASC, OrdenCatalogo.desdeTexto("precio"));
        assertEquals(OrdenCatalogo.RELEVANCIA, OrdenCatalogo.desdeTexto(null));
        assertThrows(IllegalArgumentException.class, () -> OrdenCatalogo.desdeTexto("aleatorio"));
    }

    @Test
    void paginaLaListaOrdenada() {
        List<Integer> l = new ArrayList<>();
        for (int i = 0; i < 25; i++) l.add(i);
        assertEquals(10, CatalogoProcesador.pagina(l, 0, 10).size());
        assertEquals(10, CatalogoProcesador.pagina(l, 1, 10).size());
        assertEquals(5, CatalogoProcesador.pagina(l, 2, 10).size());
        assertEquals(0, CatalogoProcesador.pagina(l, 3, 10).size());
        assertEquals(20, CatalogoProcesador.pagina(l, 2, 10).get(0).intValue());
        assertEquals(3, CatalogoProcesador.totalPaginas(25, 10));
        assertEquals(0, CatalogoProcesador.totalPaginas(0, 10));
        assertEquals(1, CatalogoProcesador.totalPaginas(10, 10));
    }

    @Test
    void codigoDeCategoriaIgnoraTildesYMayusculas() {
        assertEquals(CategoriaPublicacion.ELECTRONICA, CategoriaPublicacion.desdeCodigo(" Electrónica "));
        assertThrows(IllegalArgumentException.class, () -> CategoriaPublicacion.desdeCodigo(""));
    }
}
