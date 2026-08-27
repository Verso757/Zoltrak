<?php
/**
 * ============================================================
 * ENDPOINT DE SUBIDA DIRECTA DE ARCHIVOS APK
 * Dominio: https://zoltrak.websolutionsgarcia.com/
 * Archivo: api/upload_apk.php
 * ============================================================
 */

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';
$pdo = getDBConnection();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Método no permitido. Utilice POST."]);
    exit;
}

if (!isset($_FILES['apk_file']) || $_FILES['apk_file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    $errorMsg = "No se recibió ningún archivo APK válido.";
    if (isset($_FILES['apk_file'])) {
        switch ($_FILES['apk_file']['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $errorMsg = "El archivo excede el tamaño máximo permitido por el servidor.";
                break;
            case UPLOAD_ERR_NO_FILE:
                $errorMsg = "No se seleccionó ningún archivo.";
                break;
        }
    }
    echo json_encode(["status" => "error", "message" => $errorMsg]);
    exit;
}

$file = $_FILES['apk_file'];
$fileName = basename($file['name']);
$fileExt = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

if ($fileExt !== 'apk') {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Solo se permiten archivos con extensión .apk"]);
    exit;
}

// Directorio destino en public_html/apks/
$targetDir = __DIR__ . '/../apks/';
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0755, true);
}

$safeFileName = preg_replace('/[^a-zA-Z0-9_\.-]/', '_', $fileName);
$targetFilePath = $targetDir . $safeFileName;

if (!move_uploaded_file($file['tmp_name'], $targetFilePath)) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Error al guardar el archivo en el servidor. Verifique permisos de escritura en la carpeta apks/."]);
    exit;
}

// Calcular Checksum SHA-256 automáticamente del archivo real subido
$sha256 = hash_file('sha256', $targetFilePath);
$fileSizeMb = round(filesize($targetFilePath) / (1024 * 1024), 2);

// Parámetros adicionales
$versionName = !empty($_POST['version_name']) ? trim($_POST['version_name']) : 'v1.0.0';
$versionCode = !empty($_POST['version_code']) ? (int)$_POST['version_code'] : 1;
$changelog = !empty($_POST['changelog']) ? trim($_POST['changelog']) : 'Compilación de producción subida al servidor.';
$setActive = isset($_POST['set_active']) && ($_POST['set_active'] === '1' || $_POST['set_active'] === 'true');

// URL pública de descarga directa
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
$host = $_SERVER['HTTP_HOST'];
$downloadUrl = $protocol . $host . '/apks/' . $safeFileName;

try {
    if ($setActive) {
        $pdo->query("UPDATE apk_releases SET is_active_production = 0");
    }

    $stmt = $pdo->prepare("
        INSERT INTO apk_releases (app_name, package_name, version_name, version_code, download_url, sha256_checksum, is_active_production, changelog)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        'RutaControl Telematics',
        'com.rutacontrol.telematics',
        $versionName,
        $versionCode,
        $downloadUrl,
        $sha256,
        $setActive ? 1 : 0,
        $changelog
    ]);

    $newId = $pdo->lastInsertId();

    echo json_encode([
        "status" => "ok",
        "message" => "APK subida y registrada exitosamente",
        "data" => [
            "id" => $newId,
            "file_name" => $safeFileName,
            "download_url" => $downloadUrl,
            "sha256_checksum" => $sha256,
            "size_mb" => $fileSizeMb,
            "version_name" => $versionName,
            "version_code" => $versionCode,
            "is_active_production" => $setActive
        ]
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Error al registrar en base de datos: " . $e->getMessage()]);
}
