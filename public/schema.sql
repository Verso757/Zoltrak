-- ============================================================
-- BASE DE DATOS RUTACONTROL TELEMATICS (HOSTINGER MYSQL)
-- BD: u752784733_zoltrak
-- ============================================================

USE u752784733_zoltrak;

-- 1. Tabla de Dispositivos / Celulares Enrolados (Device Owner)
CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_uid VARCHAR(100) NOT NULL UNIQUE COMMENT 'IMEI o Android ID del teléfono',
    device_model VARCHAR(100) NOT NULL DEFAULT 'Android Device',
    android_version VARCHAR(30) NOT NULL DEFAULT 'Android 14',
    current_apk_version VARCHAR(20) DEFAULT 'v2.4.1',
    battery_level INT DEFAULT 100,
    is_charging BOOLEAN DEFAULT FALSE,
    last_ping_at DATETIME NULL,
    assigned_driver_id INT NULL,
    status ENUM('online', 'offline', 'warning', 'locked') DEFAULT 'online',
    monthly_data_mb DECIMAL(8,2) DEFAULT 0.00,
    api_auth_token VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_device_uid (device_uid),
    INDEX idx_last_ping (last_ping_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de Choferes y Unidades de Flota
CREATE TABLE IF NOT EXISTS drivers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NULL,
    route_code VARCHAR(50) NOT NULL COMMENT 'Ej: RUTA-NORTE-01',
    route_name VARCHAR(150) NOT NULL DEFAULT 'Ruta Principal',
    vehicle_plate VARCHAR(20) NOT NULL,
    vehicle_model VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(255) NULL,
    nominal_consumption_l100km DECIMAL(5,2) DEFAULT 11.50,
    supervisor_pin VARCHAR(6) DEFAULT '2026',
    status ENUM('en_ruta', 'en_cliente', 'detenido_ralenti', 'exceso_velocidad', 'fuera_servicio') DEFAULT 'en_ruta',
    current_lat DECIMAL(10,7) DEFAULT 19.432608,
    current_lng DECIMAL(10,7) DEFAULT -99.133209,
    current_speed_kmh DECIMAL(5,1) DEFAULT 0.0,
    current_accel_g DECIMAL(4,2) DEFAULT 0.00,
    heading_deg SMALLINT DEFAULT 0,
    eco_score INT DEFAULT 85,
    total_distance_km DECIMAL(8,2) DEFAULT 0.00,
    fuel_consumed_liters DECIMAL(8,2) DEFAULT 0.00,
    excess_fuel_liters DECIMAL(8,2) DEFAULT 0.00,
    idle_time_minutes INT DEFAULT 0,
    sudden_braking_count INT DEFAULT 0,
    sudden_accel_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de Logs de Telemetría GPS (Alta Frecuencia 1 Hz)
CREATE TABLE IF NOT EXISTS telemetry_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NOT NULL,
    driver_id INT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    speed_kmh DECIMAL(5,1) NOT NULL DEFAULT 0.0,
    heading_deg SMALLINT DEFAULT 0,
    accel_g DECIMAL(4,2) DEFAULT 0.00 COMMENT 'Fuerza G (+ aceleración, - frenado)',
    rpm_estimated INT DEFAULT 0,
    fuel_rate_l_h DECIMAL(6,3) DEFAULT 0.000 COMMENT 'Consumo instantáneo L/hora',
    battery_level TINYINT DEFAULT 100,
    is_charging BOOLEAN DEFAULT FALSE,
    recorded_at DATETIME(3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_device_recorded (device_id, recorded_at DESC),
    INDEX idx_driver_recorded (driver_id, recorded_at DESC),
    CONSTRAINT fk_telemetry_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de Clientes / Paradas de Ruta
CREATE TABLE IF NOT EXISTS route_stops (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT NOT NULL,
    stop_sequence INT NOT NULL DEFAULT 1,
    client_name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    geofence_radius_meters INT DEFAULT 60,
    scheduled_time VARCHAR(20) NULL,
    order_value DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('pendiente', 'en_atencion', 'completado', 'cancelado') DEFAULT 'pendiente',
    arrived_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_driver_stops (driver_id, stop_sequence),
    CONSTRAINT fk_stop_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla de APKs & Control de Versiones OTA
CREATE TABLE IF NOT EXISTS apk_releases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    app_name VARCHAR(100) NOT NULL DEFAULT 'RutaControl Telematics',
    package_name VARCHAR(100) NOT NULL DEFAULT 'com.rutacontrol.telematics',
    version_name VARCHAR(30) NOT NULL,
    version_code INT NOT NULL,
    download_url TEXT NOT NULL,
    sha256_checksum VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT DEFAULT 15000000,
    is_active_production BOOLEAN DEFAULT FALSE,
    is_mandatory_kiosk BOOLEAN DEFAULT TRUE,
    changelog TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabla de Configuración Global de Flota
CREATE TABLE IF NOT EXISTS fleet_settings (
    id INT PRIMARY KEY DEFAULT 1,
    supervisor_pin VARCHAR(6) NOT NULL DEFAULT '2026',
    telemetry_interval_sec INT NOT NULL DEFAULT 1,
    speed_limit_kmh INT NOT NULL DEFAULT 70,
    max_idle_minutes INT NOT NULL DEFAULT 10,
    sudden_braking_g DECIMAL(4,2) NOT NULL DEFAULT 0.35,
    wifi_ssid VARCHAR(100) DEFAULT 'RutaControl_Almacen_5G',
    wifi_password VARCHAR(100) DEFAULT 'Flota2026Secure!',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DATOS INICIALES LISTOS (SEED)
-- ============================================================

INSERT INTO fleet_settings (id, supervisor_pin, telemetry_interval_sec, speed_limit_kmh, max_idle_minutes, sudden_braking_g, wifi_ssid, wifi_password)
VALUES (1, '2026', 1, 70, 10, 0.35, 'RutaControl_Almacen_5G', 'Flota2026Secure!')
ON DUPLICATE KEY UPDATE id=1;

INSERT INTO apk_releases (app_name, package_name, version_name, version_code, download_url, sha256_checksum, is_active_production, changelog)
VALUES 
('RutaControl Telematics', 'com.rutacontrol.telematics', 'v2.4.1', 241, 'https://storage.googleapis.com/rutacontrol-apks/rutacontrol-telematics-v2.4.1.apk', '8f7a9d2e1b4c3f5a6b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a', 1, 'Servicio Foreground 1Hz, cálculo instantáneo de combustible, compatibilidad Android 14.'),
('AutoVenta Móvil Pro', 'com.empresa.ventas.movil', 'v3.1.2', 312, 'https://storage.googleapis.com/rutacontrol-apks/autoventa-pro-v3.1.2.apk', '9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d', 1, 'Facturación y cobranza en ruta.')
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO drivers (id, name, phone, route_code, route_name, vehicle_plate, vehicle_model, nominal_consumption_l100km, status, current_lat, current_lng, current_speed_kmh, eco_score, total_distance_km, fuel_consumed_liters)
VALUES 
(1, 'Carlos Mendoza', '+52 55 1234 5678', 'RUTA-NORTE-01', 'Ruta Industrial Norte', 'NZY-8492', 'Isuzu Elf 400', 11.5, 'en_ruta', 19.432608, -99.133209, 48.0, 88, 42.5, 5.1),
(2, 'Alejandro Rivera', '+52 55 8765 4321', 'RUTA-SUR-04', 'Ruta Cedis Sur', 'KLD-1934', 'Hino Serie 300', 12.0, 'en_cliente', 19.385000, -99.165000, 0.0, 92, 31.8, 3.8),
(3, 'Roberto Garza', '+52 55 5555 1212', 'RUTA-ORIENTE-02', 'Ruta Oriente Distribución', 'PXR-7721', 'Nissan NP300', 9.8, 'detenido_ralenti', 19.412000, -99.098000, 0.0, 74, 58.2, 7.6)
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO devices (id, device_uid, device_model, android_version, current_apk_version, battery_level, is_charging, assigned_driver_id, status, api_auth_token, last_ping_at)
VALUES 
(1, 'IMEI_864209048192837', 'Samsung Galaxy A15 Enterprise', 'Android 14', 'v2.4.1', 84, 1, 1, 'online', 'tok_carlos_mendoza_2026', NOW()),
(2, 'IMEI_869102938475610', 'Motorola Moto G24 Power', 'Android 14', 'v2.4.1', 62, 0, 2, 'online', 'tok_alejandro_rivera_2026', NOW()),
(3, 'IMEI_862910394857281', 'Xiaomi Redmi 13C Rugged', 'Android 13', 'v2.4.0', 95, 1, 3, 'online', 'tok_roberto_garza_2026', NOW())
ON DUPLICATE KEY UPDATE id=id;
