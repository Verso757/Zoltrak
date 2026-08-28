<?php
/**
 * ============================================================
 * ENDPOINT DE GESTIÓN Y COMANDOS REMOTOS MDM & CAPTURA BAJO DEMANDA
 * Dominio: https://zoltrak.websolutionsgarcia.com/
 * Archivo: api/devices.php
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

// Asegurar carpeta para capturas de pantalla bajo demanda
$screenshotsDir = __DIR__ . '/../uploads/screenshots';
if (!is_dir($screenshotsDir)) {
    @mkdir($screenshotsDir, 0777, true);
}

// ============================================================
// METODO GET: Listar dispositivos o consultar captura de pantalla
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'list';

    // Obtener la última captura bajo demanda de un dispositivo
    if ($action === 'get_screenshot') {
        $deviceUid = $_GET['device_uid'] ?? '';
        $safeUid = preg_replace('/[^a-zA-Z0-9_\-]/', '', $deviceUid);
        $filePath = $screenshotsDir . '/' . $safeUid . '.jpg';

        if (file_exists($filePath)) {
            $updatedAt = date("Y-m-d H:i:s", filemtime($filePath));
            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
            $screenUrl = $protocol . $_SERVER['HTTP_HOST'] . '/uploads/screenshots/' . $safeUid . '.jpg?t=' . filemtime($filePath);

            echo json_encode([
                "status" => "ok",
                "has_screenshot" => true,
                "screenshot_url" => $screenUrl,
                "captured_at" => $updatedAt,
                "age_seconds" => time() - filemtime($filePath)
            ]);
        } else {
            echo json_encode([
                "status" => "ok",
                "has_screenshot" => false,
                "message" => "No hay captura disponible aún. Solicita una nueva captura."
            ]);
        }
        exit;
    }

    // Listar todos los dispositivos
    $stmt = $pdo->query("
        SELECT 
            dev.*,
            d.name as driver_name,
            d.vehicle_plate,
            d.route_code,
            d.route_name,
            d.status as driver_status,
            d.current_speed_kmh,
            d.current_lat,
            d.current_lng
        FROM devices dev
        LEFT JOIN drivers d ON dev.assigned_driver_id = d.id
        ORDER BY dev.last_ping_at DESC
    ");
    $devices = $stmt->fetchAll();

    echo json_encode([
        "status" => "ok",
        "devices" => $devices,
        "count" => count($devices)
    ]);
    exit;
}

// ============================================================
// METODO POST: Despacho de Comandos Remotos & Subida de Pantalla
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. Recepción de Captura de Pantalla enviada por el celular (Multipart o JSON Base64)
    if (isset($_FILES['screenshot']) && isset($_POST['device_uid'])) {
        $deviceUid = preg_replace('/[^a-zA-Z0-9_\-]/', '', $_POST['device_uid']);
        $target = $screenshotsDir . '/' . $deviceUid . '.jpg';
        if (move_uploaded_file($_FILES['screenshot']['tmp_name'], $target)) {
            echo json_encode(["status" => "ok", "message" => "Captura recibida con éxito"]);
        } else {
            echo json_encode(["status" => "error", "message" => "No se pudo guardar la captura"]);
        }
        exit;
    }

    // 2. Recepción de Comandos desde el Portal Web
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);

    if (!$data || !isset($data['action'])) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Acción no especificada"]);
        exit;
    }

    $action = $data['action'];
    $deviceUid = $data['device_uid'] ?? null;
    $command = $data['command'] ?? '';
    $extraPayload = $data['payload'] ?? '';

    // A. Forzar Actualización OTA
    if ($action === 'force_ota_update') {
        $stmtApk = $pdo->query("SELECT * FROM apk_releases WHERE is_active_production = 1 LIMIT 1");
        $activeApk = $stmtApk->fetch();

        if (!$activeApk) {
            echo json_encode(["status" => "error", "message" => "No hay una versión de APK activa en producción."]);
            exit;
        }

        $cmdStr = "INSTALL_APK_OTA:" . $activeApk['download_url'] . "|" . $activeApk['version_name'];
        if ($deviceUid) {
            $stmt = $pdo->prepare("UPDATE devices SET pending_command = ? WHERE device_uid = ?");
            $stmt->execute([$cmdStr, $deviceUid]);
            $msg = "Orden de actualización a " . $activeApk['version_name'] . " enviada al dispositivo $deviceUid.";
        } else {
            $stmt = $pdo->prepare("UPDATE devices SET pending_command = ?");
            $stmt->execute([$cmdStr]);
            $msg = "Orden de actualización a " . $activeApk['version_name'] . " enviada a TODA la flota.";
        }

        echo json_encode(["status" => "ok", "message" => $msg]);
        exit;
    }

    // B. Solicitar Captura de Pantalla Bajo Demanda (Ahorro de datos móviles)
    if ($action === 'request_screenshot') {
        if (!$deviceUid) {
            echo json_encode(["status" => "error", "message" => "Debes especificar el dispositivo."]);
            exit;
        }

        $stmt = $pdo->prepare("UPDATE devices SET pending_command = 'CAPTURE_SCREEN_SNAPSHOT' WHERE device_uid = ?");
        $stmt->execute([$deviceUid]);

        echo json_encode([
            "status" => "ok",
            "message" => "Petición de captura de pantalla enviada. El celular tomará la foto en su siguiente ciclo de 1s y la enviará al servidor."
        ]);
        exit;
    }

    // C. Enviar Comandos Remotos por Categorías
    if ($action === 'send_command') {
        $fullCmd = $command;
        if (!empty($extraPayload)) {
            $fullCmd .= ":" . $extraPayload;
        }

        if ($deviceUid) {
            $stmt = $pdo->prepare("UPDATE devices SET pending_command = ? WHERE device_uid = ?");
            $stmt->execute([$fullCmd, $deviceUid]);
            $msg = "Comando '$command' programado con éxito para el dispositivo $deviceUid.";
        } else {
            $stmt = $pdo->prepare("UPDATE devices SET pending_command = ?");
            $stmt->execute([$fullCmd]);
            $msg = "Comando masivo '$command' programado para TODA la flota.";
        }

        echo json_encode(["status" => "ok", "message" => $msg, "command" => $fullCmd]);
        exit;
    }

    echo json_encode(["status" => "error", "message" => "Acción no reconocida"]);
    exit;
}

// ============================================================
// METODO DELETE: Borrar dispositivo
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $uid = $_GET['device_uid'] ?? '';
    if ($uid) {
        // Obtenemos el ID
        $stmt = $pdo->prepare("SELECT id FROM devices WHERE device_uid = ?");
        $stmt->execute([$uid]);
        $dev = $stmt->fetch();
        if ($dev) {
            $devId = $dev['id'];
            try { $pdo->prepare("DELETE FROM telemetry_points WHERE device_id = ?")->execute([$devId]); } catch (Exception $e) {}
            try { $pdo->prepare("DELETE FROM telemetry_logs WHERE device_id = ?")->execute([$devId]); } catch (Exception $e) {}
            try { $pdo->prepare("DELETE FROM devices WHERE id = ?")->execute([$devId]); } catch (Exception $e) {}
        }
        echo json_encode(["status" => "ok", "message" => "Dispositivo borrado"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Falta device_uid"]);
    }
    exit;
}
