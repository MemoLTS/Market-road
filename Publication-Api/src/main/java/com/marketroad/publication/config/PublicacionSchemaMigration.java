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
            String tipo = jdbcTemplate.queryForObject(
                    "SELECT DATA_TYPE FROM information_schema.columns WHERE table_schema = DATABASE() "
                            + "AND LOWER(table_name) = 'publicaciones' AND column_name = 'estado'",
                    String.class);
            if ("enum".equalsIgnoreCase(tipo)) {
                jdbcTemplate.execute("ALTER TABLE publicaciones MODIFY COLUMN estado VARCHAR(20) NOT NULL");
            }
        } catch (Exception ex) {
            log.warn("No se pudo revisar la columna estado de publicaciones: {}", ex.getMessage());
        }
    }
}
