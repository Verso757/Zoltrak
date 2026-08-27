<?php
/**
 * ============================================================
 * PORTAL PRINCIPAL RUTACONTROL (MODULAR, FULLSCREEN MAP & MDM CONTROL)
 * Dominio: https://zoltrak.websolutionsgarcia.com/
 * Archivo: index.php
 * ============================================================
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');

require_once __DIR__ . '/config/db.php';

$dbError = null;
$drivers = [];
$devices = [];
$settings = [
    'supervisor_pin' => '2026',
    'telemetry_interval_sec' => 1,
    'speed_limit_kmh' => 70,
    'max_idle_minutes' => 10
];
$apkReleases = [];
$activeApk = null;

try {
    $pdo = getDBConnection();

    // Cargar Choferes y Dispositivos con manejo resiliente de columnas
    try {
        $stmtDrivers = $pdo->query("
            SELECT 
                d.*,
                dev.device_uid,
                dev.device_model,
                dev.battery_level,
                dev.is_charging,
                dev.current_apk_version,
                dev.status as device_status,
                dev.last_ping_at,
                dev.pending_command
            FROM drivers d
            LEFT JOIN devices dev ON d.id = dev.assigned_driver_id
            ORDER BY d.id ASC
        ");
        $drivers = $stmtDrivers->fetchAll();
    } catch (Exception $eCol) {
        // Si falta la columna pending_command en MySQL, auto-crearla y reintentar
        try {
            $pdo->exec("ALTER TABLE devices ADD COLUMN pending_command TEXT NULL COMMENT 'Comando pendiente para MDM u OTA'");
        } catch (Exception $ign) {}

        $stmtDrivers = $pdo->query("
            SELECT 
                d.*,
                dev.device_uid,
                dev.device_model,
                dev.battery_level,
                dev.is_charging,
                dev.current_apk_version,
                dev.status as device_status,
                dev.last_ping_at
            FROM drivers d
            LEFT JOIN devices dev ON d.id = dev.assigned_driver_id
            ORDER BY d.id ASC
        ");
        $drivers = $stmtDrivers->fetchAll();
    }

    // Cargar Todos los Dispositivos Enrolados
    $stmtDevices = $pdo->query("
        SELECT 
            dev.*,
            d.name as driver_name,
            d.vehicle_plate,
            d.route_code,
            d.route_name
        FROM devices dev
        LEFT JOIN drivers d ON dev.assigned_driver_id = d.id
        ORDER BY dev.last_ping_at DESC
    ");
    $devices = $stmtDevices->fetchAll();

    // Cargar Configuración
    $stmtSettings = $pdo->query("SELECT * FROM fleet_settings WHERE id = 1 LIMIT 1");
    $dbSettings = $stmtSettings->fetch();
    if ($dbSettings) {
        $settings = $dbSettings;
    }

    // Cargar Todas las APKs registradas
    $stmtApks = $pdo->query("SELECT * FROM apk_releases ORDER BY is_active_production DESC, version_code DESC");
    $apkReleases = $stmtApks->fetchAll();

    // APK Activa
    $activeApk = array_values(array_filter($apkReleases, fn($a) => $a['is_active_production'] == 1))[0] ?? ($apkReleases[0] ?? null);

} catch (Exception $e) {
    $dbError = $e->getMessage();
}

// Métricas de Resumen
$totalDrivers = count($drivers);
$activeDrivers = count(array_filter($drivers, fn($d) => $d['status'] !== 'fuera_servicio'));
$totalDistance = array_sum(array_column($drivers, 'total_distance_km'));
$totalFuel = array_sum(array_column($drivers, 'fuel_consumed_liters'));

// URL base del servidor
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
$host = $_SERVER['HTTP_HOST'];
$baseUrl = $protocol . $host;
?>
<!DOCTYPE html>
<html lang="es" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RutaControl - Centro de Comando de Flota &amp; MDM</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Leaflet CSS & JS para el Mapa en Vivo -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <!-- QRCode.js para generación de códigos QR de enrolamiento -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <style>
        .custom-driver-icon { background: transparent; border: none; }
        .tab-btn.active {
            background-color: #0f172a;
            color: #ffffff;
            border-color: #3b82f6;
        }
        /* Animación suave de pulso */
        @keyframes pulseGlow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .pulse-live { animation: pulseGlow 1.5s infinite; }
    </style>
