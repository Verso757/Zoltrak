<?php
/**
 * ============================================================
 * PORTAL PRINCIPAL RUTACONTROL (PHP 8 + TAILWIND + LEAFLET)
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

// Cargar APK Activa
$stmtApk = $pdo->query("SELECT * FROM apk_releases WHERE is_active_production = 1 LIMIT 1");
$activeApk = $stmtApk->fetch();

// Métricas de Resumen
$totalDrivers = count($drivers);
$activeDrivers = count(array_filter($drivers, fn($d) => $d['status'] !== 'fuera_servicio'));
$totalDistance = array_sum(array_column($drivers, 'total_distance_km'));
$totalFuel = array_sum(array_column($drivers, 'fuel_consumed_liters'));
$avgEco = $totalDrivers > 0 ? round(array_sum(array_column($drivers, 'eco_score')) / $totalDrivers) : 85;
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
    <style>
        .custom-driver-icon { background: transparent; border: none; }
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
                                Hostinger PHP / MySQL
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
                        <span class="text-slate-400 block text-[10px]">ECO-SCORE PROMEDIO</span>
                        <span class="font-bold text-emerald-700 text-sm"><?= $avgEco ?> / 100</span>
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

    <!-- Contenido Principal -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">

        <!-- Grid de Monitoreo -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

            <!-- Columna Izquierda: Mapa en Vivo (8 columnas) -->
            <div class="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col min-h-[480px]">
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
                <div id="fleetMap" class="w-full flex-1 rounded-lg border border-slate-200 min-h-[400px]"></div>
            </div>

            <!-- Columna Derecha: Lista de Choferes y Telemetría Instantánea (4 columnas) -->
            <div class="lg:col-span-4 space-y-4">
                <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                    <h3 class="text-sm font-bold text-slate-900 mb-3">Choferes & Unidades</h3>
                    
                    <div class="space-y-2.5" id="driversListContainer">
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
                    </div>
                </div>

                <!-- Tarjeta de APK de Producción -->
                <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-xs text-xs space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-slate-900">APK Activa en Servidor</span>
                        <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-mono text-[10px]">
                            <?= $activeApk['version_name'] ?? 'v2.4.1' ?>
                        </span>
                    </div>
                    <p class="text-slate-500 text-[11px]">
                        Los celulares con Device Owner descargan silenciosamente esta versión al encenderse o por OTA.
                    </p>
                    <a href="<?= htmlspecialchars($activeApk['download_url'] ?? '#') ?>" target="_blank" class="block text-center w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors text-xs">
                        Descargar APK (OTA)
                    </a>
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

    <!-- Script de Mapa & Sondeo en Vivo (1 Hz) -->
    <script>
        // Inicializar Mapa Leaflet
        const initialLat = <?= $drivers[0]['current_lat'] ?? 19.432608 ?>;
        const initialLng = <?= $drivers[0]['current_lng'] ?? -99.133209 ?>;
        
        const map = L.map('fleetMap').setView([initialLat, initialLng], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            maxZoom: 19
        }).addTo(map);

        const markers = {};

        // Función para renderizar y actualizar marcadores
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

        // Datos iniciales precargados desde PHP
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

        // Polling en Vivo a la API cada 2 segundos
        setInterval(async () => {
            try {
                const res = await fetch('api/telemetry.php');
                const data = await res.json();
                if (data.status === 'ok' && data.fleet) {
                    updateMapMarkers(data.fleet);
                }
            } catch (err) {
                console.log('Sincronizando...');
            }
        }, 2000);

        function focusDriver(driverId, lat, lng) {
            map.flyTo([lat, lng], 15, { duration: 0.6 });
        }
    </script>
</body>
</html>
