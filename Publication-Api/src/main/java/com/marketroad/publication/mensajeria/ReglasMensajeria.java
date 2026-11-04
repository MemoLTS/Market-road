package com.marketroad.publication.mensajeria;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.marketroad.publication.validacion.Textos;

/**
 * Reglas puras de la mensajería (sin base de datos), separadas para poder
 * probarlas fácilmente. Bean de Spring.
 */
@Component
public class ReglasMensajeria {
    public static final int MAX_CONTENIDO = 1000;
    public static final int MAX_VISTA_PREVIA = 120;

    public enum Rol {
        COMPRADOR, VENDEDOR
    }

    @Autowired
    private Textos textos;

    /**
     * Monto máximo de una oferta (cabe en la columna DECIMAL(12,2)); configurable
     * en application.yml.
     */
    @Value("${mensajeria.monto-maximo:9999999999.99}")
    private BigDecimal montoMaximo;

    public String normalizarContenido(String contenido) {
        String limpio = Textos.limpiar(contenido, true, "El mensaje");
        if (limpio.isEmpty()) {
            throw new IllegalArgumentException("El mensaje no puede estar vacío");
        }
        if (limpio.length() > MAX_CONTENIDO) {
            throw new IllegalArgumentException("El mensaje puede tener como máximo " + MAX_CONTENIDO + " caracteres");
        }
        return limpio;
    }

    /**
     * Monto de una oferta: mayor que 0, hasta 2 decimales y hasta 10 dígitos
     * enteros. Devuelve el monto con escala 2.
     */
    public BigDecimal validarMonto(BigDecimal monto) {
        if (monto == null || monto.signum() <= 0) {
            throw new IllegalArgumentException("La oferta debe ser mayor que 0");
        }
        if (monto.stripTrailingZeros().scale() > 2) {
            throw new IllegalArgumentException("La oferta puede tener como máximo 2 decimales");
        }
        if (monto.compareTo(montoMaximo) > 0) {
            throw new IllegalArgumentException("La oferta es demasiado alta");
        }
        return monto.setScale(2, RoundingMode.UNNECESSARY);
    }

    /** Texto corto para la lista de conversaciones. */
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

    /** Rol del usuario en la conversación, o null si no participa. */
    public Rol rolDe(Long usuarioId, Long compradorId, Long vendedorId) {
        if (usuarioId == null) {
            return null;
        }
        if (usuarioId.equals(compradorId)) {
            return Rol.COMPRADOR;
        }
        if (usuarioId.equals(vendedorId)) {
            return Rol.VENDEDOR;
        }
        return null;
    }

    /** Ej.: 450000 -> "$450.000" (formato chileno). */
    public String formatearMonto(BigDecimal monto) {
        NumberFormat formato = NumberFormat.getNumberInstance(Locale.forLanguageTag("es-CL"));
        formato.setMinimumFractionDigits(0);
        formato.setMaximumFractionDigits(2);
        return "$" + formato.format(monto);
    }

    public String apodoODefecto(String apodo, Long usuarioId) {
        return apodo == null || apodo.isBlank() ? "Usuario #" + usuarioId : apodo;
    }
}