</head>
<body class="bg-slate-900 text-slate-100 flex flex-col h-full font-sans antialiased overflow-hidden">

    <!-- ======================================================= -->
    <!-- BARRA SUPERIOR DE NAVEGACIÓN (HEADER & TABS)           -->
    <!-- ======================================================= -->
    <header class="bg-slate-950 border-b border-slate-800 z-50 flex-none px-4 lg:px-6">
        <div class="flex items-center justify-between h-14">
            
            <!-- Logo & Navegación -->
            <div class="flex items-center gap-4">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                        RC
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-bold tracking-tight text-white">RutaControl</span>
                            <span class="text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                1Hz Live
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Separador -->
                <div class="hidden md:block w-px h-6 bg-slate-800"></div>

                <!-- PESTAÑAS DE NAVEGACIÓN -->
                <nav class="flex items-center gap-1.5 text-xs font-semibold">
                    <button onclick="switchTab('mapTab')" id="btn-mapTab" class="tab-btn active px-3.5 py-1.5 rounded-lg border border-transparent transition-all flex items-center gap-1.5">
                        <span>🗺️</span> <span>Mapa en Vivo</span>
                    </button>
                    <button onclick="switchTab('devicesTab')" id="btn-devicesTab" class="tab-btn text-slate-400 hover:text-slate-200 hover:bg-slate-900 px-3.5 py-1.5 rounded-lg border border-transparent transition-all flex items-center gap-1.5">
                        <span>📱</span> <span>Dispositivos &amp; MDM</span>
                        <span class="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300"><?= count($devices) ?></span>
                    </button>
                    <button onclick="switchTab('apksTab')" id="btn-apksTab" class="tab-btn text-slate-400 hover:text-slate-200 hover:bg-slate-900 px-3.5 py-1.5 rounded-lg border border-transparent transition-all flex items-center gap-1.5">
                        <span>📦</span> <span>Gestor de APKs &amp; OTA</span>
                    </button>
                    <button onclick="switchTab('qrTab')" id="btn-qrTab" class="tab-btn text-slate-400 hover:text-slate-200 hover:bg-slate-900 px-3.5 py-1.5 rounded-lg border border-transparent transition-all flex items-center gap-1.5">
                        <span>📲</span> <span>QR Enrolamiento Kiosk</span>
                    </button>
                </nav>
            </div>

            <!-- Resumen Rápido Derecho -->
            <div class="flex items-center gap-4 text-xs">
                <?php if ($dbError): ?>
                <div class="flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-lg">
                    <span>⚠️ Error MySQL: <?= htmlspecialchars(substr($dbError, 0, 50)) ?>...</span>
                    <a href="test_diag.php" target="_blank" class="underline font-bold text-white ml-1">Ver Diagnóstico</a>
                </div>
                <?php endif; ?>
                <div class="hidden xl:flex items-center gap-4 text-slate-400">
                    <div>Unidades: <b class="text-white"><?= $activeDrivers ?>/<?= $totalDrivers ?></b></div>
                    <div>Recorrido: <b class="text-white"><?= number_format($totalDistance, 1) ?> km</b></div>
                    <div>Combustible: <b class="text-white"><?= number_format($totalFuel, 1) ?> L</b></div>
                    <div>PIN Supervisor: <b class="font-mono text-indigo-400"><?= $settings['supervisor_pin'] ?></b></div>
                </div>
                <div class="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 pulse-live"></span>
                    <span class="font-mono text-[11px]">Hostinger Online</span>
                </div>
            </div>

        </div>
    </header>

    <!-- ======================================================= -->
    <!-- ÁREA DE CONTENIDO PRINCIPAL                             -->
    <!-- ======================================================= -->
    <main class="flex-1 relative w-full h-[calc(100vh-3.5rem)] overflow-hidden">

        <!-- ======================================================= -->
        <!-- SECCIÓN 1: MAPA A PANTALLA COMPLETA & TODAS LAS RUTAS   -->
        <!-- ======================================================= -->
        <div id="mapTab" class="tab-content w-full h-full relative">
            
            <!-- Contenedor del Mapa Leaflet Fullscreen -->
            <div id="fullFleetMap" class="w-full h-full bg-slate-950"></div>

            <!-- Panel Flotante Izquierdo: Lista de Rutas y Choferes -->
            <div class="absolute top-4 left-4 z-[1000] w-80 max-h-[calc(100%-2rem)] flex flex-col bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden">
                <div class="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
                    <div>
                        <h3 class="text-xs font-bold text-white uppercase tracking-wider">Flota en Ruta</h3>
                        <p class="text-[10px] text-slate-400">Rastreo simultáneo de todas las unidades</p>
                    </div>
                    <button onclick="resetMapView()" title="Ver toda la flota" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold rounded border border-slate-700 transition-colors">
                        Ver Todos
                    </button>
                </div>

                <!-- Lista Desplazable de Choferes -->
                <div class="overflow-y-auto p-2 space-y-1.5 flex-1 max-h-[420px]" id="fleetDriverList">
                    <?php foreach ($drivers as $d): ?>
                        <div id="driverCard-<?= $d['id'] ?>" onclick="selectDriver(<?= $d['id'] ?>, <?= $d['current_lat'] ?>, <?= $d['current_lng'] ?>, '<?= htmlspecialchars($d['name']) ?>')" class="driver-item p-2.5 rounded-lg border border-slate-800 hover:border-indigo-500 bg-slate-950/40 hover:bg-slate-800/60 transition-all cursor-pointer">
                            <div class="flex items-center justify-between mb-1">
                                <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full <?= $d['status'] === 'en_ruta' ? 'bg-emerald-400 pulse-live' : ($d['status'] === 'en_cliente' ? 'bg-purple-400' : 'bg-amber-400') ?>"></span>
                                    <span class="font-bold text-xs text-white"><?= htmlspecialchars($d['name']) ?></span>
                                </div>
                                <span class="text-[10px] font-mono text-slate-400"><?= $d['vehicle_plate'] ?></span>
                            </div>
                            <div class="flex items-center justify-between text-[11px] text-slate-400">
                                <span><?= htmlspecialchars($d['route_name'] ?? $d['route_code']) ?></span>
                                <span class="font-semibold text-slate-200"><?= round($d['current_speed_kmh']) ?> km/h</span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>

                <!-- Footer del Panel con Indicadores de Color -->
                <div class="p-2.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-around text-[10px] text-slate-400">
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> En Ruta</span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-purple-400"></span> En Cliente</span>
                    <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-400"></span> Ralentí</span>
                </div>
            </div>

            <!-- Panel Flotante Derecho: Telemetría Detallada de la Unidad Seleccionada -->
            <div id="selectedDriverDetails" class="hidden absolute top-4 right-4 z-[1000] w-84 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-4 text-xs space-y-3">
                <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                        <h4 id="detailDriverName" class="font-bold text-sm text-white">Nombre Chofer</h4>
                        <span id="detailRoute" class="text-[11px] text-indigo-400 font-medium">Ruta Activa</span>
                    </div>
                    <button onclick="deselectDriver()" class="text-slate-400 hover:text-white text-lg font-bold">&times;</button>
                </div>

                <div class="grid grid-cols-3 gap-2 text-center">
                    <div class="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                        <span class="text-[9px] text-slate-400 block uppercase">Velocidad</span>
                        <b id="detailSpeed" class="text-sm text-white font-mono">0 km/h</b>
                    </div>
                    <div class="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                        <span class="text-[9px] text-slate-400 block uppercase">Batería</span>
                        <b id="detailBattery" class="text-sm text-emerald-400 font-mono">100%</b>
                    </div>
                    <div class="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                        <span class="text-[9px] text-slate-400 block uppercase">Eco Score</span>
                        <b id="detailEco" class="text-sm text-indigo-400 font-mono">92</b>
                    </div>
                </div>

                <div class="space-y-1 text-slate-300 text-[11px]">
                    <div class="flex justify-between py-1 border-b border-slate-800/60">
                        <span class="text-slate-400">Placa / Vehículo:</span>
                        <span id="detailVehicle" class="font-mono text-white">ABC-123</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-slate-800/60">
                        <span class="text-slate-400">Distancia Hoy:</span>
                        <span id="detailDistance" class="font-semibold text-white">0.0 km</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-slate-800/60">
                        <span class="text-slate-400">Combustible Est.:</span>
                        <span id="detailFuel" class="font-semibold text-white">0.0 L</span>
                    </div>
                    <div class="flex justify-between py-1">
                        <span class="text-slate-400">Versión APK:</span>
                        <span id="detailApk" class="font-mono text-slate-300">v1.0.0</span>
                    </div>
                </div>

                <!-- Acciones Rápidas MDM sobre el chofer -->
                <div class="pt-2 border-t border-slate-800 flex gap-2">
                    <button onclick="openDeviceControlModalForDriver()" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md">
                        <span>⚙️ Control Remoto &amp; Pantalla</span>
                    </button>
                </div>
            </div>

        </div>

        <!-- ======================================================= -->
        <!-- SECCIÓN 2: DISPOSITIVOS ENROLADOS & COMANDOS REMOTOS MDM-->
        <!-- ======================================================= -->
        <div id="devicesTab" class="tab-content hidden w-full h-full overflow-y-auto bg-slate-900 p-6">
            <div class="max-w-7xl mx-auto space-y-6">
                
                <!-- Encabezado de la Sección -->
                <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-lg">
                    <div>
                        <h2 class="text-lg font-bold text-white flex items-center gap-2">
                            <span>📱 Gestión de Terminales Móviles (MDM)</span>
                            <span class="px-2 py-0.5 rounded text-[11px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                                Device Owner Mode
                            </span>
                        </h2>
                        <p class="text-xs text-slate-400 mt-1">
                            Controla a distancia los celulares de la flota, visualiza la pantalla en tiempo real bajo demanda y ejecuta acciones de soporte sin interrumpir al chofer.
                        </p>
                    </div>

                    <!-- COMANDOS MASIVOS RÁPIDOS PARA TODA LA FLOTA -->
                    <div class="flex flex-wrap gap-2">
                        <button onclick="broadcastCategorizedCommand('INSTALL_APK_OTA', 'Actualizar APK en TODA la flota')" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5">
                            <span>🚀 OTA a Toda la Flota</span>
                        </button>
                        <button onclick="broadcastCategorizedCommand('CLEAR_APP_CACHE', 'Limpiar caché en TODOS los celulares')" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5">
                            <span>🧹 Limpiar Caché Masivo</span>
                        </button>
                        <button onclick="broadcastCategorizedCommand('REBOOT_DEVICE', 'Reiniciar TODOS los celulares de la flota')" class="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5">
                            <span>🔁 Reinicio Nocturno Masivo</span>
                        </button>
                    </div>
                </div>

                <!-- Resumen de Categorías de Comandos Disponibles -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <!-- Categoría 1 -->
                    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <div class="flex items-center gap-2 font-bold text-indigo-400">
                            <span>🚀</span> <span>1. Soporte &amp; Apps en Ruta</span>
                        </div>
                        <p class="text-[11px] text-slate-400 leading-relaxed">
                            Forzar actualizaciones OTA silenciosas, reiniciar apps trabadas y purgar memoria caché corrupta sin tocar el teléfono.
                        </p>
                    </div>
                    <!-- Categoría 2 -->
                    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <div class="flex items-center gap-2 font-bold text-rose-400">
                            <span>🔒</span> <span>2. Seguridad &amp; Antirrobo</span>
                        </div>
                        <p class="text-[11px] text-slate-400 leading-relaxed">
                            Bloqueo de pantalla con mensaje corporativo, sirena sonora de localización, modo taller temporal y borrado seguro de fábrica.
                        </p>
                    </div>
                    <!-- Categoría 3 -->
                    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <div class="flex items-center gap-2 font-bold text-emerald-400">
                            <span>⚙️</span> <span>3. Diagnóstico &amp; Hardware</span>
                        </div>
                        <p class="text-[11px] text-slate-400 leading-relaxed">
                            Calibración GNSS de alta precisión, reinicio del stack Bluetooth de impresoras térmicas y captura de pantalla bajo demanda.
                        </p>
                    </div>
                </div>

                <!-- Tabla de Dispositivos Enrolados -->
                <div class="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                    <div class="p-4 border-b border-slate-800 flex items-center justify-between">
                        <h3 class="text-sm font-bold text-white">Dispositivos Conectados en Tiempo Real</h3>
                        <span class="text-xs text-slate-400">Haz clic en <b>"Control &amp; Pantalla"</b> para gestionar una terminal individual</span>
                    </div>

                    <table class="w-full text-left text-xs text-slate-300">
                        <thead class="bg-slate-900/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                            <tr>
                                <th class="py-3 px-4">Dispositivo UID / Modelo</th>
                                <th class="py-3 px-4">Chofer Asignado</th>
                                <th class="py-3 px-4">Versión APK</th>
                                <th class="py-3 px-4">Batería &amp; Carga</th>
                                <th class="py-3 px-4">Último Ping 1Hz</th>
                                <th class="py-3 px-4 text-right">Acciones MDM</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60 font-sans" id="devicesTableBody">
                            <?php if (empty($devices)): ?>
                                <tr>
                                    <td colspan="6" class="text-center py-10 text-slate-500">
                                        No hay dispositivos registrados aún. Enrola tu primer celular escaneando el código QR en la pestaña "QR Enrolamiento Kiosk".
                                    </td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($devices as $dev): ?>
                                    <tr class="hover:bg-slate-900/50 transition-colors">
                                        <td class="py-3.5 px-4">
                                            <div class="font-mono font-bold text-white"><?= htmlspecialchars($dev['device_uid']) ?></div>
                                            <div class="text-[10px] text-slate-500"><?= htmlspecialchars($dev['device_model'] ?? 'Terminal Android') ?> (<?= $dev['android_version'] ?? 'Android 14' ?>)</div>
                                        </td>
                                        <td class="py-3.5 px-4">
                                            <div class="font-bold text-slate-200"><?= htmlspecialchars($dev['driver_name'] ?? 'Sin Chofer Asignado') ?></div>
                                            <div class="text-[10px] text-indigo-400"><?= htmlspecialchars($dev['vehicle_plate'] ?? '') ?> • <?= htmlspecialchars($dev['route_name'] ?? '') ?></div>
                                        </td>
                                        <td class="py-3.5 px-4">
                                            <span class="px-2 py-0.5 rounded font-mono text-[11px] <?= ($dev['current_apk_version'] === ($activeApk['version_name'] ?? '')) ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20' ?>">
                                                <?= htmlspecialchars($dev['current_apk_version'] ?? 'v1.0.0') ?>
                                            </span>
                                        </td>
                                        <td class="py-3.5 px-4">
                                            <div class="flex items-center gap-1.5">
                                                <div class="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
                                                    <div class="h-full <?= ($dev['battery_level'] ?? 100) < 25 ? 'bg-rose-500' : 'bg-emerald-500' ?>" style="width: <?= $dev['battery_level'] ?? 100 ?>%"></div>
                                                </div>
                                                <span class="font-mono text-xs font-semibold"><?= $dev['battery_level'] ?? 100 ?>% <?= !empty($dev['is_charging']) ? '⚡' : '' ?></span>
                                            </div>
                                        </td>
                                        <td class="py-3.5 px-4 text-[11px] text-slate-400 font-mono">
                                            <?= htmlspecialchars($dev['last_ping_at'] ?? 'Nunca') ?>
                                        </td>
                                        <td class="py-3.5 px-4 text-right">
                                            <button onclick="openDeviceControlModal('<?= $dev['device_uid'] ?>', '<?= htmlspecialchars($dev['driver_name'] ?? $dev['device_uid']) ?>', '<?= htmlspecialchars($dev['device_model'] ?? 'Android') ?>', '<?= $dev['current_apk_version'] ?? 'v1.0.0' ?>')" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-1 ml-auto">
                                                <span>⚙️ Control &amp; Pantalla</span>
                                            </button>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>

            </div>
        </div>

        <!-- ======================================================= -->
        <!-- SECCIÓN 3: GESTOR DE APKS & ACTUALIZACIONES OTA         -->
        <!-- ======================================================= -->
        <div id="apksTab" class="tab-content hidden w-full h-full overflow-y-auto bg-slate-900 p-6">
            <div class="max-w-6xl mx-auto space-y-6">
                
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <!-- Formulario de Subida Directa -->
                    <div class="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <div>
                            <h3 class="text-base font-bold text-white">Subir Nueva Versión APK</h3>
                            <p class="text-xs text-slate-400 mt-1">
                                Sube el archivo compilado <code class="text-indigo-400 bg-slate-900 px-1 py-0.5 rounded">app-debug.apk</code>. El servidor calculará su hash SHA-256 automáticamente para Android Enterprise.
                            </p>
                        </div>

                        <form id="uploadApkForm" onsubmit="handleUploadApk(event)" class="space-y-4">
                            <div>
                                <label class="block text-xs font-semibold text-slate-300 mb-1">Archivo APK (.apk)</label>
                                <input type="file" name="apk_file" id="apkFileInput" accept=".apk" required class="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer border border-slate-800 rounded-xl p-2 bg-slate-900" />
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-semibold text-slate-300 mb-1">Nombre Versión</label>
                                    <input type="text" name="version_name" value="v1.0.1" required class="w-full text-xs border border-slate-800 rounded-xl p-2.5 bg-slate-900 text-white focus:outline-none focus:border-indigo-500" placeholder="v1.0.1" />
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-slate-300 mb-1">Código Build</label>
                                    <input type="number" name="version_code" value="2" required class="w-full text-xs border border-slate-800 rounded-xl p-2.5 bg-slate-900 text-white focus:outline-none focus:border-indigo-500" placeholder="2" />
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-semibold text-slate-300 mb-1">Notas de Versión / Cambios</label>
                                <textarea name="changelog" rows="2" class="w-full text-xs border border-slate-800 rounded-xl p-2.5 bg-slate-900 text-white focus:outline-none focus:border-indigo-500" placeholder="Comandos remotos categorizados, soporte de pantalla bajo demanda y reconexión Bluetooth"></textarea>
                            </div>

                            <div class="flex items-center gap-2">
                                <input type="checkbox" name="set_active" id="setActiveCheck" value="1" checked class="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500">
                                <label for="setActiveCheck" class="text-xs text-slate-300 font-medium cursor-pointer">
                                    Activar inmediatamente en producción y propagar por OTA a la flota
                                </label>
                            </div>

                            <button type="submit" id="btnUploadSubmit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
                                <span>Subir APK &amp; Registrar Hash</span>
                            </button>
                            <div id="uploadStatusMsg" class="hidden text-xs p-3 rounded-xl"></div>
                        </form>
                    </div>

                    <!-- Lista de APKs Registradas -->
                    <div class="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-base font-bold text-white">Historial de Compilaciones</h3>
                                <p class="text-xs text-slate-400">Versiones almacenadas en <code class="text-slate-300 font-mono"><?= $baseUrl ?>/apks/</code></p>
                            </div>
                            <span class="text-xs font-mono px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                                <?= count($apkReleases) ?> Registradas
                            </span>
                        </div>

                        <div class="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                            <?php foreach ($apkReleases as $apk): ?>
                                <div class="p-4 border border-slate-800/80 rounded-xl bg-slate-900/60 space-y-2.5 hover:border-slate-700 transition-colors">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2.5">
                                            <span class="font-bold text-sm text-white"><?= htmlspecialchars($apk['version_name']) ?></span>
                                            <span class="text-[10px] font-mono text-slate-400">(Build <?= $apk['version_code'] ?>)</span>
                                            <?php if ($apk['is_active_production']): ?>
                                                <span class="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                                                    ● ACTIVA EN PRODUCCIÓN
                                                </span>
                                            <?php endif; ?>
                                        </div>
                                        <div class="flex gap-2">
                                            <?php if (!$apk['is_active_production']): ?>
                                                <button onclick="setActiveApk(<?= $apk['id'] ?>)" class="text-[11px] px-3 py-1 bg-slate-800 hover:bg-slate-700 font-semibold rounded-lg transition-colors text-slate-200">
                                                    Activar
                                                </button>
                                            <?php endif; ?>
                                            <a href="<?= htmlspecialchars($apk['download_url']) ?>" target="_blank" class="text-[11px] px-3 py-1 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-lg text-white transition-colors">
                                                Descargar
                                            </a>
                                        </div>
                                    </div>
                                    <div class="text-[11px] font-mono text-slate-300 break-all bg-slate-950 p-2.5 border border-slate-800 rounded-lg">
                                        <span class="text-slate-500 select-none">SHA-256: </span><?= htmlspecialchars($apk['sha256_checksum']) ?>
                                    </div>
                                    <div class="text-[11px] text-slate-400 flex justify-between">
                                        <span><?= htmlspecialchars($apk['changelog'] ?? 'Sin notas') ?></span>
                                        <span><?= date('d/M/Y H:i', strtotime($apk['created_at'])) ?></span>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- ======================================================= -->
        <!-- SECCIÓN 4: ENROLAMIENTO ZERO-TOUCH & CÓDIGO QR          -->
        <!-- ======================================================= -->
        <div id="qrTab" class="tab-content hidden w-full h-full overflow-y-auto bg-slate-900 p-6">
            <div class="max-w-5xl mx-auto bg-slate-950 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-2xl space-y-6">
                <div>
                    <h2 class="text-xl font-bold text-white mb-1">Enrolamiento Zero-Touch &amp; Device Owner</h2>
                    <p class="text-xs text-slate-400">
                        Escanear este código QR en el asistente de inicio de Android configura el teléfono como terminal corporativo Kiosco blindado.
                    </p>
                </div>

                <!-- Tarjetas de Políticas Activas -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div class="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs">
                        <div class="font-bold text-white mb-1">🚫 Cero Apps de Terceros</div>
                        <p class="text-[11px] text-slate-400">Play Store desactivado. Bloqueo total de descargas y APKs externos.</p>
                    </div>
                    <div class="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs">
                        <div class="font-bold text-white mb-1">📡 GPS y Datos Blindados</div>
                        <p class="text-[11px] text-slate-400">Imposible apagar datos móviles o ubicación GPS desde el teléfono.</p>
                    </div>
                    <div class="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs">
                        <div class="font-bold text-white mb-1">🖨️ Bluetooth Libre</div>
                        <p class="text-[11px] text-slate-400">Choferes enlazan impresoras térmicas de tickets directamente sin PIN.</p>
                    </div>
                    <div class="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs">
                        <div class="font-bold text-white mb-1">🧹 Limpieza de Caché</div>
                        <p class="text-[11px] text-slate-400">Atajo de un toque para liberar la app de ventas si se atora en ruta.</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-2">
                    <!-- QR Visual -->
                    <div class="md:col-span-5 bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center">
                        <div id="qrcodeContainer" class="bg-white p-4 rounded-xl border border-slate-200 shadow-xl mb-4"></div>
                        <span class="text-xs font-bold text-white mb-1">Escanear en Pantalla de Bienvenida ("Hola")</span>
                        <span class="text-[11px] text-indigo-400 font-mono"><?= $activeApk['version_name'] ?? 'Sin APK Activa' ?></span>
                    </div>

                    <!-- Instrucciones -->
                    <div class="md:col-span-7 space-y-4 text-xs">
                        <div class="bg-slate-900/70 p-4 rounded-xl border border-slate-800 space-y-2">
                            <h4 class="font-bold text-white text-sm">📱 Pasos de Aprovisionamiento:</h4>
                            <ol class="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
                                <li>Enciende el teléfono restaurado de fábrica en la pantalla "Hola".</li>
                                <li>Toca <b>6 veces seguidas</b> en cualquier espacio en blanco de la pantalla para abrir la cámara del lector QR de Android Enterprise.</li>
                                <li>Conéctate a una red Wi-Fi y apunta la cámara a este código QR. El celular descargará e instalará todo de forma autónoma.</li>
                            </ol>
                        </div>

                        <!-- Selector de Modo de Checksum -->
                        <div class="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
                            <label class="text-xs font-bold text-white block">Formato de Suma de Comprobación (Checksum):</label>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                <label class="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-indigo-500/50">
                                    <input type="radio" name="checksumMode" value="base64" checked onchange="regenerateQr()" class="text-indigo-500">
                                    <span>
                                        <b class="text-indigo-300 block">Base64 URL-Safe (Oficial Android)</b>
                                        <span class="text-slate-400 text-[10px]">Formato exacto de Android Enterprise DPC</span>
                                    </span>
                                </label>
                                <label class="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-indigo-500/50">
                                    <input type="radio" name="checksumMode" value="none" onchange="regenerateQr()" class="text-indigo-500">
                                    <span>
                                        <b class="text-emerald-300 block">HTTPS Directo (Sin Checksum)</b>
                                        <span class="text-slate-400 text-[10px]">Descarga segura 100% libre de errores</span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <div class="flex items-center justify-between mb-1.5">
                                <label class="text-xs font-bold text-slate-300">Payload JSON de Configuración:</label>
                                <button onclick="navigator.clipboard.writeText(document.getElementById('qrPayloadPre').innerText); alert('Copiado al portapapeles');" class="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300">
                                    Copiar JSON
                                </button>
                            </div>
                            <pre id="qrPayloadPre" class="bg-slate-950 text-emerald-400 p-3.5 rounded-xl text-[10px] font-mono overflow-x-auto max-h-40 border border-slate-800 leading-relaxed"></pre>
                        </div>
                    </div>
                </div>

            </div>
        </div>

    </main>

    <!-- ======================================================= -->
    <!-- MODAL DE CONTROL REMOTO & VISOR DE PANTALLA BAJO DEMANDA-->
    <!-- ======================================================= -->
    <div id="deviceControlModal" class="hidden fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <!-- Encabezado del Modal -->
            <div class="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-base">
                        📱
                    </div>
                    <div>
                        <h3 id="modalDeviceTitle" class="text-sm font-bold text-white">Consola de Control Remoto</h3>
                        <p id="modalDeviceSubtitle" class="text-[11px] text-slate-400 font-mono">UID: 0000000000</p>
                    </div>
                </div>
                <button onclick="closeDeviceControlModal()" class="text-slate-400 hover:text-white text-xl font-bold p-1">&times;</button>
            </div>

            <!-- Cuerpo del Modal (2 Columnas: Pantalla en Vivo vs Comandos Categorizados) -->
            <div class="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                <!-- COLUMNA IZQUIERDA: VISOR DE PANTALLA BAJO DEMANDA (ON-DEMAND) -->
                <div class="lg:col-span-5 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-between text-center">
                    <div class="w-full flex items-center justify-between mb-3">
                        <span class="text-xs font-bold text-slate-200">📸 Pantalla Bajo Demanda</span>
                        <span id="screenLiveBadge" class="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            En Espera (0 KB)
                        </span>
                    </div>

                    <!-- Marco del Celular con Pantalla -->
                    <div class="relative w-52 h-96 bg-slate-900 rounded-3xl border-4 border-slate-700 shadow-inner flex flex-col items-center justify-center overflow-hidden p-1.5 my-2">
                        <!-- Imagen de la Pantalla del Celular -->
                        <img id="modalScreenImg" src="" alt="Pantalla Remota" class="hidden w-full h-full object-cover rounded-2xl" />
                        
                        <!-- Placeholder cuando no hay captura activa -->
                        <div id="modalScreenPlaceholder" class="p-4 space-y-2 text-slate-500">
                            <span class="text-3xl block">🔒</span>
                            <p class="text-[11px] leading-relaxed">
                                Transmisión pausada para <b>no consumir datos móviles</b> del chofer.
                            </p>
                            <p class="text-[10px] text-indigo-400">
                                Presiona el botón inferior para solicitar un fotograma instantáneo.
                            </p>
                        </div>

                        <!-- Indicador de Carga -->
                        <div id="modalScreenLoading" class="hidden absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-xs text-indigo-300">
                            <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <span>Solicitando captura...</span>
                        </div>
                    </div>

                    <!-- Botonera de Control de Pantalla -->
                    <div class="w-full space-y-2 mt-2">
                        <button onclick="requestCurrentScreenSnapshot()" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5">
                            <span>📸 Capturar Pantalla Ahora</span>
                        </button>
                        <div class="flex items-center justify-between text-[10px] text-slate-400 px-1">
                            <span id="screenTimestamp">Sin capturas recientes</span>
                            <button onclick="toggleAutoRefreshScreen()" id="btnAutoRefresh" class="text-indigo-400 hover:text-indigo-300 underline font-medium">
                                Auto-Refresco: Desactivado
                            </button>
                        </div>
                    </div>
                </div>

                <!-- COLUMNA DERECHA: COMANDOS REMOTOS DIVIDIDOS POR SECCIONES -->
                <div class="lg:col-span-7 space-y-5">
                    
                    <!-- SECCIÓN 1: SOPORTE & APPS EN RUTA -->
                    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span class="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                                <span>🚀</span> <span>1. Soporte &amp; Apps en Ruta</span>
                            </span>
                            <span class="text-[10px] text-slate-500">Mantenimiento de Operación</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <button onclick="sendDeviceAction('INSTALL_APK_OTA')" class="p-2.5 bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/50 rounded-lg text-left transition-all">
                                <div class="font-bold text-white text-[11px] mb-0.5">🔄 Forzar OTA</div>
                                <div class="text-[10px] text-slate-400">Instala última APK activa</div>
                            </button>
                            <button onclick="sendDeviceAction('KILL_RESTART_SALES_APP')" class="p-2.5 bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/50 rounded-lg text-left transition-all">
                                <div class="font-bold text-white text-[11px] mb-0.5">⚡ Reiniciar App Ventas</div>
                                <div class="text-[10px] text-slate-400">Cierra y relanza el proceso</div>
                            </button>
                            <button onclick="sendDeviceAction('CLEAR_SALES_APP_CACHE')" class="p-2.5 bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/50 rounded-lg text-left transition-all">
                                <div class="font-bold text-white text-[11px] mb-0.5">🧹 Purgar Caché App Ventas</div>
                                <div class="text-[10px] text-slate-400">Exclusivo app ventas (no toca telemetría)</div>
                            </button>
                            <button onclick="sendDeviceAction('SYNC_SETTINGS')" class="p-2.5 bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/50 rounded-lg text-left transition-all">
                                <div class="font-bold text-white text-[11px] mb-0.5">📡 Sincronizar Reglas</div>
                                <div class="text-[10px] text-slate-400">Límites, PIN y GPS</div>
                            </button>
                        </div>
                    </div>

                    <!-- SECCIÓN 2: SEGURIDAD & ANTIRROBO -->
                    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span class="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                                <span>🔒</span> <span>2. Seguridad &amp; Antirrobo</span>
                            </span>
                            <span class="text-[10px] text-slate-500">Protección Corporativa</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <button onclick="sendDeviceAction('LOCK_KIOSK_FULL')" class="p-2.5 bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/50 rounded-lg text-left transition-all">
                                <div class="font-bold text-rose-300 text-[11px] mb-0.5">🚫 Bloquear Pantalla</div>
                                <div class="text-[10px] text-slate-400">Alerta roja corporativa</div>
                            </button>
                            <button onclick="sendDeviceAction('UNLOCK_KIOSK')" class="p-2.5 bg-slate-900 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-left transition-all">
                                <div class="font-bold text-emerald-300 text-[11px] mb-0.5">🟢 Desbloquear Kiosco</div>
                                <div class="text-[10px] text-slate-400">Restaura uso normal</div>
                            </button>
                            <button onclick="sendDeviceAction('PLAY_ALARM_SOUND')" class="p-2.5 bg-slate-900 hover:bg-amber-950/60 border border-slate-800 hover:border-amber-500/50 rounded-lg text-left transition-all">
                                <div class="font-bold text-amber-300 text-[11px] mb-0.5">🔊 Alarma Sonora (100%)</div>
                                <div class="text-[10px] text-slate-400">Sirena para localización</div>
                            </button>
                            <button onclick="sendDeviceAction('UNLOCK_EMERGENCY_PIN')" class="p-2.5 bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/50 rounded-lg text-left transition-all">
                                <div class="font-bold text-indigo-300 text-[11px] mb-0.5">🔓 Modo Taller (15 min)</div>
                                <div class="text-[10px] text-slate-400">Ajustes técnicos temporal</div>
                            </button>
                            <button onclick="confirmWipeDevice()" class="col-span-2 p-2.5 bg-rose-950/30 hover:bg-rose-950/80 border border-rose-500/40 rounded-lg text-left transition-all">
                                <div class="font-bold text-rose-400 text-[11px] mb-0.5">⚠️ Borrado Remoto de Fábrica (Wipe Total)</div>
                                <div class="text-[10px] text-slate-400">Destrucción segura de datos confidenciales ante robo comprobado</div>
                            </button>
                        </div>
                    </div>

                    <!-- SECCIÓN 3: DIAGNÓSTICO & HARDWARE -->
                    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                <span>⚙️</span> <span>3. Diagnóstico &amp; Hardware</span>
                            </span>
                            <span class="text-[10px] text-slate-500">Sensores y Antenas</span>
                        </div>
                        <div class="grid grid-cols-3 gap-2 text-xs">
                            <button onclick="sendDeviceAction('FORCE_GPS_HIGH_ACCURACY')" class="p-2 bg-slate-900 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-left transition-all">
                                <div class="font-bold text-white text-[11px]">🛰️ Calibrar GPS</div>
                                <div class="text-[9px] text-slate-400">Reinicio GNSS</div>
                            </button>
                            <button onclick="sendDeviceAction('RESET_BLUETOOTH_STACK')" class="p-2 bg-slate-900 hover:bg-emerald-950/60 border border-slate-800 hover:border-emerald-500/50 rounded-lg text-left transition-all">
                                <div class="font-bold text-white text-[11px]">🖨️ Reset Bluetooth</div>
                                <div class="text-[9px] text-slate-400">Impresora tickets</div>
                            </button>
                            <button onclick="sendDeviceAction('REBOOT_DEVICE')" class="p-2 bg-slate-900 hover:bg-amber-950/60 border border-slate-800 hover:border-amber-500/50 rounded-lg text-left transition-all">
                                <div class="font-bold text-amber-300 text-[11px]">🔁 Reiniciar Teléfono</div>
                                <div class="text-[9px] text-slate-400">Reboot SO</div>
                            </button>
                        </div>
                    </div>

                </div>

            </div>

        </div>
    </div>

    <!-- ======================================================= -->
    <!-- MOTOR JAVASCRIPT: MAPA, TELEMETRÍA 1Hz Y COMANDOS MDM   -->
    <!-- ======================================================= -->
    <script>
        // Sistema de Pestañas
        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.tab-btn').forEach(el => {
                el.classList.remove('active', 'bg-slate-950', 'text-white');
                el.classList.add('text-slate-400');
            });

            document.getElementById(tabId).classList.remove('hidden');
            const activeBtn = document.getElementById('btn-' + tabId);
            activeBtn.classList.add('active', 'bg-slate-950', 'text-white');
            activeBtn.classList.remove('text-slate-400');

            if (tabId === 'mapTab') {
                setTimeout(() => map.invalidateSize(), 200);
            }
        }

        // MAPA LEAFLET A PANTALLA COMPLETA
        const initialLat = <?= $drivers[0]['current_lat'] ?? 19.432608 ?>;
        const initialLng = <?= $drivers[0]['current_lng'] ?? -99.133209 ?>;

        const map = L.map('fullFleetMap', {
            zoomControl: false
        }).setView([initialLat, initialLng], 13);

        // Controles de zoom abajo a la derecha
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Capa Oscura Satelital/Moderna de CartoDB Dark
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            maxZoom: 19
        }).addTo(map);

        let driverMarkers = {};
        let driverTrailPolyline = null;
        let selectedDriverId = null;
        let activeModalDeviceUid = null;
        let autoRefreshInterval = null;

        // Actualizar marcadores de toda la flota en tiempo real
        function updateFleetMarkers(fleet) {
            fleet.forEach(d => {
                const lat = parseFloat(d.current_lat);
                const lng = parseFloat(d.current_lng);
                const color = d.status === 'en_ruta' ? '#10b981' : (d.status === 'en_cliente' ? '#8b5cf6' : '#f59e0b');

                const iconHtml = `
                    <div style="background: rgba(15, 23, 42, 0.95); border: 2px solid ${color}; border-radius: 9999px; padding: 4px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); font-size: 11px; font-weight: bold; color: white; white-space: nowrap; display: flex; align-items: center; gap: 6px; backdrop-filter: blur(4px);">
                        <span style="width: 8px; height: 8px; border-radius: 9999px; background: ${color}; display: inline-block;"></span>
                        <span>${d.driver_name}</span>
                        <span style="color: #94a3b8; font-size: 9px; font-family: monospace;">${Math.round(d.current_speed_kmh)} km/h</span>
                    </div>
                `;

                const customIcon = L.divIcon({
                    html: iconHtml,
                    className: 'custom-driver-icon',
                    iconSize: [140, 32],
                    iconAnchor: [70, 16]
                });

                if (driverMarkers[d.driver_id]) {
                    driverMarkers[d.driver_id].setLatLng([lat, lng]);
                    driverMarkers[d.driver_id].setIcon(customIcon);
                } else {
                    driverMarkers[d.driver_id] = L.marker([lat, lng], { icon: customIcon }).addTo(map);
                    driverMarkers[d.driver_id].on('click', () => {
                        selectDriver(d.driver_id, lat, lng, d.driver_name);
                    });
                }

                // Si este chofer está seleccionado, actualizar panel de detalles
                if (selectedDriverId === d.driver_id) {
                    document.getElementById('detailSpeed').innerText = Math.round(d.current_speed_kmh) + ' km/h';
                    document.getElementById('detailBattery').innerText = (d.battery_level || 100) + '%' + (d.is_charging ? ' ⚡' : '');
                    document.getElementById('detailEco').innerText = d.eco_score || 85;
                    document.getElementById('detailDistance').innerText = (d.total_distance_km || 0) + ' km';
                    document.getElementById('detailFuel').innerText = (d.fuel_consumed_liters || 0) + ' L';
                    document.getElementById('detailApk').innerText = d.current_apk_version || 'v1.0.0';
                }
            });
        }

        // Seleccionar un Chofer: Centrar mapa y dibujar recorrido
        async function selectDriver(driverId, lat, lng, name) {
            selectedDriverId = driverId;
            map.flyTo([lat, lng], 15, { duration: 0.8 });

            document.querySelectorAll('.driver-item').forEach(el => el.classList.remove('border-indigo-500', 'bg-indigo-950/40'));
            const activeCard = document.getElementById('driverCard-' + driverId);
            if (activeCard) activeCard.classList.add('border-indigo-500', 'bg-indigo-950/40');

            document.getElementById('selectedDriverDetails').classList.remove('hidden');
            document.getElementById('detailDriverName').innerText = name;

            // Cargar histórico de coordenadas (Trail) del chofer
            try {
                const res = await fetch(`api/telemetry.php?driver_id=${driverId}`);
                const data = await res.json();
                if (data.status === 'ok' && data.selected_trail) {
                    const latLngs = data.selected_trail.map(p => [parseFloat(p.lat), parseFloat(p.lng)]);
                    
                    if (driverTrailPolyline) {
                        map.removeLayer(driverTrailPolyline);
                    }
                    if (latLngs.length > 1) {
                        driverTrailPolyline = L.polyline(latLngs, {
                            color: '#6366f1',
                            weight: 4,
                            opacity: 0.8,
                            dashArray: '6, 8'
                        }).addTo(map);
                    }
                }
            } catch (err) {}
        }

        function deselectDriver() {
            selectedDriverId = null;
            document.getElementById('selectedDriverDetails').classList.add('hidden');
            if (driverTrailPolyline) {
                map.removeLayer(driverTrailPolyline);
                driverTrailPolyline = null;
            }
            document.querySelectorAll('.driver-item').forEach(el => el.classList.remove('border-indigo-500', 'bg-indigo-950/40'));
        }

        function resetMapView() {
            deselectDriver();
            const group = L.featureGroup(Object.values(driverMarkers));
            if (group.getLayers().length > 0) {
                map.fitBounds(group.getBounds().pad(0.1));
            }
        }

        // Cargar mapa inicial
        const initialFleet = <?= json_encode($drivers) ?>;
        updateFleetMarkers(initialFleet.map(d => ({
            driver_id: d.id,
            driver_name: d.name,
            current_lat: d.current_lat,
            current_lng: d.current_lng,
            current_speed_kmh: d.current_speed_kmh,
            vehicle_plate: d.vehicle_plate,
            route_code: d.route_code,
            status: d.status,
            battery_level: d.battery_level,
            is_charging: d.is_charging,
            eco_score: d.eco_score,
            total_distance_km: d.total_distance_km,
            fuel_consumed_liters: d.fuel_consumed_liters,
            current_apk_version: d.current_apk_version
        })));

        // Polling en tiempo real (1Hz)
        setInterval(async () => {
            try {
                const url = selectedDriverId ? `api/telemetry.php?driver_id=${selectedDriverId}` : 'api/telemetry.php';
                const res = await fetch(url);
                const data = await res.json();
                if (data.status === 'ok' && data.fleet) {
                    updateFleetMarkers(data.fleet);
                }
            } catch (err) {}
        }, 1500);

        // =======================================================
        // CONTROL REMOTO & VISOR DE PANTALLA BAJO DEMANDA
        // =======================================================
        function openDeviceControlModal(deviceUid, driverName, model, apkVersion) {
            activeModalDeviceUid = deviceUid;
            document.getElementById('modalDeviceTitle').innerText = `${driverName} (${model})`;
            document.getElementById('modalDeviceSubtitle').innerText = `UID: ${deviceUid} • APK: ${apkVersion}`;
            document.getElementById('deviceControlModal').classList.remove('hidden');

            // Reset de visor de pantalla
            document.getElementById('modalScreenImg').classList.add('hidden');
            document.getElementById('modalScreenPlaceholder').classList.remove('hidden');
            document.getElementById('screenLiveBadge').innerText = 'En Espera (0 KB)';
            document.getElementById('screenTimestamp').innerText = 'Sin capturas recientes';

            checkLatestScreenshot();
        }

        function openDeviceControlModalForDriver() {
            if (!selectedDriverId) return;
            const driver = initialFleet.find(d => d.id == selectedDriverId);
            if (driver && driver.device_uid) {
                openDeviceControlModal(driver.device_uid, driver.name, driver.device_model || 'Android', driver.current_apk_version || 'v1.0.0');
            } else {
                alert('Este chofer no tiene un dispositivo Android enrolado aún.');
            }
        }

        function closeDeviceControlModal() {
            document.getElementById('deviceControlModal').classList.add('hidden');
            activeModalDeviceUid = null;
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
                document.getElementById('btnAutoRefresh').innerText = 'Auto-Refresco: Desactivado';
            }
        }

        // Consultar la última foto en el servidor
        async function checkLatestScreenshot() {
            if (!activeModalDeviceUid) return;
            try {
                const res = await fetch(`api/devices.php?action=get_screenshot&device_uid=${activeModalDeviceUid}`);
                const data = await res.json();
                if (data.status === 'ok' && data.has_screenshot) {
                    const img = document.getElementById('modalScreenImg');
                    img.src = data.screenshot_url;
                    img.classList.remove('hidden');
                    document.getElementById('modalScreenPlaceholder').classList.add('hidden');
                    document.getElementById('screenLiveBadge').innerText = `Capturado (${data.age_seconds}s atrás)`;
                    document.getElementById('screenTimestamp').innerText = `Última toma: ${data.captured_at}`;
                }
            } catch (err) {}
        }

        // Solicitar Captura de Pantalla Bajo Demanda
        async function requestCurrentScreenSnapshot() {
            if (!activeModalDeviceUid) return;
            const loading = document.getElementById('modalScreenLoading');
            loading.classList.remove('hidden');

            try {
                const res = await fetch('api/devices.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'request_screenshot',
                        device_uid: activeModalDeviceUid
                    })
                });
                const data = await res.json();
                
                // Esperar 2 segundos a que el celular haga su ciclo de 1s y consultar
                setTimeout(async () => {
                    await checkLatestScreenshot();
                    loading.classList.add('hidden');
                }, 2200);

            } catch (e) {
                loading.classList.add('hidden');
                alert('Error al solicitar captura');
            }
        }

        function toggleAutoRefreshScreen() {
            const btn = document.getElementById('btnAutoRefresh');
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
                btn.innerText = 'Auto-Refresco: Desactivado';
                btn.classList.remove('text-emerald-400');
                btn.classList.add('text-indigo-400');
            } else {
                btn.innerText = 'Auto-Refresco: Activo (5s)';
                btn.classList.remove('text-indigo-400');
                btn.classList.add('text-emerald-400');
                requestCurrentScreenSnapshot();
                autoRefreshInterval = setInterval(() => {
                    requestCurrentScreenSnapshot();
                }, 5000);
            }
        }

        // Enviar Acción Individual a un Dispositivo
        async function sendDeviceAction(commandKey) {
            if (!activeModalDeviceUid) return;

            const commandLabels = {
                'INSTALL_APK_OTA': 'Forzar actualización silenciosa a la versión activa por OTA',
                'KILL_RESTART_SALES_APP': 'Forzar cierre y relanzamiento de la app de ventas',
                'CLEAR_APP_CACHE': 'Limpiar memoria temporal y caché de la app de ventas',
                'SYNC_SETTINGS': 'Sincronizar límites de velocidad, PIN y reglas',
                'LOCK_KIOSK_FULL': 'Bloquear la pantalla del dispositivo con alerta corporativa',
                'UNLOCK_KIOSK': 'Desbloquear el dispositivo y restaurar modo normal',
                'PLAY_ALARM_SOUND': 'Activar alarma sonora al 100% de volumen y vibración',
                'UNLOCK_EMERGENCY_PIN': 'Desbloquear temporalmente ajustes de Android por 15 min',
                'FORCE_GPS_HIGH_ACCURACY': 'Forzar calibración de alta precisión GNSS',
                'RESET_BLUETOOTH_STACK': 'Reiniciar antena Bluetooth para impresora térmica',
                'REBOOT_DEVICE': 'Reiniciar el sistema operativo del teléfono'
            };

            const label = commandLabels[commandKey] || commandKey;
            if (!confirm(`¿Confirmas enviar la instrucción: "${label}"?`)) return;

            try {
                const res = await fetch('api/devices.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: commandKey === 'INSTALL_APK_OTA' ? 'force_ota_update' : 'send_command',
                        command: commandKey,
                        device_uid: activeModalDeviceUid
                    })
                });
                const data = await res.json();
                alert(data.message);
            } catch (err) {
                alert('Error al enviar la orden al dispositivo');
            }
        }

        function confirmWipeDevice() {
            if (!activeModalDeviceUid) return;
            const code = prompt("⚠️ ACCIÓN IRREVERSIBLE ⚠️\nEsto borrará todos los datos de fábrica del celular de forma permanente.\nEscribe 'BORRAR' para confirmar:");
            if (code === 'BORRAR') {
                sendDeviceAction('WIPE_DEVICE_FACTORY');
            }
        }

        // Enviar Acción Masiva
        async function broadcastCategorizedCommand(commandKey, desc) {
            if (!confirm(`¿Confirmas enviar la orden: "${desc}" a TODA la flota activa?`)) return;
            try {
                const res = await fetch('api/devices.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: commandKey === 'INSTALL_APK_OTA' ? 'force_ota_update' : 'send_command',
                        command: commandKey
                    })
                });
                const data = await res.json();
                alert(data.message);
            } catch (err) {
                alert('Error al enviar comando a la flota');
            }
        }

        // Subida de APKs
        async function handleUploadApk(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            const statusDiv = document.getElementById('uploadStatusMsg');
            const submitBtn = document.getElementById('btnUploadSubmit');

            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Calculando SHA-256 y Subiendo...';
            statusDiv.className = 'text-xs p-3 rounded-xl bg-indigo-950 text-indigo-300 border border-indigo-500/30 block';
            statusDiv.innerText = 'Subiendo APK al servidor Hostinger...';

            try {
                const res = await fetch('api/upload_apk.php', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                if (data.status === 'ok') {
                    statusDiv.className = 'text-xs p-3 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500/30 block';
                    statusDiv.innerText = '✅ ' + data.message + ' (SHA-256 Verificado)';
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    statusDiv.className = 'text-xs p-3 rounded-xl bg-rose-950 text-rose-300 border border-rose-500/30 block';
                    statusDiv.innerText = '❌ Error: ' + data.message;
                }
            } catch (err) {
                statusDiv.className = 'text-xs p-3 rounded-xl bg-rose-950 text-rose-300 border border-rose-500/30 block';
                statusDiv.innerText = '❌ Error de conexión con el servidor.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Subir APK &amp; Registrar Hash';
            }
        }

        // Activar APK
        async function setActiveApk(apkId) {
            if (!confirm('¿Deseas activar esta versión como la principal y notificar a los celulares para actualización OTA?')) return;
            try {
                const res = await fetch('api/apks.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'set_active', apk_id: apkId })
                });
                const data = await res.json();
                if (data.status === 'ok') {
                    window.location.reload();
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (err) {
                alert('Error al activar versión');
            }
        }

        // Función para convertir Hex SHA-256 a Base64 URL-Safe requerido por Google Android Enterprise
        function hexToUrlSafeBase64(hex) {
            if (!hex || hex.length !== 64) return '';
            try {
                const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            } catch (e) {
                return '';
            }
        }

        // Generar Código QR de Enrolamiento Android Enterprise
        const activeDownloadUrl = "<?= addslashes($activeApk['download_url'] ?? ($baseUrl . '/apks/rutacontrol.apk')) ?>";
        const activeRawHex = "<?= addslashes($activeApk['sha256_checksum'] ?? '') ?>";
        let qrcodeInstance = null;

        function regenerateQr() {
            const selectedMode = document.querySelector('input[name="checksumMode"]:checked')?.value || 'base64';
            
            const qrJsonPayload = {
                "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.rutacontrol.telematics/.receivers.DeviceAdminPolicyReceiver",
                "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": activeDownloadUrl,
                "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": false,
                "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
                    "server_telemetry_url": "<?= $baseUrl ?>/api/telemetry.php",
                    "supervisor_pin": "<?= $settings['supervisor_pin'] ?>",
                    "telemetry_interval_sec": <?= $settings['telemetry_interval_sec'] ?>,
                    "speed_limit_kmh": <?= $settings['speed_limit_kmh'] ?>,
                    "allow_bluetooth_pairing": true
                }
            };

            if (selectedMode === 'base64' && activeRawHex) {
                const urlSafeBase64 = hexToUrlSafeBase64(activeRawHex);
                if (urlSafeBase64) {
                    qrJsonPayload["android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM"] = urlSafeBase64;
                }
            }

            const jsonStr = JSON.stringify(qrJsonPayload, null, 2);
            const preElem = document.getElementById('qrPayloadPre');
            if (preElem) preElem.innerText = jsonStr;

            const container = document.getElementById("qrcodeContainer");
            if (container) {
                container.innerHTML = '';
                new QRCode(container, {
                    text: JSON.stringify(qrJsonPayload),
                    width: 240,
                    height: 240,
                    colorDark : "#0f172a",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.M
                });
            }
        }

        // Inicializar QR al cargar
        regenerateQr();
    </script>
</body>
</html>
