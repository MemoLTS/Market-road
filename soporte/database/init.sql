-- Base de datos propia del microservicio de soporte (instancia MySQL dedicada: servicio "mysql-soporte").
-- Docker ejecuta este script solo la primera vez que se crea el volumen. Las tablas (tickets, mensajes_ticket,
-- personal_soporte) las crea el servicio al iniciar (spring.jpa.hibernate.ddl-auto=update).
-- El usuario y la contraseña los crea la imagen a partir de MYSQL_USER / MYSQL_PASSWORD (ver docker-compose.yml).
CREATE DATABASE IF NOT EXISTS db_soporte
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
