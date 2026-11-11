-- db_usuarios
USE db_usuarios;
-- Cuentas creadas desde "Crear cuenta"
SELECT id, nombre, apellido, apodo, correo, ciudad, rol FROM usuarios ORDER BY id DESC LIMIT 20;

-- marketroad_db
USE marketroad_db;

-- Últimas publicaciones. `unidades` es 1 cuando no se indica otra cantidad.
SELECT id, titulo, precio, unidades, estado, usuario_id, vendedor_apodo, fecha_creacion, fecha_venta
FROM publicaciones ORDER BY id DESC LIMIT 20;

-- Publicaciones con más de una unidad a la venta
SELECT id, titulo, unidades FROM publicaciones WHERE unidades > 1 AND estado = 'ACTIVA';

-- Dashboard: publicaciones nuevas en los últimos 7 días (sin contar las eliminadas)
SELECT COUNT(*) AS nuevas_7_dias
FROM publicaciones
WHERE estado <> 'ELIMINADA' AND fecha_creacion >= NOW() - INTERVAL 7 DAY;

-- Dashboard: publicaciones cerradas en ventas en los últimos 7 días
SELECT COUNT(*) AS cerradas_en_ventas_7_dias
FROM publicaciones
WHERE estado = 'VENDIDA' AND fecha_venta >= NOW() - INTERVAL 7 DAY;

-- Totales por estado
SELECT estado, COUNT(*) AS cantidad FROM publicaciones GROUP BY estado;

-- Ventas cerradas (comprador, precio final y fecha)
SELECT id, titulo, comprador_id, precio_venta, fecha_venta
FROM publicaciones WHERE estado = 'VENDIDA' ORDER BY fecha_venta DESC;

-- Fotos y modalidades de entrega de una publicación (cambia el 1 por el id)
SELECT publicacion_id, posicion, tipo_contenido FROM publicacion_imagenes WHERE publicacion_id = 1;
SELECT * FROM publicacion_modalidades_entrega WHERE publicacion_id = 1;

-- Conversaciones y mensajes (chat y ofertas)
SELECT * FROM conversaciones ORDER BY id DESC LIMIT 10;
SELECT * FROM mensajes_conversacion ORDER BY id DESC LIMIT 20;

-- db_soporte
-- (conectado al servidor del puerto 3308)
-- USE db_soporte;
-- SELECT * FROM tickets ORDER BY id DESC LIMIT 20;
-- SELECT * FROM mensajes_ticket ORDER BY id DESC LIMIT 20;
