package com.marketroad.soporte.reglas;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.marketroad.soporte.exception.OperacionNoPermitidaException;
import com.marketroad.soporte.model.EstadoTicket;
import com.marketroad.soporte.model.RolPersonal;
import com.marketroad.soporte.validacion.Textos;

class ReglasTicketTest {
    private final ReglasTicket reglas = nuevas();

    /** Arma las reglas igual que Spring: con su colaborador inyectado. */
    private static ReglasTicket nuevas() {
        ReglasTicket reglas = new ReglasTicket();
        ReflectionTestUtils.setField(reglas, "textos", new Textos());
        return reglas;
    }

    @Test
    void normalizaYRechazaAsuntos() {
        assertEquals("No puedo entrar", reglas.normalizarAsunto("  No puedo entrar  "));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarAsunto("ab"));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarAsunto(null));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarAsunto("a".repeat(121)));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarAsunto("dos\nlíneas"));
        assertDoesNotThrow(() -> reglas.normalizarAsunto("a".repeat(120)));
    }

    @Test
    void normalizaYRechazaMensajes() {
        assertEquals("hola", reglas.normalizarContenido("  hola  "));
        assertEquals("uno\ndos", reglas.normalizarContenido("uno\r\ndos"));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarContenido("   "));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarContenido(null));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarContenido("a".repeat(1001)));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarContenido("texto \u202E invertido"));
    }

    @Test
    void vistaPreviaAcortaYCompactaEspacios() {
        assertEquals("", reglas.vistaPrevia(null));
        assertEquals("a b c", reglas.vistaPrevia("a\n  b \t c"));
        String larga = reglas.vistaPrevia("x".repeat(500));
        assertEquals(ReglasTicket.MAX_VISTA_PREVIA, larga.length());
        assertTrue(larga.endsWith("…"));
    }

    @Test
    void elCupoDeTicketsSeAgotaAlLlegarAlMaximo() {
        assertDoesNotThrow(() -> reglas.validarCupo(ReglasTicket.MAX_TICKETS_ACTIVOS - 1));
        assertThrows(OperacionNoPermitidaException.class, () -> reglas.validarCupo(ReglasTicket.MAX_TICKETS_ACTIVOS));
        assertThrows(OperacionNoPermitidaException.class,
                () -> reglas.validarLimiteMensajes(ReglasTicket.MAX_MENSAJES_POR_TICKET));
        assertDoesNotThrow(() -> reglas.validarLimiteMensajes(ReglasTicket.MAX_MENSAJES_POR_TICKET - 1));
    }

    @Test
    void soloUnTicketResueltoSeReabreSolo() {
        assertEquals(EstadoTicket.EN_PROGRESO, reglas.estadoTrasMensajeUsuario(EstadoTicket.RESUELTO, 7L));
        assertEquals(EstadoTicket.ABIERTO, reglas.estadoTrasMensajeUsuario(EstadoTicket.RESUELTO, null));
        assertEquals(EstadoTicket.ABIERTO, reglas.estadoTrasMensajeUsuario(EstadoTicket.ABIERTO, null));
        assertEquals(EstadoTicket.EN_PROGRESO, reglas.estadoTrasMensajeUsuario(EstadoTicket.EN_PROGRESO, 7L));
        assertEquals(EstadoTicket.EN_PROGRESO, reglas.estadoTrasRespuestaPersonal(EstadoTicket.ABIERTO));
        assertEquals(EstadoTicket.RESUELTO, reglas.estadoTrasRespuestaPersonal(EstadoTicket.RESUELTO));
    }

    @Test
    void laPersonaUsuariaNoEscribeEnTicketsCerrados() {
        assertFalse(reglas.usuarioPuedeEscribir(EstadoTicket.CERRADO));
        assertTrue(reglas.usuarioPuedeEscribir(EstadoTicket.ABIERTO));
        assertTrue(reglas.usuarioPuedeEscribir(EstadoTicket.RESUELTO));
    }

    @Test
    void transicionesDeEstado() {
        assertTrue(reglas.transicionPermitida(EstadoTicket.ABIERTO, EstadoTicket.EN_PROGRESO, false));
        assertTrue(reglas.transicionPermitida(EstadoTicket.EN_PROGRESO, EstadoTicket.RESUELTO, false));
        assertTrue(reglas.transicionPermitida(EstadoTicket.RESUELTO, EstadoTicket.CERRADO, false));
        assertFalse(reglas.transicionPermitida(EstadoTicket.ABIERTO, EstadoTicket.ABIERTO, false));
        assertFalse(reglas.transicionPermitida(EstadoTicket.RESUELTO, EstadoTicket.ABIERTO, false));
        assertFalse(reglas.transicionPermitida(null, EstadoTicket.ABIERTO, true));
    }

    @Test
    void soloAdminReabreUnTicketCerrado() {
        assertEquals(List.of(), reglas.siguientesEstados(EstadoTicket.CERRADO, false));
        assertEquals(List.of(EstadoTicket.ABIERTO), reglas.siguientesEstados(EstadoTicket.CERRADO, true));
        assertFalse(reglas.transicionPermitida(EstadoTicket.CERRADO, EstadoTicket.ABIERTO, false));
        assertTrue(reglas.transicionPermitida(EstadoTicket.CERRADO, EstadoTicket.ABIERTO, true));
    }

    @Test
    void permisosDelPersonalSegunRol() {
        // ADMIN ve y gestiona todo
        assertTrue(reglas.personalPuedeVer(RolPersonal.ADMIN, 1L, 2L));
        assertTrue(reglas.personalPuedeGestionar(RolPersonal.ADMIN, 1L, 2L));
        assertTrue(reglas.personalPuedeGestionar(RolPersonal.ADMIN, 1L, null));
        // SOPORTE ve los sin asignar y los suyos, pero no los de otra persona
        assertTrue(reglas.personalPuedeVer(RolPersonal.SOPORTE, 5L, null));
        assertTrue(reglas.personalPuedeVer(RolPersonal.SOPORTE, 5L, 5L));
        assertFalse(reglas.personalPuedeVer(RolPersonal.SOPORTE, 5L, 6L));
        // SOPORTE solo gestiona los suyos: uno sin asignar hay que tomarlo primero
        assertTrue(reglas.personalPuedeGestionar(RolPersonal.SOPORTE, 5L, 5L));
        assertFalse(reglas.personalPuedeGestionar(RolPersonal.SOPORTE, 5L, null));
        assertFalse(reglas.personalPuedeGestionar(RolPersonal.SOPORTE, 5L, 6L));
    }

    @Test
    void validaDatosDelPersonal() {
        assertEquals("ana@empresa.cl", reglas.normalizarCorreo("  Ana@Empresa.CL "));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarCorreo("sin-arroba"));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarCorreo("a@b"));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarCorreo(null));
        assertEquals("Ana Pérez", reglas.normalizarNombre(" Ana Pérez "));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarNombre("A"));
        assertThrows(IllegalArgumentException.class, () -> reglas.normalizarNombre("x".repeat(81)));
    }

    @Test
    void validaContrasenas() {
        assertDoesNotThrow(() -> reglas.validarContrasena("Soporte12345"));
        assertThrows(IllegalArgumentException.class, () -> reglas.validarContrasena("corta1"));
        assertThrows(IllegalArgumentException.class, () -> reglas.validarContrasena("sinnumeroaqui"));
        assertThrows(IllegalArgumentException.class, () -> reglas.validarContrasena("123456789"));
        assertThrows(IllegalArgumentException.class, () -> reglas.validarContrasena("a1".repeat(17)));
        assertThrows(IllegalArgumentException.class, () -> reglas.validarContrasena(null));
    }
}
