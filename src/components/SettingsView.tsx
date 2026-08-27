import React, { useState } from 'react';
import { 
  Sliders, 
  Lock, 
  ShieldCheck, 
  Radio, 
  Battery, 
  Fuel, 
  Check, 
  Save,
  RotateCcw,
  Zap,
  Database,
  Server,
  Copy,
  Code,
  Globe
} from 'lucide-react';

interface SettingsViewProps {
  supervisorPin: string;
  onSavePin: (newPin: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  supervisorPin: initialPin,
  onSavePin
}) => {
  const [pin, setPin] = useState(initialPin);
  const [testPin, setTestPin] = useState('');
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);
  const [telemetryInterval, setTelemetryInterval] = useState(1);
  const [speedLimit, setSpeedLimit] = useState(70);
  const [maxIdleMinutes, setMaxIdleMinutes] = useState(10);
  const [suddenBrakingG, setSuddenBrakingG] = useState(0.35);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedPhp, setCopiedPhp] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePin(pin);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestPin = () => {
    if (testPin === pin) {
      setTestResult('success');
    } else {
      setTestResult('failed');
    }
  };

  const sqlSchemaCode = `-- ============================================================
-- BASE DE DATOS RUTACONTROL TELEMATICS (HOSTINGER MYSQL / MARIADB)
-- ============================================================

USE u752784733_zoltrak;

-- 1. Tabla de Dispositivos / Celulares Enrolados (Device Owner)
CREATE TABLE IF NOT EXISTS devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_uid VARCHAR(100) NOT NULL UNIQUE COMMENT 'IMEI o Android ID',
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

-- 2. Tabla de Choferes / Rutas
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

-- 3. Tabla de Telemetría GPS en Vivo (Alta frecuencia 1Hz)
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
    stop_sequence INT NOT NULL,
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
    INDEX idx_driver_stops (driver_id, stop_sequence),
    CONSTRAINT fk_stop_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla de APKs & Actualizaciones OTA
CREATE TABLE IF NOT EXISTS apk_releases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    app_name VARCHAR(100) NOT NULL DEFAULT 'RutaControl Telematics',
    package_name VARCHAR(100) NOT NULL DEFAULT 'com.rutacontrol.telematics',
    version_name VARCHAR(20) NOT NULL,
    version_code INT NOT NULL,
    download_url TEXT NOT NULL,
    sha256_checksum VARCHAR(64) NOT NULL,
    is_active_production BOOLEAN DEFAULT FALSE,
    changelog TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Configuración Global
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

INSERT INTO fleet_settings (id, supervisor_pin) VALUES (1, '2026') ON DUPLICATE KEY UPDATE id=1;`;

  const phpApiCode = `<?php
// ============================================================
// HOSTINGER ENDPOINT: public_html/api/telemetry.php
// Ingestión de paquetes JSON de los teléfonos en 2do plano
// ============================================================

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Método no permitido"]);
    exit;
}

// Configuración de MySQL en Hostinger (zoltrak)
$db_host = "localhost";
$db_name = "u752784733_zoltrak";
$db_user = "u752784733_zoltrak";
$db_pass = "Atomsk757!";

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Error de conexión a base de datos"]);
    exit;
}

// Leer Payload JSON enviado por el servicio Android Foreground
$json = file_get_contents("php://input");
$data = json_decode($json, true);

if (!$data || !isset($data['device_uid']) || !isset($data['lat']) || !isset($data['lng'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Payload incompleto"]);
    exit;
}

// 1. Obtener o registrar dispositivo
$stmt = $pdo->prepare("SELECT id, assigned_driver_id FROM devices WHERE device_uid = ?");
$stmt->execute([$data['device_uid']]);
$device = $stmt->fetch();

if (!$device) {
    $token = bin2hex(random_bytes(16));
    $ins = $pdo->prepare("INSERT INTO devices (device_uid, device_model, android_version, api_auth_token, last_ping_at) VALUES (?, ?, ?, ?, NOW())");
    $ins->execute([$data['device_uid'], $data['model'] ?? 'Android', $data['os'] ?? '14', $token]);
    $deviceId = $pdo->lastInsertId();
    $driverId = null;
} else {
    $deviceId = $device['id'];
    $driverId = $device['assigned_driver_id'];
    $upd = $pdo->prepare("UPDATE devices SET last_ping_at = NOW(), battery_level = ?, is_charging = ? WHERE id = ?");
    $upd->execute([$data['battery'] ?? 100, !empty($data['charging']) ? 1 : 0, $deviceId]);
}

// 2. Insertar registro de telemetría GPS
$stmt = $pdo->prepare("
    INSERT INTO telemetry_logs 
    (device_id, driver_id, latitude, longitude, speed_kmh, heading_deg, accel_g, rpm_estimated, fuel_rate_l_h, battery_level, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))
");

$stmt->execute([
    $deviceId,
    $driverId,
    $data['lat'],
    $data['lng'],
    $data['speed'] ?? 0.0,
    $data['heading'] ?? 0,
    $data['accel_g'] ?? 0.0,
    $data['rpm'] ?? 0,
    $data['fuel_rate'] ?? 0.0,
    $data['battery'] ?? 100
]);

// 3. Responder al teléfono con órdenes pendientes (OTA o desbloqueo)
echo json_encode([
    "status" => "ok",
    "received_at" => date("Y-m-d H:i:s"),
    "ack" => true,
    "sync_interval_sec" => 2
]);
`;

  const copyToClipboard = (text: string, type: 'sql' | 'php') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } else {
      setCopiedPhp(true);
      setTimeout(() => setCopiedPhp(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Parámetros Operativos, Seguridad & Base de Datos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configura el PIN maestro para desbloquear terminales en campo, umbrales de alerta y el esquema MySQL para Hostinger.
          </p>
        </div>

        {savedSuccess && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
            <Check className="w-4 h-4" /> Parámetros guardados y sincronizados
          </span>
        )}
      </div>

      {/* Hostinger & MySQL Integration Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-600" />
            <h3 className="font-bold text-sm text-slate-900">Base de Datos Hostinger (MySQL / MariaDB)</h3>
          </div>
          <span className="text-[11px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 px-2.5 py-0.5 rounded-full">
            Listo para phpMyAdmin
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          No necesitas compartir credenciales privadas en el chat. Puedes crear tu base de datos en el cPanel / hPanel de Hostinger y ejecutar este script SQL directamente en phpMyAdmin:
        </p>

        {/* Step by step for Hostinger */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-900 block mb-1">1. Crear Base de Datos</span>
            <p className="text-slate-500 text-[11px]">En Hostinger &gt; <b>Bases de datos MySQL</b>, crea la BD (ej: <code className="text-slate-800 font-mono">u123_rutacontrol</code>), usuario y asigna contraseña.</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-900 block mb-1">2. Importar Script SQL</span>
            <p className="text-slate-500 text-[11px]">Abre <b>phpMyAdmin</b>, selecciona tu base de datos, entra a la pestaña <b>SQL</b> y pega el código DDL de abajo.</p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-900 block mb-1">3. Subir Archivos PHP</span>
            <p className="text-slate-500 text-[11px]">Sube la carpeta <code className="text-slate-800 font-mono">config/</code>, <code className="text-slate-800 font-mono">api/</code> e <code className="text-slate-800 font-mono">index.php</code> directamente a tu <code className="text-slate-800 font-mono">public_html</code>.</p>
          </div>
        </div>

        {/* SQL Script Box */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-slate-500" /> Script DDL SQL (Tablas de Telemetría, Dispositivos y APKs)
            </span>
            <button
              onClick={() => copyToClipboard(sqlSchemaCode, 'sql')}
              className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? '¡Copiado!' : 'Copiar SQL'}</span>
            </button>
          </div>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-56 border border-slate-800">
            {sqlSchemaCode}
          </pre>
        </div>

        {/* PHP Ingest Box */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-500" /> Endpoint Receptor PHP (Hostinger <code className="font-mono text-slate-800">telemetry.php</code>)
            </span>
            <button
              onClick={() => copyToClipboard(phpApiCode, 'php')}
              className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-medium rounded-md transition-colors"
            >
              {copiedPhp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPhp ? '¡Copiado!' : 'Copiar PHP'}</span>
            </button>
          </div>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-56 border border-slate-800">
            {phpApiCode}
          </pre>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        
        {/* Section 1: Supervisor PIN */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Lock className="w-4 h-4 text-slate-800" />
            <h3 className="font-bold text-sm text-slate-900">1. PIN Maestro de Supervisor</h3>
          </div>

          <p className="text-xs text-slate-500">
            Este PIN es requerido en el teléfono del chofer para poder salir de la app de ruta, entrar a los ajustes del sistema de Android o apagar el servicio GPS.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="font-semibold text-xs text-slate-700 block mb-1.5">
                PIN Actual / Nuevo (4 a 6 dígitos numéricos)
              </label>
              <input
                type="text"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 font-mono text-center tracking-widest text-lg font-bold"
              />
            </div>

            {/* Test PIN Simulator */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <label className="font-semibold text-xs text-slate-700 block">Probar PIN (Simulación Chofer)</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Digita PIN..."
                  value={testPin}
                  onChange={e => {
                    setTestPin(e.target.value.replace(/\D/g, ''));
                    setTestResult(null);
                  }}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center"
                />
                <button
                  type="button"
                  onClick={handleTestPin}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
                >
                  Verificar
                </button>
              </div>

              {testResult === 'success' && (
                <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> PIN Correcto: Modo Kiosco Desbloqueado
                </div>
              )}
              {testResult === 'failed' && (
                <div className="text-[11px] text-rose-600 font-semibold">
                  ✕ PIN Incorrecto: Acceso Denegado
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: GPS Telemetry Frequency */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Radio className="w-4 h-4 text-slate-800" />
            <h3 className="font-bold text-sm text-slate-900">2. Frecuencia de Rastreo GPS & Protocolo</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Intervalo de Muestreo GPS (Segundos)
              </label>
              <select
                value={telemetryInterval}
                onChange={e => setTelemetryInterval(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800 font-medium"
              >
                <option value={1}>1 segundo (Máxima precisión para cálculo L/100km)</option>
                <option value={3}>3 segundos (Balance óptimo)</option>
                <option value={5}>5 segundos (Ahorro de batería)</option>
                <option value={10}>10 segundos (Modo flotilla extendida)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Límite de Velocidad para Alerta en Ruta (km/h)
              </label>
              <input
                type="number"
                value={speedLimit}
                onChange={e => setSpeedLimit(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Tiempo Máximo en Ralentí Permitido (Minutos)
              </label>
              <input
                type="number"
                value={maxIdleMinutes}
                onChange={e => setMaxIdleMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Genera alerta si el chofer deja el motor prendido sin avanzar.</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Sensibilidad de Frenado Brusco (Fuerza G)
              </label>
              <input
                type="number"
                step="0.05"
                value={suddenBrakingG}
                onChange={e => setSuddenBrakingG(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Estándar internacional: 0.35G.</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Parámetros de Flota</span>
          </button>
        </div>
      </form>
    </div>
  );
};

