package com.marketroad.soporte.reglas;

import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.marketroad.soporte.exception.OperacionNoPermitidaException;
import com.marketroad.soporte.model.EstadoTicket;
import com.marketroad.soporte.model.RolPersonal;
import com.marketroad.soporte.validacion.Textos;

/** Reglas puras del soporte (sin base de datos), separadas para poder probarlas fácilmente. Bean de Spring. */
@Component
public class ReglasTicket {
    public static final int MIN_ASUNTO = 3;
    public static final int MAX_ASUNTO = 120;
    public static final int MAX_CONTENIDO = 1000;
    public static final int MAX_VISTA_PREVIA = 120;
    /** Tickets sin resolver que un usuario puede tener a la vez (evita inundar al equipo). */
    public static final int MAX_TICKETS_ACTIVOS = 3;
    public static final int MAX_MENSAJES_POR_TICKET = 300;
    public static final int MAX_NOMBRE = 80;
    public static final int MAX_CORREO = 150;
    public static final int MIN_CONTRASENA = 8;
    public static final int MAX_CONTRASENA = 32;

    @Autowired
    private Textos textos;

    /** Estados que necesitan atención del equipo (y que cuentan contra el cupo del usuario). */
    private final Set<EstadoTicket> estadosActivos = Collections.unmodifiableSet(
            EnumSet.of(EstadoTicket.ABIERTO, EstadoTicket.EN_PROGRESO));

    private final Pattern patronCorreo = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private final Pattern patronLetra = Pattern.compile(".*\\p{L}.*");
    private final Pattern patronNumero = Pattern.compile(".*\\d.*");

    /** Estados que necesitan atención: abiertos y en progreso. */
    public Set<EstadoTicket> estadosActivos() {
        return estadosActivos;
    }

    /** Estados que cuentan contra el cupo del usuario: un ticket resuelto o cerrado ya no ocupa lugar. */
    public Set<EstadoTicket> estadosQueOcupanCupo() {
        return estadosActivos;
    }

    // ---------- Textos ----------

    public String normalizarAsunto(String asunto) {
        String limpio = textos.limpiar(asunto, false, "El asunto");
        if (limpio.length() < MIN_ASUNTO) {
            throw new IllegalArgumentException("El asunto debe tener al menos " + MIN_ASUNTO + " caracteres");
        }
        if (limpio.length() > MAX_ASUNTO) {
            throw new IllegalArgumentException("El asunto puede tener como máximo " + MAX_ASUNTO + " caracteres");
        }
        return limpio;
    }

    public String normalizarContenido(String contenido) {
        String limpio = textos.limpiar(contenido, true, "El mensaje");
        if (limpio.isEmpty()) {
            throw new IllegalArgumentException("El mensaje no puede estar vacío");
        }
        if (limpio.length() > MAX_CONTENIDO) {
            throw new IllegalArgumentException("El mensaje puede tener como máximo " + MAX_CONTENIDO + " caracteres");
        }
        return limpio;
    }

    /** Texto corto para las listas de tickets. */
    public String vistaPrevia(String texto) {
        if (texto == null) {
            return "";
        }
        String plano = texto.replaceAll("\\s+", " ").trim();
        if (plano.length() <= MAX_VISTA_PREVIA) {
            return plano;
        }
        return plano.substring(0, MAX_VISTA_PREVIA - 1) + "…";
    }

    // ---------- Cupos ----------

    public void validarCupo(long ticketsActivos) {
        if (ticketsActivos >= MAX_TICKETS_ACTIVOS) {
            throw new OperacionNoPermitidaException("Ya tienes " + MAX_TICKETS_ACTIVOS
                    + " tickets en curso. Espera a que se resuelvan o ciérralos antes de abrir otro");
        }
    }

    public void validarLimiteMensajes(long mensajesActuales) {
        if (mensajesActuales >= MAX_MENSAJES_POR_TICKET) {
            throw new OperacionNoPermitidaException(
                    "Este ticket llegó al máximo de mensajes. Cierra este ticket y abre uno nuevo si necesitas seguir");
        }
    }

