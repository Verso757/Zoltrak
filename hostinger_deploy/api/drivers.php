<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
require_once __DIR__ . '/../config/db.php';
$pdo = getDBConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query("SELECT * FROM drivers ORDER BY id DESC");
    echo json_encode(["status" => "ok", "drivers" => $stmt->fetchAll()]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    // Assign a device to a driver
    if (isset($data['action']) && $data['action'] === 'assign_device') {
        $driver_id = $data['driver_id'];
        $device_uid = $data['device_uid'];
        
        $pdo->prepare("UPDATE devices SET assigned_driver_id = ? WHERE device_uid = ?")->execute([$driver_id, $device_uid]);
        echo json_encode(["status" => "ok", "message" => "Dispositivo asignado correctamente"]);
        exit;
    }
    
    // Create new driver
    $name = $data['name'] ?? 'Nuevo Conductor';
    $phone = $data['phone'] ?? '';
    $plate = $data['vehicle_plate'] ?? '';
    
    $stmt = $pdo->prepare("INSERT INTO drivers (name, phone, vehicle_plate, status) VALUES (?, ?, ?, 'detenido_ralenti')");
    $stmt->execute([$name, $phone, $plate]);
    echo json_encode(["status" => "ok", "message" => "Conductor creado", "id" => $pdo->lastInsertId()]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = $_GET['id'] ?? 0;
    if ($id) {
        try { $pdo->prepare("UPDATE devices SET assigned_driver_id = NULL WHERE assigned_driver_id = ?")->execute([$id]); } catch (Exception $e) {}
        try { $pdo->prepare("DELETE FROM telemetry_points WHERE driver_id = ?")->execute([$id]); } catch (Exception $e) {}
        try { $pdo->prepare("DELETE FROM telemetry_logs WHERE driver_id = ?")->execute([$id]); } catch (Exception $e) {}
        try { $pdo->prepare("DELETE FROM drivers WHERE id = ?")->execute([$id]); } catch (Exception $e) {}
    }
    echo json_encode(["status" => "ok"]);
    exit;
}
