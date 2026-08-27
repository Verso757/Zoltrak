<?php
/**
 * ============================================================
 * PORTAL PRINCIPAL RUTACONTROL (PHP 8 + TAILWIND + LEAFLET + QR GENERATOR + APK UPLOADER)
 * Dominio: https://zoltrak.websolutionsgarcia.com/
 * Archivo: index.php
 * ============================================================
 */

require_once __DIR__ . '/config/db.php';
$pdo = getDBConnection();

// Cargar Choferes y Dispositivos
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

// Cargar Configuración
$stmtSettings = $pdo->query("SELECT * FROM fleet_settings WHERE id = 1 LIMIT 1");
$settings = $stmtSettings->fetch() ?: [
    'supervisor_pin' => '2026',
    'telemetry_interval_sec' => 1,
    'speed_limit_kmh' => 70,
    'max_idle_minutes' => 10
];

// Cargar Todas las APKs registradas
$stmtApks = $pdo->query("SELECT * FROM apk_releases ORDER BY is_active_production DESC, version_code DESC");
$apkReleases = $stmtApks->fetchAll();

// APK Activa
$activeApk = array_values(array_filter($apkReleases, fn($a) => $a['is_active_production'] == 1))[0] ?? ($apkReleases[0] ?? null);

// Métricas de Resumen
$totalDrivers = count($drivers);
$activeDrivers = count(array_filter($drivers, fn($d) => $d['status'] !== 'fuera_servicio'));
$totalDistance = array_sum(array_column($drivers, 'total_distance_km'));
$totalFuel = array_sum(array_column($drivers, 'fuel_consumed_liters'));
$avgEco = $totalDrivers > 0 ? round(array_sum(array_column($drivers, 'eco_score')) / $totalDrivers) : 85;

