<?php
/**
 * ============================================================
 * ENDPOINT DE TELEMETRÍA GPS 1Hz & GESTIÓN DE FLOTA EN HOSTINGER
 * Dominio: https://zoltrak.websolutionsgarcia.com/
 * Archivo: api/telemetry.php
 * ============================================================
 */

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';
$pdo = getDBConnection();

// ============================================================
// METODO GET: Retorna la posición de todas las unidades y rutas para el mapa a pantalla completa
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $driverIdFilter = isset($_GET['driver_id']) ? (int)$_GET['driver_id'] : null;

    $stmt = $pdo->query("
        SELECT 
            d.id as driver_id,
            d.name as driver_name,
            d.phone,
            d.route_code,
            d.route_name,
            d.vehicle_plate,
            d.vehicle_model,
            d.status,
            d.current_lat,
            d.current_lng,
            d.current_speed_kmh,
            d.current_accel_g,
            d.heading_deg,
            d.eco_score,
            d.total_distance_km,
            d.fuel_consumed_liters,
            dev.device_uid,
            dev.device_model,
            dev.battery_level,
            dev.is_charging,
            dev.current_apk_version,
            dev.last_ping_at
        FROM drivers d
        LEFT JOIN devices dev ON d.id = dev.assigned_driver_id
        ORDER BY d.id ASC
    ");
    $fleet = $stmt->fetchAll();

    // Si se solicitó el recorrido detallado (trail) de un chofer específico:
    $trail = [];
    if ($driverIdFilter) {
        try {
            $stmtTrail = $pdo->prepare("
                SELECT latitude as lat, longitude as lng, speed_kmh as speed, recorded_at
                FROM telemetry_points
                WHERE driver_id = ?
                ORDER BY id DESC
                LIMIT 200
            ");
            $stmtTrail->execute([$driverIdFilter]);
            $trail = array_reverse($stmtTrail->fetchAll());
        } catch (Exception $e) {
            // Fallback si la tabla es telemetry_logs
            try {
                $stmtTrail = $pdo->prepare("
                    SELECT latitude as lat, longitude as lng, speed_kmh as speed, recorded_at
                    FROM telemetry_logs
                    WHERE driver_id = ?
                    ORDER BY id DESC
                    LIMIT 200
                ");
                $stmtTrail->execute([$driverIdFilter]);
                $trail = array_reverse($stmtTrail->fetchAll());
            } catch (Exception $e2) {}
        }
    }
    
    echo json_encode([
        "status" => "ok",
        "fleet" => $fleet,
        "selected_trail" => $trail,
        "total_active" => count($fleet),
        "timestamp" => date("Y-m-d H:i:s")
    ]);
    exit;
}

// ============================================================
// METODO POST: Ingestión de Paquete GPS enviado por los celulares
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);

    if (!$data || !isset($data['device_uid']) || !isset($data['lat']) || !isset($data['lng'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Payload incompleto (se requiere device_uid, lat, lng)"]);
        exit;
    }

    $deviceUid  = trim($data['device_uid']);
    $lat        = (float)$data['lat'];
    $lng        = (float)$data['lng'];
    $speed      = isset($data['speed']) ? (float)$data['speed'] : 0.0;
    $accelG     = isset($data['accel_g']) ? (float)$data['accel_g'] : 0.0;
    $heading    = isset($data['heading']) ? (int)$data['heading'] : 0;
    $battery    = isset($data['battery']) ? (int)$data['battery'] : 100;
    $isCharging = !empty($data['charging']) ? 1 : 0;
    $fuelRate   = isset($data['fuel_rate']) ? (float)$data['fuel_rate'] : 0.0;
    $apkVersion = isset($data['apk_version']) ? trim($data['apk_version']) : 'v1.0.0';

    // 1. Buscar o auto-registrar el teléfono
    $stmt = $pdo->prepare("SELECT id, assigned_driver_id, pending_command FROM devices WHERE device_uid = ? LIMIT 1");
    $stmt->execute([$deviceUid]);
    $device = $stmt->fetch();

    $pendingCommand = null;

    if (!$device) {
        $token = bin2hex(random_bytes(16));
        $ins = $pdo->prepare("
            INSERT INTO devices (device_uid, device_model, android_version, current_apk_version, battery_level, is_charging, api_auth_token, last_ping_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $ins->execute([$deviceUid, $data['model'] ?? 'Android Device', $data['os'] ?? 'Android 14', $apkVersion, $battery, $isCharging, $token]);
        $deviceId = (int)$pdo->lastInsertId();
        $driverId = null;
    } else {
        $deviceId = (int)$device['id'];
        $driverId = $device['assigned_driver_id'] ? (int)$device['assigned_driver_id'] : null;
        $pendingCommand = $device['pending_command'];

        $upd = $pdo->prepare("
            UPDATE devices 
            SET battery_level = ?, is_charging = ?, current_apk_version = ?, last_ping_at = NOW(), status = 'online'
            WHERE id = ?
        ");
        $upd->execute([$battery, $isCharging, $apkVersion, $deviceId]);

        // Limpiar el comando una vez despachado al teléfono
        if ($pendingCommand) {
            $clr = $pdo->prepare("UPDATE devices SET pending_command = NULL WHERE id = ?");
            $clr->execute([$deviceId]);
        }
    }

    // 2. Guardar en histórico de telemetría (1 Hz)
    try {
        $stmtLog = $pdo->prepare("
            INSERT INTO telemetry_points 
            (device_id, driver_id, latitude, longitude, speed_kmh, heading_deg, accel_g, fuel_rate_l_h, battery_level, is_charging, recorded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))
        ");
        $stmtLog->execute([$deviceId, $driverId, $lat, $lng, $speed, $heading, $accelG, $fuelRate, $battery, $isCharging]);
    } catch (Exception $e) {
        // Fallback si la tabla se llama telemetry_logs
        try {
            $stmtLog = $pdo->prepare("
                INSERT INTO telemetry_logs 
                (device_id, driver_id, latitude, longitude, speed_kmh, heading_deg, accel_g, fuel_rate_l_h, battery_level, is_charging, recorded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))
            ");
            $stmtLog->execute([$deviceId, $driverId, $lat, $lng, $speed, $heading, $accelG, $fuelRate, $battery, $isCharging]);
        } catch (Exception $e2) {
            error_log("Error insertando telemetría: " . $e2->getMessage());
        }
    }

    // 3. Actualizar la última posición en la tabla de choferes
    if ($driverId) {
        $status = 'en_ruta';
        if ($speed > 75) {
            $status = 'exceso_velocidad';
        } elseif ($speed == 0.0) {
            $status = 'detenido_ralenti';
        }

        $updDriver = $pdo->prepare("
            UPDATE drivers 
            SET current_lat = ?, current_lng = ?, current_speed_kmh = ?, current_accel_g = ?, heading_deg = ?, status = ?
            WHERE id = ?
        ");
        $updDriver->execute([$lat, $lng, $speed, $accelG, $heading, $status, $driverId]);
    }

    // 4. Confirmación y ACK hacia el celular Android con comandos remotos y versión activa OTA
    $stmtApk = $pdo->query("SELECT version_name, download_url, sha256_checksum FROM apk_releases WHERE is_active_production = 1 LIMIT 1");
    $activeApk = $stmtApk->fetch();

    echo json_encode([
        "status" => "ok",
        "ack" => true,
        "server_time" => date("Y-m-d H:i:s"),
        "sync_interval_sec" => 1,
        "supervisor_pin_hash" => "2026",
        "latest_apk" => $activeApk ?: null,
        "remote_command" => $pendingCommand // Si hay comando (OTA, reset cache, etc.)
    ]);
    exit;
}

http_response_code(405);
echo json_encode(["status" => "error", "message" => "Método no permitido"]);
