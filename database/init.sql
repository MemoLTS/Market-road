CREATE DATABASE IF NOT EXISTS db_usuarios
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS marketroad_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- La base db_soporte vive en su propio servidor MySQL (ver soporte/database/init.sql y el servicio mysql-soporte).

CREATE USER IF NOT EXISTS 'marketroad_app'@'%'
    IDENTIFIED BY 'marketroad_local_dev';

GRANT ALL PRIVILEGES ON db_usuarios.* TO 'marketroad_app'@'%';
GRANT ALL PRIVILEGES ON marketroad_db.* TO 'marketroad_app'@'%';