// URL base del servidor
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
$host = $_SERVER['HTTP_HOST'];
$baseUrl = $protocol . $host;
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RutaControl - Portal de Telemetría Hostinger</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Leaflet CSS & JS para el Mapa en Vivo -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <!-- QRCode.js para generación de códigos QR de enrolamiento -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <style>
        .custom-driver-icon { background: transparent; border: none; }
        .tab-btn.active { background-color: #0f172a; color: #ffffff; }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 flex flex-col min-h-screen font-sans antialiased">

    <!-- Header Corporativo -->
    <header class="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6">
            <div class="flex items-center justify-between h-16">
                <!-- Marca -->
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold shadow-xs">
                        RC
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h1 class="text-base font-bold text-slate-900 tracking-tight">RutaControl</h1>
                            <span class="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                Hostinger Production
                            </span>
                        </div>
                        <p class="text-xs text-slate-500">Telemetría GPS 1Hz • Android Enterprise Kiosk</p>
                    </div>
                </div>

                <!-- Resumen Superior de Flota -->
                <div class="hidden lg:flex items-center gap-6 text-xs">
                    <div class="text-right">
                        <span class="text-slate-400 block text-[10px]">UNIDADES ACTIVAS</span>
                        <span class="font-bold text-slate-800 text-sm"><?= $activeDrivers ?> / <?= $totalDrivers ?></span>
                    </div>
                    <div class="w-px h-7 bg-slate-200"></div>
                    <div class="text-right">
                        <span class="text-slate-400 block text-[10px]">DISTANCIA TOTAL</span>
                        <span class="font-bold text-slate-800 text-sm"><?= number_format($totalDistance, 1) ?> km</span>
                    </div>
                    <div class="w-px h-7 bg-slate-200"></div>
                    <div class="text-right">
                        <span class="text-slate-400 block text-[10px]">COMBUSTIBLE FLOTA</span>
                        <span class="font-bold text-slate-800 text-sm"><?= number_format($totalFuel, 1) ?> L</span>
                    </div>
                    <div class="w-px h-7 bg-slate-200"></div>
                    <div class="text-right">
                        <span class="text-slate-400 block text-[10px]">PIN SUPERVISOR</span>
                        <span class="font-mono font-bold text-indigo-600 text-sm"><?= $settings['supervisor_pin'] ?></span>
                    </div>
                </div>

                <!-- Indicador de Servidor -->
                <div class="flex items-center gap-2 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>MySQL Conectado</span>
                </div>
            </div>
        </div>
    </header>

    <!-- Barra de Navegación por Pestañas -->
    <div class="bg-white border-b border-slate-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2 py-2">
            <button onclick="switchTab('mapTab')" id="btn-mapTab" class="tab-btn active px-4 py-2 text-xs font-semibold rounded-lg transition-colors">
                🗺️ 1. Mapa en Tiempo Real (1Hz)
            </button>
            <button onclick="switchTab('apksTab')" id="btn-apksTab" class="tab-btn px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                📦 2. Subir & Gestionar APKs
            </button>
            <button onclick="switchTab('qrTab')" id="btn-qrTab" class="tab-btn px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                📲 3. Generador QR Enrolamiento (Device Owner)
            </button>
        </div>
    </div>

    <!-- Contenido Principal -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">

        <!-- ========================================== -->
        <!-- PESTAÑA 1: MAPA EN VIVO & FLOTA -->
        <!-- ========================================== -->
        <div id="mapTab" class="tab-content space-y-6">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

                <!-- Columna Izquierda: Mapa en Vivo (8 columnas) -->
                <div class="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-h-[520px]">
                    <div class="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                        <div>
                            <h2 class="text-sm font-bold text-slate-900">Mapa de Telemetría en Tiempo Real</h2>
                            <p class="text-xs text-slate-500">Actualización automática por API cada segundo (1 Hz)</p>
                        </div>
                        <div class="flex items-center gap-2 text-xs">
                            <span class="flex items-center gap-1 text-slate-600"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> En Ruta</span>
                            <span class="flex items-center gap-1 text-slate-600"><span class="w-2.5 h-2.5 rounded-full bg-purple-500"></span> En Cliente</span>
                            <span class="flex items-center gap-1 text-slate-600"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Ralentí</span>
                        </div>
                    </div>

                    <!-- Contenedor del Mapa Leaflet -->
                    <div id="fleetMap" class="w-full flex-1 rounded-lg border border-slate-200 min-h-[440px]"></div>
                </div>

                <!-- Columna Derecha: Lista de Choferes y Telemetría Instantánea (4 columnas) -->
                <div class="lg:col-span-4 space-y-4">
                    <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="text-sm font-bold text-slate-900">Choferes & Unidades</h3>
                            <span class="text-xs text-slate-400"><?= count($drivers) ?> registrados</span>
                        </div>
                        
                        <div class="space-y-2.5 max-h-[380px] overflow-y-auto pr-1" id="driversListContainer">
                            <?php if (empty($drivers)): ?>
                                <div class="text-center py-8 text-slate-400 text-xs">
                                    No hay choferes registrados aún.<br>Los nuevos dispositivos aparecerán aquí al transmitir.
                                </div>
                            <?php else: ?>
                                <?php foreach ($drivers as $d): ?>
                                    <div class="p-3 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors cursor-pointer bg-slate-50/50" onclick="focusDriver(<?= $d['id'] ?>, <?= $d['current_lat'] ?>, <?= $d['current_lng'] ?>)">
                                        <div class="flex items-center justify-between mb-1.5">
                                            <span class="font-bold text-xs text-slate-900"><?= htmlspecialchars($d['name']) ?></span>
                                            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full <?= $d['status'] === 'en_ruta' ? 'bg-emerald-100 text-emerald-800' : ($d['status'] === 'en_cliente' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800') ?>">
                                                <?= strtoupper(str_replace('_', ' ', $d['status'])) ?>
                                            </span>
                                        </div>
                                        
                                        <div class="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                                            <div>
                                                <span class="text-slate-400 block text-[9px]">VELOCIDAD</span>
                                                <span class="font-bold text-slate-800"><?= $d['current_speed_kmh'] ?> km/h</span>
                                            </div>
                                            <div>
                                                <span class="text-slate-400 block text-[9px]">PLACA</span>
                                                <span class="font-mono text-slate-800"><?= $d['vehicle_plate'] ?></span>
                                            </div>
                                            <div>
                                                <span class="text-slate-400 block text-[9px]">BATERÍA</span>
                                                <span class="font-bold <?= $d['battery_level'] < 25 ? 'text-rose-600' : 'text-slate-800' ?>"><?= $d['battery_level'] ?? 100 ?>% <?= !empty($d['is_charging']) ? '⚡' : '' ?></span>
                                            </div>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </div>
                    </div>

                    <!-- Tarjeta de APK Activa -->
                    <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs text-xs space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="font-bold text-slate-900">APK Activa en Producción</span>
                            <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-mono text-[10px]">
                                <?= $activeApk['version_name'] ?? 'Sin APK' ?>
                            </span>
                        </div>
                        <p class="text-slate-500 text-[11px]">
                            Los teléfonos enrolados descargan silenciosamente esta versión por actualización OTA.
                        </p>
                        <div class="flex gap-2">
                            <button onclick="switchTab('apksTab')" class="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg text-center transition-colors">
                                Subir Nueva
                            </button>
                            <button onclick="switchTab('qrTab')" class="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-center transition-colors">
                                Ver QR Enrolar
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- ========================================== -->
        <!-- PESTAÑA 2: GESTIÓN Y SUBIDA DE APKS -->
        <!-- ========================================== -->
        <div id="apksTab" class="tab-content hidden space-y-6">
            
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <!-- Formulario de Subida Directa -->
                <div class="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                    <h3 class="text-base font-bold text-slate-900">Subir Nuevo Archivo APK</h3>
                    <p class="text-xs text-slate-500">
                        Sube tu archivo <code class="bg-slate-100 px-1 py-0.5 rounded text-slate-700">app-debug.apk</code> o <code class="bg-slate-100 px-1 py-0.5 rounded text-slate-700">app-release.apk</code>. El servidor calculará su hash SHA-256 automáticamente.
                    </p>

                    <form id="uploadApkForm" onsubmit="handleUploadApk(event)" class="space-y-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">Archivo APK (.apk)</label>
                            <input type="file" name="apk_file" id="apkFileInput" accept=".apk" required class="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer border border-slate-200 rounded-lg p-2 bg-slate-50" />
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Nombre Versión</label>
                                <input type="text" name="version_name" value="v1.0.0" required class="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-900" placeholder="v1.0.0" />
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Código Versión</label>
                                <input type="number" name="version_code" value="1" required class="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-900" placeholder="1" />
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">Notas de la Versión / Changelog</label>
                            <textarea name="changelog" rows="2" class="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-900" placeholder="Compilación inicial con servicio GPS 1Hz y modo Kiosco"></textarea>
                        </div>

                        <div class="flex items-center gap-2">
                            <input type="checkbox" name="set_active" id="setActiveCheck" value="1" checked class="rounded border-slate-300 text-slate-900 focus:ring-slate-900">
                            <label for="setActiveCheck" class="text-xs text-slate-700 font-medium cursor-pointer">
                                Establecer como versión activa de producción inmediatamente
                            </label>
                        </div>

                        <button type="submit" id="btnUploadSubmit" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2">
                            <span>Subir APK y Registrar en Servidor</span>
                        </button>
                        <div id="uploadStatusMsg" class="hidden text-xs p-3 rounded-lg"></div>
                    </form>
                </div>

                <!-- Lista de APKs Existentes en el Servidor -->
                <div class="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                    <h3 class="text-base font-bold text-slate-900">Historial de Versiones Registradas</h3>
                    <p class="text-xs text-slate-500">Todas las compilaciones alojadas en <code class="bg-slate-100 px-1 py-0.5 rounded text-slate-700"><?= $baseUrl ?>/apks/</code></p>

                    <div class="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                        <?php foreach ($apkReleases as $apk): ?>
                            <div class="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <span class="font-bold text-sm text-slate-900"><?= htmlspecialchars($apk['version_name']) ?></span>
                                        <span class="text-[10px] font-mono text-slate-500">(Build <?= $apk['version_code'] ?>)</span>
                                        <?php if ($apk['is_active_production']): ?>
                                            <span class="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                                ● ACTIVA EN PRODUCCIÓN
                                            </span>
                                        <?php endif; ?>
                                    </div>
                                    <div class="flex gap-2">
                                        <?php if (!$apk['is_active_production']): ?>
                                            <button onclick="setActiveApk(<?= $apk['id'] ?>)" class="text-[11px] px-2.5 py-1 bg-slate-200 hover:bg-slate-300 font-semibold rounded transition-colors text-slate-800">
                                                Activar
                                            </button>
                                        <?php endif; ?>
                                        <a href="<?= htmlspecialchars($apk['download_url']) ?>" target="_blank" class="text-[11px] px-2.5 py-1 bg-slate-900 hover:bg-slate-800 font-semibold rounded text-white transition-colors">
                                            Descargar
                                        </a>
                                    </div>
                                </div>
                                <div class="text-[11px] font-mono text-slate-600 break-all bg-white p-2 border border-slate-200 rounded">
                                    <span class="text-slate-400 select-none">SHA-256: </span><?= htmlspecialchars($apk['sha256_checksum']) ?>
                                </div>
                                <div class="text-[11px] text-slate-500 flex justify-between">
                                    <span><?= htmlspecialchars($apk['changelog'] ?? 'Sin notas') ?></span>
                                    <span><?= date('d/M/Y H:i', strtotime($apk['created_at'])) ?></span>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>

        </div>

        <!-- ========================================== -->
        <!-- PESTAÑA 3: CÓDIGO QR ENROLAMIENTO KIOSK -->
        <!-- ========================================== -->
        <div id="qrTab" class="tab-content hidden space-y-6">
            <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <div class="max-w-3xl">
                    <h2 class="text-base font-bold text-slate-900 mb-1">Enrolamiento Zero-Touch & Device Owner (Android Kiosk)</h2>
                    <p class="text-xs text-slate-500 mb-6">
                        Este código QR aprovisiona automáticamente cualquier teléfono Android restaurado de fábrica para que descargue e instale la APK de producción activa, otorgándole permisos de Kiosco, bloqueo de reseteo y telemetría 1Hz indestructible.
                    </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    
                    <!-- Lado Izquierdo: QR Visual -->
                    <div class="md:col-span-5 bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center">
                        <div id="qrcodeContainer" class="bg-white p-4 rounded-lg border border-slate-200 shadow-xs mb-4"></div>
                        <span class="text-xs font-bold text-slate-800 mb-1">Escanear en Pantalla de Bienvenida</span>
                        <span class="text-[11px] text-slate-500 font-mono"><?= $activeApk['version_name'] ?? 'Sin versión' ?> (SHA256 Verificado)</span>
                    </div>

                    <!-- Lado Derecho: Instrucciones y Payload JSON -->
                    <div class="md:col-span-7 space-y-4">
                        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                            <h4 class="font-bold text-slate-900">📱 Cómo enrolar un celular nuevo en 3 pasos:</h4>
                            <ol class="list-decimal list-inside space-y-1.5 text-slate-600 text-[11px]">
                                <li>Enciende el teléfono Android en la pantalla inicial de bienvenida ("Hola" / "Start").</li>
                                <li>Toca <b>6 veces seguidas</b> en cualquier espacio vacío de la pantalla para abrir la cámara del lector QR de Android Enterprise.</li>
                                <li>Conéctalo a una red Wi-Fi y escanea este código QR. El celular descargará la APK de tu servidor y se configurará solo.</li>
                            </ol>
                        </div>

                        <div>
                            <div class="flex items-center justify-between mb-1.5">
                                <label class="text-xs font-bold text-slate-800">Payload JSON de Aprovisionamiento Android Enterprise:</label>
                                <button onclick="navigator.clipboard.writeText(document.getElementById('qrPayloadPre').innerText); alert('Copiado al portapapeles');" class="text-[11px] font-semibold text-slate-600 hover:text-slate-900">
                                    Copiar JSON
                                </button>
                            </div>
                            <pre id="qrPayloadPre" class="bg-slate-900 text-emerald-400 p-3 rounded-lg text-[10px] font-mono overflow-x-auto max-h-48 leading-relaxed"></pre>
                        </div>
                    </div>

                </div>
            </div>
        </div>

    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-200 bg-white py-4 px-4 sm:px-6 text-xs text-slate-500">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
                <span class="font-bold text-slate-700">RutaControl Telematics</span> &bull; Hostinger Direct PHP Engine
            </div>
            <div class="text-[11px] text-slate-400">
                PIN de Supervisor Activo: <b class="font-mono text-slate-800"><?= $settings['supervisor_pin'] ?></b>
            </div>
        </div>
    </footer>

    <!-- Script de Pestañas, Mapa & Lógica -->
    <script>
        // Pestañas
        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.tab-btn').forEach(el => {
                el.classList.remove('active', 'bg-slate-900', 'text-white');
                el.classList.add('text-slate-600');
            });

            document.getElementById(tabId).classList.remove('hidden');
            const activeBtn = document.getElementById('btn-' + tabId);
            activeBtn.classList.add('active', 'bg-slate-900', 'text-white');
            activeBtn.classList.remove('text-slate-600');

            if (tabId === 'mapTab') {
                setTimeout(() => map.invalidateSize(), 200);
            }
        }

        // Subida de APK
        async function handleUploadApk(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            const statusDiv = document.getElementById('uploadStatusMsg');
            const submitBtn = document.getElementById('btnUploadSubmit');

            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Subiendo y Calculando SHA-256...';
            statusDiv.className = 'text-xs p-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 block';
            statusDiv.innerText = 'Enviando archivo al servidor...';

            try {
                const res = await fetch('api/upload_apk.php', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                if (data.status === 'ok') {
                    statusDiv.className = 'text-xs p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 block';
                    statusDiv.innerText = '✅ ' + data.message + ' (SHA: ' + data.data.sha256_checksum.substring(0, 16) + '...)';
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    statusDiv.className = 'text-xs p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 block';
                    statusDiv.innerText = '❌ Error: ' + data.message;
                }
            } catch (err) {
                statusDiv.className = 'text-xs p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 block';
                statusDiv.innerText = '❌ Error de red al comunicarse con el servidor.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Subir APK y Registrar en Servidor';
            }
        }

        // Activar Versión
        async function setActiveApk(apkId) {
            if (!confirm('¿Deseas activar esta versión como la principal de producción?')) return;
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

        // Mapa Leaflet
        const initialLat = <?= $drivers[0]['current_lat'] ?? 19.432608 ?>;
        const initialLng = <?= $drivers[0]['current_lng'] ?? -99.133209 ?>;
        
        const map = L.map('fleetMap').setView([initialLat, initialLng], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            maxZoom: 19
        }).addTo(map);

        const markers = {};

        function updateMapMarkers(fleet) {
            fleet.forEach(d => {
                const lat = parseFloat(d.current_lat);
                const lng = parseFloat(d.current_lng);
                const color = d.status === 'en_ruta' ? '#10b981' : (d.status === 'en_cliente' ? '#8b5cf6' : '#f59e0b');

                const iconHtml = `
                    <div style="background: white; border: 2px solid ${color}; border-radius: 9999px; padding: 4px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); font-size: 11px; font-weight: bold; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
                        <span style="width: 8px; height: 8px; border-radius: 9999px; background: ${color}; display: inline-block;"></span>
                        <span>${d.driver_name}</span>
                        <span style="color: #64748b; font-size: 9px;">${Math.round(d.current_speed_kmh)} km/h</span>
                    </div>
                `;

                const customIcon = L.divIcon({
                    html: iconHtml,
                    className: 'custom-driver-icon',
                    iconSize: [120, 30],
                    iconAnchor: [60, 15]
                });

                if (markers[d.driver_id]) {
                    markers[d.driver_id].setLatLng([lat, lng]);
                    markers[d.driver_id].setIcon(customIcon);
                } else {
                    markers[d.driver_id] = L.marker([lat, lng], { icon: customIcon }).addTo(map);
                    markers[d.driver_id].bindPopup(`<b>${d.driver_name}</b><br>Placa: ${d.vehicle_plate}<br>Ruta: ${d.route_code}`);
                }
            });
        }

        const initialFleet = <?= json_encode($drivers) ?>;
        updateMapMarkers(initialFleet.map(d => ({
            driver_id: d.id,
            driver_name: d.name,
            current_lat: d.current_lat,
            current_lng: d.current_lng,
            current_speed_kmh: d.current_speed_kmh,
            vehicle_plate: d.vehicle_plate,
            route_code: d.route_code,
            status: d.status
        })));

        setInterval(async () => {
            try {
                const res = await fetch('api/telemetry.php');
                const data = await res.json();
                if (data.status === 'ok' && data.fleet) {
                    updateMapMarkers(data.fleet);
                }
            } catch (err) {}
        }, 2000);

        function focusDriver(driverId, lat, lng) {
            map.flyTo([lat, lng], 15, { duration: 0.6 });
        }

        // Generación del Código QR de Android Enterprise
        const activeDownloadUrl = "<?= addslashes($activeApk['download_url'] ?? ($baseUrl . '/apks/rutacontrol.apk')) ?>";
        const activeSha256 = "<?= addslashes($activeApk['sha256_checksum'] ?? 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') ?>";

        const qrJsonPayload = {
            "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.rutacontrol.telematics/.receivers.DeviceAdminPolicyReceiver",
            "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": activeDownloadUrl,
            "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM": activeSha256,
            "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true,
            "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
                "server_url": "<?= $baseUrl ?>/api/telemetry.php",
                "supervisor_pin": "<?= $settings['supervisor_pin'] ?>"
            }
        };

        const jsonString = JSON.stringify(qrJsonPayload, null, 2);
        document.getElementById('qrPayloadPre').innerText = jsonString;

        new QRCode(document.getElementById("qrcodeContainer"), {
            text: JSON.stringify(qrJsonPayload),
            width: 220,
            height: 220,
            colorDark: "#0f172a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });
    </script>
</body>
</html>
