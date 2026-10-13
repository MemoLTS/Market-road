package api.com.v1.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class UsuarioSchemaMigration implements ApplicationRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute("ALTER TABLE usuarios MODIFY COLUMN apodo VARCHAR(255) NULL");
        Integer ciudadExiste = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.columns "
                        + "WHERE table_schema = DATABASE() AND table_name = 'usuarios' AND column_name = 'ciudad'",
                Integer.class);
        if (ciudadExiste != null && ciudadExiste == 0) {
            jdbcTemplate.execute("ALTER TABLE usuarios ADD COLUMN ciudad VARCHAR(120) NULL");
        }
    }
}
