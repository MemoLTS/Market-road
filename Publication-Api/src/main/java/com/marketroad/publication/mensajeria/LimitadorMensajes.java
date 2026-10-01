package com.marketroad.publication.mensajeria;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import com.marketroad.publication.exception.DemasiadasSolicitudesException;

/**
 * Anti-spam: máximo de acciones de escritura (mensajes y ofertas) por usuario en una ventana deslizante.
 * Es en memoria, por instancia del servicio; suficiente para frenar abusos básicos.
 */
@Component
public class LimitadorMensajes {
    public static final int MAXIMO = 20;
    public static final long VENTANA_MS = 60_000;

    private final Map<Long, Deque<Long>> acciones = new ConcurrentHashMap<>();
    private final Clock reloj;

    public LimitadorMensajes() {
        this(Clock.systemUTC());
    }

    LimitadorMensajes(Clock reloj) {
        this.reloj = reloj;
    }

    public void registrar(Long usuarioId) {
        long ahora = reloj.millis();
        Deque<Long> cola = acciones.computeIfAbsent(usuarioId, k -> new ArrayDeque<>());
        synchronized (cola) {
            while (!cola.isEmpty() && ahora - cola.peekFirst() >= VENTANA_MS) {
                cola.pollFirst();
            }
            if (cola.size() >= MAXIMO) {
                throw new DemasiadasSolicitudesException("Estás enviando mensajes muy rápido. Espera un momento e inténtalo de nuevo");
            }
            cola.addLast(ahora);
        }
        if (acciones.size() > 10_000) {
            acciones.entrySet().removeIf(e -> {
                synchronized (e.getValue()) {
                    return e.getValue().isEmpty() || ahora - e.getValue().peekLast() >= VENTANA_MS;
                }
            });
        }
    }
}