    // ---------- Estados ----------

    public boolean usuarioPuedeEscribir(EstadoTicket estado) {
        return estado != EstadoTicket.CERRADO;
    }

    /** Si el usuario escribe en un ticket resuelto, se reabre (con el agente que lo llevaba, si había). */
    public EstadoTicket estadoTrasMensajeUsuario(EstadoTicket actual, Long asignadoId) {
        if (actual == EstadoTicket.RESUELTO) {
            return asignadoId != null ? EstadoTicket.EN_PROGRESO : EstadoTicket.ABIERTO;
        }
        return actual;
    }

    /** Al responder el personal, un ticket recién abierto pasa a "en progreso". */
    public EstadoTicket estadoTrasRespuestaPersonal(EstadoTicket actual) {
        return actual == EstadoTicket.ABIERTO ? EstadoTicket.EN_PROGRESO : actual;
    }

    /** Estados a los que el personal puede mover un ticket. Solo ADMIN puede reabrir un ticket cerrado. */
    public List<EstadoTicket> siguientesEstados(EstadoTicket desde, boolean esAdmin) {
        return switch (desde) {
            case ABIERTO -> List.of(EstadoTicket.EN_PROGRESO, EstadoTicket.RESUELTO, EstadoTicket.CERRADO);
            case EN_PROGRESO -> List.of(EstadoTicket.ABIERTO, EstadoTicket.RESUELTO, EstadoTicket.CERRADO);
            case RESUELTO -> List.of(EstadoTicket.EN_PROGRESO, EstadoTicket.CERRADO);
            case CERRADO -> esAdmin ? List.of(EstadoTicket.ABIERTO) : List.of();
        };
    }

    public boolean transicionPermitida(EstadoTicket desde, EstadoTicket hacia, boolean esAdmin) {
        return desde != null && hacia != null && siguientesEstados(desde, esAdmin).contains(hacia);
    }

    // ---------- Permisos del personal ----------

    /** ADMIN ve todos los tickets; SOPORTE ve los sin asignar y los que lleva él. */
    public boolean personalPuedeVer(RolPersonal rol, Long personalId, Long asignadoId) {
        if (rol == RolPersonal.ADMIN) {
            return true;
        }
        return asignadoId == null || asignadoId.equals(personalId);
    }

    /** Responder o cambiar el estado: ADMIN siempre; SOPORTE solo si el ticket es suyo. */
    public boolean personalPuedeGestionar(RolPersonal rol, Long personalId, Long asignadoId) {
        if (rol == RolPersonal.ADMIN) {
            return true;
        }
        return asignadoId != null && asignadoId.equals(personalId);
    }

    // ---------- Datos del personal ----------

    public String normalizarCorreo(String correo) {
        String limpio = textos.limpiar(correo, false, "El correo").toLowerCase();
        if (limpio.isEmpty() || limpio.length() > MAX_CORREO || !patronCorreo.matcher(limpio).matches()) {
            throw new IllegalArgumentException("El correo indicado no es válido");
        }
        return limpio;
    }

    public String normalizarNombre(String nombre) {
        String limpio = textos.limpiar(nombre, false, "El nombre");
        if (limpio.length() < 2 || limpio.length() > MAX_NOMBRE) {
            throw new IllegalArgumentException("El nombre debe tener entre 2 y " + MAX_NOMBRE + " caracteres");
        }
        return limpio;
    }

    /** 8 a 32 caracteres, con al menos una letra y un número (misma política que el superusuario de la plataforma). */
    public void validarContrasena(String contrasena) {
        if (contrasena == null || contrasena.length() < MIN_CONTRASENA || contrasena.length() > MAX_CONTRASENA) {
            throw new IllegalArgumentException(
                    "La contraseña debe tener entre " + MIN_CONTRASENA + " y " + MAX_CONTRASENA + " caracteres");
        }
        if (!patronLetra.matcher(contrasena).matches() || !patronNumero.matcher(contrasena).matches()) {
            throw new IllegalArgumentException("La contraseña debe tener al menos una letra y un número");
        }
    }
}
