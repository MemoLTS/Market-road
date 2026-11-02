package com.marketroad.publication.mensajeria;

import java.time.Clock;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.marketroad.publication.exception.DemasiadasSolicitudesException;

/**
 * Anti-spam: máximo de acciones de escritura (mensajes y ofertas) por usuario en una ventana deslizante.
 * Es en memoria, por instancia del servicio; suficiente para frenar abusos básicos.
 */
@Component
public class LimitadorMensajes {
    /** Acciones permitidas por ventana y duración de la ventana: se configuran en application.yml (mensajeria.limite.*). */
    @Value("${mensajeria.limite.maximo:20}")
    private int maximo;
    @Value("${mensajeria.limite.ventana-ms:60000}")
    private long ventanaMs;

    private final Map<Long, Deque<Long>> acciones = new ConcurrentHashMap<>();
    private final Clock reloj;

    public LimitadorMensajes() {
        this(Clock.systemUTC());
    }

    /** Para pruebas: permite controlar el reloj. */
    LimitadorMensajes(Clock reloj) {
        this.reloj = reloj;
    }

    /** Para pruebas: fija el límite sin levantar Spring. */
    LimitadorMensajes(Clock reloj, int maximo, long ventanaMs) {
        this(reloj);
        this.maximo = maximo;
        this.ventanaMs = ventanaMs;
    }

    public void registrar(Long usuarioId) {
        long ahora = reloj.millis();
        Deque<Long> cola = acciones.computeIfAbsent(usuarioId, k -> new ArrayDeque<>());
        synchronized (cola) {
            while (!cola.isEmpty() && ahora - cola.peekFirst() >= ventanaMs) {
                cola.pollFirst();
            }
            if (cola.size() >= maximo) {
                throw new DemasiadasSolicitudesException("Estás enviando mensajes muy rápido. Espera un momento e inténtalo de nuevo");
            }
            cola.addLast(ahora);
        }
        if (acciones.size() > 10_000) {
            acciones.entrySet().removeIf(e -> {
                synchronized (e.getValue()) {
                    return e.getValue().isEmpty() || ahora - e.getValue().peekLast() >= ventanaMs;
                }
            });
        }
    }
}
