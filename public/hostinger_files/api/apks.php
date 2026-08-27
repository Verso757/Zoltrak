<?php
/**
 * ============================================================
 * ENDPOINT DE GESTION DE APKS & ACTUALIZACIONES SILENCIOSAS OTA
 * Archivo: api/apks.php
 * ============================================================
 */

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';
$pdo = getDBConnection();

// GET: Consultar la versión activa en producción (los teléfonos la consultan al encender)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query("
        SELECT id, app_name, package_name, version_name, version_code, download_url, sha256_checksum, is_active_production, is_mandatory_kiosk, changelog, created_at
        FROM apk_releases
        ORDER BY is_active_production DESC, version_code DESC
    ");
    $apks = $stmt->fetchAll();
    
    // Obtener la activa directamente
    $active = array_values(array_filter($apks, fn($a) => $a['is_active_production'] == 1))[0] ?? null;

    echo json_encode([
        "status" => "ok",
        "active_release" => $active,
        "all_releases" => $apks
    ]);
    exit;
}

// POST: Registrar una nueva versión de APK o activar una existente
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Payload JSON requerido"]);
    exit;
}

$action = $data['action'] ?? 'create';

if ($action === 'set_active') {
    $apkId = (int)$data['apk_id'];
    $pdo->query("UPDATE apk_releases SET is_active_production = FALSE");
    $stmt = $pdo->prepare("UPDATE apk_releases SET is_active_production = TRUE WHERE id = ?");
    $stmt->execute([$apkId]);
    echo json_encode(["status" => "ok", "message" => "Versión activada con éxito"]);
    exit;
}

if ($action === 'create') {
    $appName = trim($data['app_name'] ?? 'RutaControl Telematics');
    $pkg = trim($data['package_name'] ?? 'com.rutacontrol.telematics');
    $verName = trim($data['version_name'] ?? 'v2.4.2');
    $verCode = (int)($data['version_code'] ?? 242);
    $url = trim($data['download_url'] ?? '');
    $sha = trim($data['sha256_checksum'] ?? '');
    $changelog = trim($data['changelog'] ?? '');
    $setActive = !empty($data['is_active']);

    if (empty($url) || empty($sha)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "download_url y sha256_checksum son obligatorios"]);
        exit;
    }

    if ($setActive) {
        $pdo->query("UPDATE apk_releases SET is_active_production = FALSE WHERE package_name = " . $pdo->quote($pkg));
    }

    $stmt = $pdo->prepare("
        INSERT INTO apk_releases (app_name, package_name, version_name, version_code, download_url, sha256_checksum, is_active_production, changelog)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$appName, $pkg, $verName, $verCode, $url, $sha, $setActive ? 1 : 0, $changelog]);

    echo json_encode(["status" => "ok", "id" => $pdo->lastInsertId(), "message" => "APK registrada correctamente"]);
    exit;
}
