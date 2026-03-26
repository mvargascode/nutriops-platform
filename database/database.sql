DROP DATABASE IF EXISTS casino_nutriops;
CREATE DATABASE casino_nutriops CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE casino_nutriops;

-- =========================================================
-- TABLA: unidades
-- =========================================================
CREATE TABLE unidades (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_unidades_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- TABLA: usuarios
-- =========================================================
CREATE TABLE usuarios (
  id INT NOT NULL AUTO_INCREMENT,
  rut VARCHAR(20) NULL,
  nombre VARCHAR(120) NOT NULL,
  unidad_id INT UNSIGNED NULL,
  email VARCHAR(120) NULL,
  username VARCHAR(60) NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'User',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  password_hash VARCHAR(255) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_rut (rut),
  UNIQUE KEY uq_usuarios_email (email),
  UNIQUE KEY uq_usuarios_username (username),
  KEY idx_usuarios_unidad_id (unidad_id),
  KEY idx_usuarios_rol (rol),
  KEY idx_usuarios_active (is_active),
  CONSTRAINT fk_usuarios_unidad
    FOREIGN KEY (unidad_id) REFERENCES unidades(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- TABLA: aforo
-- =========================================================
CREATE TABLE aforo (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  aforo_total INT NOT NULL DEFAULT 160,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- TABLA: auditoria_casino
-- =========================================================
CREATE TABLE auditoria_casino (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT NULL,
  accion VARCHAR(100) NOT NULL,
  entidad VARCHAR(100) NULL,
  entidad_id BIGINT NULL,
  detalle TEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auditoria_usuario_id (usuario_id),
  KEY idx_auditoria_accion (accion),
  KEY idx_auditoria_created_at (created_at),
  CONSTRAINT fk_auditoria_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- TABLA: consumos
-- tipo: 1 = desayuno, 2 = almuerzo, 3 = once
-- =========================================================
CREATE TABLE consumos (
  id INT NOT NULL AUTO_INCREMENT,
  fecha DATE NOT NULL,
  tipo TINYINT NOT NULL,
  usuario_id INT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_consumos_fecha (fecha),
  KEY idx_consumos_tipo (tipo),
  KEY idx_consumos_usuario_id (usuario_id),
  KEY idx_consumos_fecha_tipo (fecha, tipo),
  KEY idx_consumos_fecha_tipo_created (fecha, tipo, created_at),
  CONSTRAINT fk_consumos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT chk_consumos_tipo
    CHECK (tipo IN (1, 2, 3))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- TABLA: nutricion_diaria
-- tipo: 1 = desayuno, 2 = almuerzo, 3 = once
-- ALINEADA CON EXCEL (incluye porcion)
-- =========================================================
CREATE TABLE nutricion_diaria (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fecha DATE NOT NULL,
  tipo TINYINT NOT NULL,
  orden INT NOT NULL DEFAULT 1,
  item VARCHAR(255) NOT NULL,
  porcion VARCHAR(100) NULL,
  kcal DECIMAL(10,2) NULL,
  proteinas_g DECIMAL(10,2) NULL,
  grasas_g DECIMAL(10,2) NULL,
  carbohidratos_g DECIMAL(10,2) NULL,
  comentario VARCHAR(255) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_nutricion_fecha (fecha),
  KEY idx_nutricion_tipo (tipo),
  KEY idx_nutricion_fecha_tipo (fecha, tipo),
  KEY idx_nutricion_fecha_tipo_orden (fecha, tipo, orden),
  CONSTRAINT chk_nutricion_tipo
    CHECK (tipo IN (1, 2, 3))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- =========================================================
-- DATOS BASE
-- =========================================================

-- Aforo base
INSERT INTO aforo (id, aforo_total)
VALUES (1, 160);

-- Unidades demo mínimas
INSERT INTO unidades (nombre) VALUES
('Administración'),
('Recursos Humanos'),
('Nutrición');

-- =========================================================
-- MENÚ DEMO DE HOY (YA CON PORCION)
-- =========================================================
INSERT INTO nutricion_diaria
(fecha, tipo, orden, item, porcion, kcal, proteinas_g, grasas_g, carbohidratos_g, comentario)
VALUES
-- Desayuno
(CURDATE(), 1, 1, 'Café o té', '1 taza', 20, 0, 0, 5, 'Bebida caliente'),
(CURDATE(), 1, 2, 'Pan con jamón y queso', '1 unidad', 320, 14, 10, 42, 'Desayuno estándar'),

-- Almuerzo
(CURDATE(), 2, 1, 'Ensalada surtida', '1 porción', 120, 3, 5, 15, 'Entrada'),
(CURDATE(), 2, 2, 'Pollo al horno con arroz', '1 plato', 650, 38, 18, 70, 'Plato de fondo'),
(CURDATE(), 2, 3, 'Postre de fruta', '1 porción', 90, 1, 0, 22, 'Postre'),

-- Once
(CURDATE(), 3, 1, 'Té o café', '1 taza', 20, 0, 0, 5, 'Bebida caliente'),
(CURDATE(), 3, 2, 'Sándwich de ave', '1 unidad', 360, 20, 11, 40, 'Once estándar');

-- =========================================================
-- NOTA IMPORTANTE
-- Los usuarios demo NO se insertan aquí.
-- Ejecutar:
-- node scripts/seed-demo-users.js
-- =========================================================