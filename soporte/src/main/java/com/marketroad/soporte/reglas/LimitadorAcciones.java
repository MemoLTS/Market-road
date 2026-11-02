package com.marketroad.soporte.reglas;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.marketroad.soporte.exception.DemasiadasSolicitudesException;

/**
 * Limitador de acciones por clave en una ventana deslizante (anti-spam de mensajes y anti-fuerza-bruta del login).
 * Es en memoria, por instancia del servicio; suficiente para frenar abusos básicos.
 */
public class LimitadorAcciones {
    private final int maximo;
    private final long ventanaMs;
    private final String mensaje;
    private final Clock reloj;
    private final Map<String, Deque<Long>> acciones = new ConcurrentHashMap<>();

    public LimitadorAcciones(int maximo, long ventanaMs, String mensaje) {
        this(maximo, ventanaMs, mensaje, Clock.systemUTC());
    }

    public LimitadorAcciones(int maximo, long ventanaMs, String mensaje, Clock reloj) {
        this.maximo = maximo;
        this.ventanaMs = ventanaMs;
        this.mensaje = mensaje;
        this.reloj = reloj;
    }

    /** Anota una acción; si ya se alcanzó el máximo en la ventana, lanza 429 sin anotar. */
    public void registrar(String clave) {
        long ahora = reloj.millis();
        Deque<Long> cola = acciones.computeIfAbsent(clave, k -> new ArrayDeque<>());
        synchronized (cola) {
            purgar(cola, ahora);
            if (cola.size() >= maximo) {
                throw new DemasiadasSolicitudesException(mensaje);
            }
            cola.addLast(ahora);
        }
        limpiarSiCrece(ahora);
    }

    /** Lanza 429 si la clave ya alcanzó el máximo, sin anotar nada (para revisar antes de intentar). */
    public void verificar(String clave) {
        Deque<Long> cola = acciones.get(clave);
        if (cola == null) {
            return;
        }
        long ahora = reloj.millis();
        synchronized (cola) {
            purgar(cola, ahora);
            if (cola.size() >= maximo) {
                throw new DemasiadasSolicitudesException(mensaje);
            }
        }
    }

    /** Anota una acción sin lanzar error (por ejemplo, un intento de login fallido). */
    public void anotar(String clave) {
        long ahora = reloj.millis();
        Deque<Long> cola = acciones.computeIfAbsent(clave, k -> new ArrayDeque<>());
        synchronized (cola) {
            purgar(cola, ahora);
            cola.addLast(ahora);
        }
        limpiarSiCrece(ahora);
    }

    public void reiniciar(String clave) {
        acciones.remove(clave);
    }

    private void purgar(Deque<Long> cola, long ahora) {
        while (!cola.isEmpty() && ahora - cola.peekFirst() >= ventanaMs) {
            cola.pollFirst();
        }
    }

    private void limpiarSiCrece(long ahora) {
        if (acciones.size() > 10_000) {
            acciones.entrySet().removeIf(e -> {
                synchronized (e.getValue()) {
                    return e.getValue().isEmpty() || ahora - e.getValue().peekLast() >= ventanaMs;
                }
            });
        }
    }
}
