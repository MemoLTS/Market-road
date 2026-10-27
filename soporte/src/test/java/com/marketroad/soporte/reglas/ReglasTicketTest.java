package com.marketroad.soporte.reglas;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.marketroad.soporte.exception.OperacionNoPermitidaException;
import com.marketroad.soporte.model.EstadoTicket;
import com.marketroad.soporte.model.RolPersonal;

class ReglasTicketTest {
    @Test
    void normalizaYRechazaAsuntos() {
        assertEquals("No puedo entrar", ReglasTicket.normalizarAsunto("  No puedo entrar  "));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.normalizarAsunto("ab"));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.normalizarAsunto(null));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.normalizarAsunto("a".repeat(121)));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.normalizarAsunto("dos\nlíneas"));
        assertDoesNotThrow(() -> ReglasTicket.normalizarAsunto("a".repeat(120)));
    }

    @Test
    void normalizaYRechazaMensajes() {
        assertEquals("hola", ReglasTicket.normalizarContenido("  hola  "));
        assertEquals("uno\ndos", ReglasTicket.normalizarContenido("uno\r\ndos"));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.normalizarContenido("   "));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.normalizarContenido(null));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.normalizarContenido("a".repeat(1001)));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.normalizarContenido("texto \u202E invertido"));
    }

    @Test
    void vistaPreviaAcortaYCompactaEspacios() {
        assertEquals("", ReglasTicket.vistaPrevia(null));
        assertEquals("a b c", ReglasTicket.vistaPrevia("a\n  b \t c"));
        String larga = ReglasTicket.vistaPrevia("x".repeat(500));
        assertEquals(ReglasTicket.MAX_VISTA_PREVIA, larga.length());
        assertTrue(larga.endsWith("…"));
    }

    @Test
    void elCupoDeTicketsSeAgotaAlLlegarAlMaximo() {
        assertDoesNotThrow(() -> ReglasTicket.validarCupo(ReglasTicket.MAX_TICKETS_ACTIVOS - 1));
        assertThrows(OperacionNoPermitidaException.class, () -> ReglasTicket.validarCupo(ReglasTicket.MAX_TICKETS_ACTIVOS));
        assertThrows(OperacionNoPermitidaException.class,
                () -> ReglasTicket.validarLimiteMensajes(ReglasTicket.MAX_MENSAJES_POR_TICKET));
        assertDoesNotThrow(() -> ReglasTicket.validarLimiteMensajes(ReglasTicket.MAX_MENSAJES_POR_TICKET - 1));
    }

    @Test
    void soloUnTicketResueltoSeReabreSolo() {
        assertEquals(EstadoTicket.EN_PROGRESO, ReglasTicket.estadoTrasMensajeUsuario(EstadoTicket.RESUELTO, 7L));
        assertEquals(EstadoTicket.ABIERTO, ReglasTicket.estadoTrasMensajeUsuario(EstadoTicket.RESUELTO, null));
        assertEquals(EstadoTicket.ABIERTO, ReglasTicket.estadoTrasMensajeUsuario(EstadoTicket.ABIERTO, null));
        assertEquals(EstadoTicket.EN_PROGRESO, ReglasTicket.estadoTrasMensajeUsuario(EstadoTicket.EN_PROGRESO, 7L));
        assertEquals(EstadoTicket.EN_PROGRESO, ReglasTicket.estadoTrasRespuestaPersonal(EstadoTicket.ABIERTO));
        assertEquals(EstadoTicket.RESUELTO, ReglasTicket.estadoTrasRespuestaPersonal(EstadoTicket.RESUELTO));
    }

    @Test
    void laPersonaUsuariaNoEscribeEnTicketsCerrados() {
        assertFalse(ReglasTicket.usuarioPuedeEscribir(EstadoTicket.CERRADO));
        assertTrue(ReglasTicket.usuarioPuedeEscribir(EstadoTicket.ABIERTO));
        assertTrue(ReglasTicket.usuarioPuedeEscribir(EstadoTicket.RESUELTO));
    }

    @Test
    void transicionesDeEstado() {
        assertTrue(ReglasTicket.transicionPermitida(EstadoTicket.ABIERTO, EstadoTicket.EN_PROGRESO, false));
        assertTrue(ReglasTicket.transicionPermitida(EstadoTicket.EN_PROGRESO, EstadoTicket.RESUELTO, false));
        assertTrue(ReglasTicket.transicionPermitida(EstadoTicket.RESUELTO, EstadoTicket.CERRADO, false));
        assertFalse(ReglasTicket.transicionPermitida(EstadoTicket.ABIERTO, EstadoTicket.ABIERTO, false));
        assertFalse(ReglasTicket.transicionPermitida(EstadoTicket.RESUELTO, EstadoTicket.ABIERTO, false));
        assertFalse(ReglasTicket.transicionPermitida(null, EstadoTicket.ABIERTO, true));
    }

    @Test
    void soloAdminReabreUnTicketCerrado() {
        assertEquals(List.of(), ReglasTicket.siguientesEstados(EstadoTicket.CERRADO, false));
        assertEquals(List.of(EstadoTicket.ABIERTO), ReglasTicket.siguientesEstados(EstadoTicket.CERRADO, true));
        assertFalse(ReglasTicket.transicionPermitida(EstadoTicket.CERRADO, EstadoTicket.ABIERTO, false));
        assertTrue(ReglasTicket.transicionPermitida(EstadoTicket.CERRADO, EstadoTicket.ABIERTO, true));
    }

    @Test
    void permisosDelPersonalSegunRol() {
        // ADMIN ve y gestiona todo
        assertTrue(ReglasTicket.personalPuedeVer(RolPersonal.ADMIN, 1L, 2L));
        assertTrue(ReglasTicket.personalPuedeGestionar(RolPersonal.ADMIN, 1L, 2L));
        assertTrue(ReglasTicket.personalPuedeGestionar(RolPersonal.ADMIN, 1L, null));
        // SOPORTE ve los sin asignar y los suyos, pero no los de otra persona
        assertTrue(ReglasTicket.personalPuedeVer(RolPersonal.SOPORTE, 5L, null));
        assertTrue(ReglasTicket.personalPuedeVer(RolPersonal.SOPORTE, 5L, 5L));
        assertFalse(ReglasTicket.personalPuedeVer(RolPersonal.SOPORTE, 5L, 6L));
        // SOPORTE solo gestiona los suyos: uno sin asignar hay que tomarlo primero
        assertTrue(ReglasTicket.personalPuedeGestionar(RolPersonal.SOPORTE, 5L, 5L));
        assertFalse(ReglasTicket.personalPuedeGestionar(RolPersonal.SOPORTE, 5L, null));
        assertFalse(ReglasTicket.personalPuedeGestionar(RolPersonal.SOPORTE, 5L, 6L));
    }

    @Test
    void validaDatosDelPersonal() {
        assertEquals("ana@empresa.cl", ReglasTicket.normalizarCorreo("  Ana@Empresa.CL "));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.normalizarCorreo("sin-arroba"));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.normalizarCorreo("a@b"));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.normalizarCorreo(null));
        assertEquals("Ana Pérez", ReglasTicket.normalizarNombre(" Ana Pérez "));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.normalizarNombre("A"));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.normalizarNombre("x".repeat(81)));
    }

    @Test
    void validaContrasenas() {
        assertDoesNotThrow(() -> ReglasTicket.validarContrasena("Soporte12345"));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.validarContrasena("corta1"));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.validarContrasena("sinnumeroaqui"));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.validarContrasena("123456789"));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.validarContrasena("a1".repeat(17)));
        assertThrows(IllegalArgumentException.class, () -> ReglasTicket.validarContrasena(null));
    }
}
