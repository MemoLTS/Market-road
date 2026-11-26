package com.marketroad.publication.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Hibernate crea la columna `estado` como ENUM de MySQL con los valores que existían al crear la tabla;
 * como ddl-auto=update no la modifica, un estado nuevo (DESHABILITADA) fallaría en bases ya creadas.
 * Se pasa a VARCHAR(20), que acepta cualquier estado del enum.
 */
@Component
public class PublicacionSchemaMigration implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(PublicacionSchemaMigration.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            java.util.List<String> tipos = jdbcTemplate.queryForList(
                    "SELECT DATA_TYPE FROM information_schema.columns WHERE table_schema = DATABASE() "
                            + "AND LOWER(table_name) = 'publicaciones' AND LOWER(column_name) = 'estado'",
                    String.class);
            if (!tipos.isEmpty() && "enum".equalsIgnoreCase(tipos.get(0))) {
                jdbcTemplate.execute("ALTER TABLE publicaciones MODIFY COLUMN estado VARCHAR(20) NOT NULL");
                log.info("La columna publicaciones.estado pasó de ENUM a VARCHAR(20)");
            }
        } catch (Exception ex) {
            log.error("No se pudo convertir publicaciones.estado a VARCHAR; deshabilitar publicaciones fallará hasta corregirlo", ex);
        }
    }
}
