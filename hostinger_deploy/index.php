<?php
/**
 * ============================================================
 * RUTA CONTROL - EXECUTIVE TELEMATICS & MDM PLATFORM
 * Dominio: https://zoltrak.websolutionsgarcia.com/
 * Archivo: index.php
 * ============================================================
 */

require_once __DIR__ . '/config/db.php';
$pdo = getDBConnection();

// Estadísticas iniciales de flota
$totalDevices = 0;
$activeNow = 0;
$movingNow = 0;
$offlineNow = 0;

try {
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM devices");
    $totalDevices = (int)($stmt->fetch()['total'] ?? 0);

    $stmt = $pdo->query("SELECT COUNT(*) as active FROM devices WHERE last_ping_at >= NOW() - INTERVAL 5 MINUTE");
    $activeNow = (int)($stmt->fetch()['active'] ?? 0);

    $stmt = $pdo->query("
        SELECT COUNT(*) as moving 
        FROM devices dev 
        JOIN drivers d ON dev.assigned_driver_id = d.id 
        WHERE dev.last_ping_at >= NOW() - INTERVAL 5 MINUTE AND d.current_speed_kmh > 5
    ");
    $movingNow = (int)($stmt->fetch()['moving'] ?? 0);

    $offlineNow = max(0, $totalDevices - $activeNow);
} catch (Exception $e) {
    // Si la BD aún no tiene tablas, se maneja fluidamente en el front
}
?>
<!DOCTYPE html>
<html lang="es" class="h-full bg-slate-50 text-slate-800 antialiased">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>RutaControl MDM • Monitoreo Ejecutivo de Flota</title>
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                        mono: ['"JetBrains Mono"', 'monospace'],
                    },
                    colors: {
                        brand: {
                            50: '#ecfdf5',
                            500: '#10b981',
                            600: '#059669',
                        },
                        dark: {
                            950: '#070a10',
                            900: '#0b0f19',
                            850: '#101623',
                            800: '#161f30',
                            700: '#222f46',
                            600: '#33435e',
                        }
                    }
                }
            }
        }
    </script>

    <!-- Leaflet CSS & JS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>

    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>

    <!-- QR Code Library -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>

    <style>
        body {
            font-feature-settings: "cv02", "cv03", "cv04", "cv11";
        }
        /* Custom Scrollbars */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: #0b0f19;
        }
        ::-webkit-scrollbar-thumb {
            background: #222f46;
            border-radius: 9999px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #33435e;
        }
        /* Map custom styling */
        .leaflet-container {
            background: #070a10 !important;
            font-family: inherit;
        }
        .custom-vehicle-marker {
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .pulse-ring {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
            animation: pulse-ring-anim 1.8s infinite cubic-bezier(0.66, 0, 0, 1);
        }
        @keyframes pulse-ring-anim {
            to {
                box-shadow: 0 0 0 16px rgba(16, 185, 129, 0);
            }
        }
        .hud-glass {
            background: rgba(16, 22, 35, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .subtle-border {
            border: 1px solid rgba(255, 255, 255, 0.07);
        }
    </style>
</head>
<body class="h-full flex flex-col overflow-hidden bg-white">

    <!-- ============================================================ -->
    <!-- TOP NAVIGATION BAR (Minimalist, Dense, High-Contrast) -->
    <!-- ============================================================ -->
    <header class="h-14 bg-white subtle-border border-b flex items-center justify-between px-4 z-40 shrink-0">
        <!-- Logo & Platform Identity -->
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/50">
                <i data-lucide="navigation" class="w-4 h-4 text-slate-900"></i>
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <span class="font-bold tracking-tight text-slate-900 text-sm">RUTACONTROL</span>
                    <span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-mono font-semibold uppercase tracking-wider border border-emerald-500/20">MDM 1.0</span>
                </div>
            </div>
        </div>

        <!-- Navigation Tabs -->
        <nav class="flex items-center gap-1 bg-slate-50/80 p-1 rounded-lg subtle-border">
            <button onclick="switchTab('map')" id="tab-btn-map" class="tab-btn px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 bg-slate-200 text-slate-900 shadow-sm">
                <i data-lucide="map" class="w-3.5 h-3.5 text-emerald-600"></i>
                <span>Mapa en Vivo</span>
            </button>
            <button onclick="switchTab('devices')" id="tab-btn-devices" class="tab-btn px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 text-slate-600 hover:text-slate-800">
                <i data-lucide="smartphone" class="w-3.5 h-3.5"></i>
                <span>Dispositivos</span>
                <span id="badge-total-devs" class="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-200 text-[10px] font-mono text-slate-600 font-bold"><?= $totalDevices ?></span>
            </button>
            <button onclick="switchTab('drivers')" id="tab-btn-drivers" class="tab-btn px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 text-slate-600 hover:text-slate-800">
                <i data-lucide="users" class="w-3.5 h-3.5"></i>
                <span>Conductores</span>
            </button>
            <button onclick="switchTab('apks')" id="tab-btn-apks" class="tab-btn px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 text-slate-600 hover:text-slate-800">
                <i data-lucide="download-cloud" class="w-3.5 h-3.5"></i>
                <span>Distribución OTA</span>
            </button>
            <button onclick="switchTab('diagnostics')" id="tab-btn-diagnostics" class="tab-btn px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 text-slate-600 hover:text-slate-800">
                <i data-lucide="activity" class="w-3.5 h-3.5"></i>
                <span>Salud del Servidor</span>
            </button>
        </nav>

        <!-- Right Side: Live Fleet Metrics Pill & System Clock -->
        <div class="flex items-center gap-3">
            <!-- Metric Pills -->
            <div class="hidden lg:flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg subtle-border font-mono text-xs">
                <div class="flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span id="metric-moving"><?= $movingNow ?></span> <span class="text-slate-600 font-sans font-normal text-[11px]">en ruta</span>
                </div>
                <span class="text-slate-700">|</span>
                <div class="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span id="metric-active"><?= $activeNow ?></span> <span class="text-slate-600 font-sans font-normal text-[11px]">en línea</span>
                </div>
                <span class="text-slate-700">|</span>
                <div class="flex items-center gap-1.5 text-slate-600 font-semibold">
                    <span class="w-2 h-2 rounded-full bg-slate-600"></span>
                    <span id="metric-offline"><?= $offlineNow ?></span> <span class="text-slate-500 font-sans font-normal text-[11px]">inactivos</span>
                </div>
            </div>

            <!-- Auto-refresh Indicator -->
            <div class="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md subtle-border">
                <i data-lucide="refresh-cw" id="sync-icon" class="w-3 h-3 text-emerald-600 transition-transform"></i>
                <span id="sync-timer" class="text-[11px]">1s</span>
            </div>
        </div>
    </header>

    <!-- ============================================================ -->
    <!-- MAIN APPLICATION CONTAINER -->
    <!-- ============================================================ -->
    <main class="flex-1 relative flex overflow-hidden">

        <!-- ============================================================ -->
        <!-- VIEW 1: LIVE MAP & TELEMETRY DASHBOARD -->
        <!-- ============================================================ -->
        <div id="view-map" class="app-view w-full h-full flex relative">
            
            <!-- Left Collapsible Sidebar: Fleet List & Search -->
            <aside id="fleet-sidebar" class="w-80 lg:w-96 bg-white/95 subtle-border border-r z-20 flex flex-col shrink-0 transition-all duration-300">
                <!-- Search & Filters -->
                <div class="p-3 border-b border-slate-300/50 space-y-2">
                    <div class="relative">
                        <i data-lucide="search" class="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-600"></i>
                        <input type="text" id="fleet-search" placeholder="Buscar chofer, placa, ruta o UID..." class="w-full bg-slate-50 text-xs text-slate-900 pl-9 pr-3 py-2 rounded-lg subtle-border focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500 font-mono">
                    </div>
                    
                    <!-- Filter Chips -->
                    <div class="flex items-center gap-1 text-[11px] font-medium">
                        <button onclick="setFilter('all')" id="filter-all" class="filter-chip px-2.5 py-1 rounded bg-slate-200 text-slate-900 subtle-border">Todos</button>
                        <button onclick="setFilter('moving')" id="filter-moving" class="filter-chip px-2.5 py-1 rounded text-slate-600 hover:text-slate-900 subtle-border">En Ruta</button>
                        <button onclick="setFilter('stopped')" id="filter-stopped" class="filter-chip px-2.5 py-1 rounded text-slate-600 hover:text-slate-900 subtle-border">Detenidos</button>
                        <button onclick="setFilter('offline')" id="filter-offline" class="filter-chip px-2.5 py-1 rounded text-slate-600 hover:text-slate-900 subtle-border">Sin Señal</button>
                    </div>
                </div>

                <!-- Devices / Units List -->
                <div id="fleet-items-container" class="flex-1 overflow-y-auto divide-y divide-slate-200 p-1.5 space-y-1">
                    <div class="p-8 text-center text-slate-600 text-xs">
                        <i data-lucide="loader" class="w-5 h-5 mx-auto animate-spin text-emerald-600 mb-2"></i>
                        Cargando telemetría de unidades...
                    </div>
                </div>

                <!-- Footer Summary -->
                <div class="p-2.5 bg-slate-50 border-t border-slate-200 text-[11px] font-mono text-slate-600 flex justify-between items-center">
                    <span id="fleet-count-summary">0 unidades registradas</span>
                    <button onclick="fitAllMarkers()" class="text-emerald-600 hover:underline flex items-center gap-1 font-sans">
                        <i data-lucide="maximize" class="w-3 h-3"></i> Encuadrar mapa
                    </button>
                </div>
            </aside>

            <!-- Map Center Canvas -->
            <div class="flex-1 relative h-full">
                <div id="map" class="w-full h-full"></div>

                <!-- Map Quick Controls Overlay (Top Right) -->
                <div class="absolute top-4 right-4 z-20 flex flex-col gap-2">
                    <button onclick="toggleMapLayer()" title="Alternar Mapa Satélite / Oscuro" class="hud-glass p-2.5 rounded-lg text-slate-700 hover:text-slate-900 transition-colors shadow-xl">
                        <i data-lucide="layers" class="w-4 h-4"></i>
                    </button>
                    <button onclick="fitAllMarkers()" title="Enfocar toda la flota" class="hud-glass p-2.5 rounded-lg text-slate-700 hover:text-slate-900 transition-colors shadow-xl">
                        <i data-lucide="crosshair" class="w-4 h-4"></i>
                    </button>
                </div>

                <!-- Floating Telemetry HUD / Driver Inspector (Bottom Right) -->
                <div id="telemetry-hud" class="hidden absolute bottom-4 right-4 z-20 w-96 hud-glass rounded-xl shadow-2xl p-4 transition-all duration-300">
                    <div class="flex items-start justify-between border-b border-slate-300 pb-3 mb-3">
                        <div class="flex items-center gap-2.5">
                            <div class="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
                                <i data-lucide="truck" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <h3 id="hud-driver-name" class="font-bold text-slate-900 text-sm leading-none">Unidad Sin Asignar</h3>
                                <p id="hud-vehicle-plate" class="text-xs text-slate-600 font-mono mt-1">PLACA: --- • RUTA: ---</p>
                            </div>
                        </div>
                        <button onclick="closeHud()" class="text-slate-600 hover:text-slate-900 p-1 rounded-md hover:bg-white/5">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>

                    <!-- Telemetry Meters Grid -->
                    <div class="grid grid-cols-3 gap-2 mb-3">
                        <div class="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 text-center">
                            <span class="text-[10px] text-slate-600 uppercase font-semibold">Velocidad</span>
                            <div class="text-lg font-bold font-mono text-emerald-600 mt-0.5" id="hud-speed">0 <span class="text-[10px] font-normal text-slate-600">km/h</span></div>
                        </div>
                        <div class="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 text-center">
                            <span class="text-[10px] text-slate-600 uppercase font-semibold">Batería</span>
                            <div class="text-lg font-bold font-mono text-cyan-600 mt-0.5" id="hud-battery">--%</div>
                        </div>
                        <div class="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 text-center">
                            <span class="text-[10px] text-slate-600 uppercase font-semibold">Consumo Est.</span>
                            <div class="text-lg font-bold font-mono text-amber-400 mt-0.5" id="hud-fuel">0.0 <span class="text-[10px] font-normal text-slate-600">L/h</span></div>
                        </div>
                    </div>

                    <!-- Details Row -->
                    <div class="space-y-1.5 text-xs text-slate-700 font-mono bg-slate-50/60 p-2.5 rounded-lg border border-slate-200 mb-3">
                        <div class="flex justify-between">
                            <span class="text-slate-600 font-sans">Dispositivo (UID):</span>
                            <span id="hud-device-uid" class="text-slate-900 font-bold">---</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-600 font-sans">Último Ping GPS:</span>
                            <span id="hud-last-ping" class="text-emerald-600">En vivo</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-600 font-sans">Fuerza G / Impacto:</span>
                            <span id="hud-g-force" class="text-slate-700">1.00 G (Normal)</span>
                        </div>
                    </div>

                    <!-- Quick MDM Action Bar -->
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="requestScreenshotFromHud()" class="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-300 transition-colors">
                            <i data-lucide="camera" class="w-3.5 h-3.5 text-cyan-600"></i> Captura Pantalla
                        </button>
                        <button onclick="openMdmModalFromHud()" class="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/50">
                            <i data-lucide="shield" class="w-3.5 h-3.5"></i> Comandos MDM
                        </button>
                    </div>
                </div>

            </div>
        </div>

        <!-- ============================================================ -->
        <!-- VIEW 2: DEVICES MANAGEMENT TABLE -->
        <!-- ============================================================ -->
        <div id="view-devices" class="app-view hidden w-full h-full p-6 overflow-y-auto bg-slate-50">
            <div class="max-w-7xl mx-auto space-y-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <h2 class="text-xl font-bold text-slate-900">Dispositivos y Teléfonos Registrados</h2>
                        <p class="text-xs text-slate-600 mt-0.5">Control de terminales móviles, versiones de APK instaladas y enlace de conductores</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="selectedDeviceUid='ALL_DEVICES'; openMdmModalFromHud();" class="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-950/50">
                            <i data-lucide="download" class="w-4 h-4"></i> Instalar APK a Todos
                        </button>
                        <button onclick="openEnrollmentQrModal()" class="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/50">
                            <i data-lucide="qr-code" class="w-4 h-4"></i> Código QR de Aprovisionamiento
                        </button>
                    </div>
                </div>

                <!-- Table Card -->
                <div class="bg-white rounded-xl subtle-border overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                            <thead class="bg-slate-50 text-slate-600 uppercase font-mono text-[10px] border-b border-slate-200">
                                <tr>
                                    <th class="px-4 py-3">Estado</th>
                                    <th class="px-4 py-3">Dispositivo / UID</th>
                                    <th class="px-4 py-3">Chofer Asignado</th>
                                    <th class="px-4 py-3">Vehículo / Placa</th>
                                    <th class="px-4 py-3">Versión APK</th>
                                    <th class="px-4 py-3">Último Enlace</th>
                                    <th class="px-4 py-3 text-right">Acciones MDM</th>
                                </tr>
                            </thead>
                            <tbody id="devices-table-body" class="divide-y divide-slate-200 font-mono">
                                <tr>
                                    <td colspan="7" class="px-4 py-8 text-center text-slate-600 font-sans">
                                        Cargando inventario de dispositivos...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- ============================================================ -->
        <!-- VIEW 3: DRIVERS & VEHICLES DIRECTORY -->
        <!-- ============================================================ -->
        <div id="view-drivers" class="app-view hidden w-full h-full p-6 overflow-y-auto bg-slate-50">
            <div class="max-w-7xl mx-auto space-y-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <h2 class="text-xl font-bold text-slate-900">Directorio de Conductores y Flota</h2>
                        <p class="text-xs text-slate-600 mt-0.5">Asignación de unidades, placas vehiculares y códigos de ruta comercial</p>
                    </div>
                    <button onclick="openNewDriverModal()" class="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors">
                        <i data-lucide="user-plus" class="w-4 h-4"></i> Registrar Conductor
                    </button>
                </div>

                <!-- Drivers Grid -->
                <div id="drivers-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div class="p-8 text-center text-slate-600 text-xs col-span-full">
                        Cargando plantilla de conductores...
                    </div>
                </div>
            </div>
        </div>

        <!-- ============================================================ -->
        <!-- VIEW 4: APK MANAGER & OTA DISTRIBUTION -->
        <!-- ============================================================ -->
        <div id="view-apks" class="app-view hidden w-full h-full p-6 overflow-y-auto bg-slate-50">
            <div class="max-w-5xl mx-auto space-y-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <h2 class="text-xl font-bold text-slate-900">Distribución y Actualización OTA de APKs</h2>
                        <p class="text-xs text-slate-600 mt-0.5">Sube nuevas compilaciones para que las terminales móviles se actualicen silenciosamente</p>
                    </div>
                </div>

                <!-- Upload Card -->
                <div class="bg-white rounded-xl subtle-border p-6 space-y-4">
                    <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <i data-lucide="upload-cloud" class="w-4 h-4 text-emerald-600"></i> Subir Nueva Versión de la Aplicación
                    </h3>
                    
                    <form id="apk-upload-form" enctype="multipart/form-data" class="space-y-4">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Nombre de Versión (Ej. 1.0.2)</label>
                                <input type="text" name="version_name" required placeholder="1.0.2" class="w-full bg-slate-50 text-xs text-slate-900 px-3 py-2 rounded-lg subtle-border font-mono">
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1">Código de Versión (Ej. 2)</label>
                                <input type="number" name="version_code" required placeholder="2" class="w-full bg-slate-50 text-xs text-slate-900 px-3 py-2 rounded-lg subtle-border font-mono">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold text-slate-700 mb-1">Archivo APK Compilado (.apk)</label>
                            <input type="file" name="apk_file" accept=".apk" required class="w-full bg-slate-50 text-xs text-slate-600 px-3 py-2 rounded-lg subtle-border file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-slate-900 hover:file:bg-emerald-500">
                        </div>

                        <button type="submit" id="btn-submit-apk" class="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-900 text-xs font-semibold flex items-center gap-2 transition-colors">
                            <i data-lucide="upload" class="w-4 h-4"></i> Publicar y Distribuir Actualización
                        </button>
                    </form>
                </div>

                <!-- APK History Table -->
                <div class="bg-white rounded-xl subtle-border overflow-hidden">
                    <div class="p-4 border-b border-slate-200">
                        <h3 class="text-sm font-bold text-slate-900">Historial de Versiones Publicadas</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs font-mono">
                            <thead class="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200">
                                <tr>
                                    <th class="px-4 py-3">Versión</th>
                                    <th class="px-4 py-3">Código</th>
                                    <th class="px-4 py-3">Archivo</th>
                                    <th class="px-4 py-3">Fecha de Subida</th>
                                    <th class="px-4 py-3">Estado</th>
                                    <th class="px-4 py-3 text-right">Descargar</th>
                                </tr>
                            </thead>
                            <tbody id="apks-table-body" class="divide-y divide-slate-200">
                                <tr>
                                    <td colspan="6" class="px-4 py-6 text-center text-slate-600 font-sans">
                                        Cargando versiones...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- ============================================================ -->
        <!-- VIEW 5: SERVER HEALTH & DIAGNOSTICS -->
        <!-- ============================================================ -->
        <div id="view-diagnostics" class="app-view hidden w-full h-full p-6 overflow-y-auto bg-slate-50">
            <div class="max-w-5xl mx-auto space-y-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                        <h2 class="text-xl font-bold text-slate-900">Diagnóstico y Estado del Servidor</h2>
                        <p class="text-xs text-slate-600 mt-0.5">Comprobación de conectividad MySQL, endpoints REST de telemetría y logs de entrada</p>
                    </div>
                    <button onclick="runServerDiagnostics()" class="px-3.5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 text-xs font-semibold flex items-center gap-1.5 border border-slate-300">
                        <i data-lucide="rotate-cw" class="w-4 h-4"></i> Volver a Ejecutar Diagnóstico
                    </button>
                </div>

                <!-- Diagnostic Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="bg-white p-4 rounded-xl subtle-border">
                        <span class="text-xs text-slate-600">Base de Datos MySQL</span>
                        <div class="text-lg font-bold text-emerald-600 mt-1 flex items-center gap-2" id="diag-db-status">
                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Conectada
                        </div>
                        <p class="text-[11px] text-slate-500 font-mono mt-1">Hostinger Database Active</p>
                    </div>

                    <div class="bg-white p-4 rounded-xl subtle-border">
                        <span class="text-xs text-slate-600">Endpoint Telemetría (1Hz)</span>
                        <div class="text-lg font-bold text-emerald-600 mt-1 flex items-center gap-2" id="diag-api-status">
                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> 200 OK
                        </div>
                        <p class="text-[11px] text-slate-500 font-mono mt-1">/api/telemetry.php</p>
                    </div>

                    <div class="bg-white p-4 rounded-xl subtle-border">
                        <span class="text-xs text-slate-600">Canal de Comandos MDM</span>
                        <div class="text-lg font-bold text-emerald-600 mt-1 flex items-center gap-2" id="diag-mdm-status">
                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Activo
                        </div>
                        <p class="text-[11px] text-slate-500 font-mono mt-1">/api/devices.php</p>
                    </div>
                </div>

                <!-- Recent Raw Telemetry Log Viewer -->
                <div class="bg-white rounded-xl subtle-border p-4 space-y-2">
                    <div class="flex items-center justify-between">
                        <h3 class="text-xs font-bold text-slate-900 uppercase font-mono">Últimos Paquetes GPS Recibidos en Vivo</h3>
                        <span class="text-[10px] text-slate-600 font-mono">Buffer de los últimos 20 pings</span>
                    </div>
                    <pre id="raw-telemetry-log" class="p-4 bg-slate-50 rounded-lg text-emerald-600 text-xs font-mono overflow-x-auto max-h-96 border border-slate-200">Esperando transmisiones...</pre>
                </div>
            </div>
        </div>

    </main>

    <!-- ============================================================ -->
    <!-- MODAL: MDM REMOTE COMMANDS -->
    <!-- ============================================================ -->
    <div id="modal-mdm" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-xl subtle-border w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                <div class="flex items-center gap-2">
                    <div class="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <i data-lucide="shield" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-slate-900">Comandos Remotos MDM</h3>
                        <p class="text-xs text-slate-600 font-mono" id="mdm-modal-target-uid">Dispositivo: ---</p>
                    </div>
                </div>
                <button onclick="closeMdmModal()" class="text-slate-600 hover:text-slate-900 p-1">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Command Options -->
            <div class="space-y-3">
                <!-- 1. Enviar Alerta de Texto -->
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <label class="block text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <i data-lucide="message-square" class="w-3.5 h-3.5 text-cyan-600"></i> Enviar Mensaje Prioritario al Chofer
                    </label>
                    <div class="flex gap-2">
                        <input type="text" id="mdm-input-msg" placeholder="Ej. Reportarse a base de inmediato..." class="flex-1 bg-white text-xs text-slate-900 px-3 py-2 rounded-md subtle-border focus:outline-none focus:border-emerald-500">
                        <button onclick="sendMdmCommand('message')" class="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-xs text-slate-900 font-semibold rounded-md border border-slate-300">Enviar</button>
                    </div>
                </div>

                <!-- 2. Sonar Sirena de Alarma -->
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                        <div class="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                            <i data-lucide="volume-2" class="w-3.5 h-3.5 text-amber-400"></i> Alarma Sonora en Cabina
                        </div>
                        <p class="text-[11px] text-slate-600">Suena la bocina del teléfono a máximo volumen</p>
                    </div>
                    <button onclick="sendMdmCommand('siren')" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-900 text-xs font-semibold rounded-md">Sonar 15s</button>
                </div>

                <!-- 3. Solicitar Captura de Pantalla -->
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                        <div class="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                            <i data-lucide="camera" class="w-3.5 h-3.5 text-emerald-600"></i> Captura de Pantalla en Vivo
                        </div>
                        <p class="text-[11px] text-slate-600">Toma una foto de lo que el chofer está viendo ahora</p>
                    </div>
                    <button onclick="sendMdmCommand('screenshot')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-900 text-xs font-semibold rounded-md">Solicitar</button>
                </div>

                <!-- 4. Fijar Paquete de App de Ventas -->
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <label class="block text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <i data-lucide="package" class="w-3.5 h-3.5 text-indigo-400"></i> Fijar App de Ventas Autorizada en Kiosco
                    </label>
                    <div class="flex gap-2">
                        <input type="text" id="mdm-input-pkg" placeholder="Ej. com.rutacontrol.ventas" class="flex-1 bg-white text-xs text-slate-900 px-3 py-2 rounded-md subtle-border font-mono">
                        <button onclick="sendMdmCommand('set_package')" class="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-xs text-slate-900 font-semibold rounded-md border border-slate-300">Fijar</button>
                    </div>
                </div>

                <!-- 5. Forzar Instalación APK (MDM) -->
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <label class="block text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                        <i data-lucide="download" class="w-3.5 h-3.5 text-blue-600"></i> Instalar APK Silencioso
                    </label>
                    <p class="text-[11px] text-slate-600">Pega el link directo (.apk) para forzar la instalación de cualquier app</p>
                    <div class="flex gap-2">
                        <input type="text" id="mdm-input-apk" placeholder="https://ejemplo.com/app.apk" class="flex-1 bg-white text-xs text-slate-900 px-3 py-2 rounded-md subtle-border focus:outline-none focus:border-blue-500">
                        <button onclick="sendMdmCommand('force_ota')" class="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md border border-blue-600">Instalar</button>
                    </div>
                </div>
            </div>

            <!-- Feedback Alert -->
            <div id="mdm-feedback" class="hidden p-3 rounded-lg text-xs font-mono"></div>
        </div>
    </div>

    <!-- ============================================================ -->
    <!-- MODAL: SCREENSHOT VIEWER -->
    <!-- ============================================================ -->
    <div id="modal-screenshot" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-xl subtle-border w-full max-w-2xl shadow-2xl p-4 space-y-3">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                <div class="flex items-center gap-2">
                    <i data-lucide="camera" class="w-4 h-4 text-emerald-600"></i>
                    <h3 class="text-sm font-bold text-slate-900" id="screenshot-title">Captura de Pantalla Bajo Demanda</h3>
                </div>
                <button onclick="closeScreenshotModal()" class="text-slate-600 hover:text-slate-900 p-1">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            
            <div class="bg-black rounded-lg flex items-center justify-center p-2 min-h-[360px]">
                <img id="screenshot-img" src="" alt="Captura de Pantalla" class="max-h-[500px] object-contain rounded">
            </div>

            <div class="flex items-center justify-between text-xs text-slate-600 font-mono">
                <span id="screenshot-timestamp">Tomada: ---</span>
                <button onclick="refreshScreenshot()" class="text-emerald-600 hover:underline flex items-center gap-1 font-sans">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Actualizar captura
                </button>
            </div>
        </div>
    </div>

    <!-- ============================================================ -->
    <!-- MODAL: QR PROVISIONING CODE -->
    <!-- ============================================================ -->
    <div id="modal-qr" class="hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-xl subtle-border w-full max-w-md shadow-2xl p-6 text-center space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 class="text-base font-bold text-slate-900">QR de Aprovisionamiento Device Owner</h3>
                <button onclick="closeQrModal()" class="text-slate-600 hover:text-slate-900 p-1">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <p class="text-xs text-slate-600">
                Enciende un teléfono de fábrica o recién formateado, pulsa 6 veces en la pantalla de bienvenida y escanea este código QR:
            </p>

            <div class="p-4 bg-white rounded-xl inline-block mx-auto shadow-xl">
                <div id="qrcode-container"></div>
            </div>

            <p class="text-[11px] font-mono text-emerald-600 break-all">
                https://zoltrak.websolutionsgarcia.com/api/apks.php?action=download_active
            </p>
        </div>
    </div>

    <!-- ============================================================ -->
    <!-- JAVASCRIPT CORE ENGINE (Real-time Fleet Polling & Leaflet) -->
    <!-- ============================================================ -->
    <script>
        // State
        let map = null;
        let vehicleMarkers = {};
        let devicesData = [];
        let activeFilter = 'all';
        let selectedDeviceUid = null;
        let activeLayerType = 'dark';
        let darkTileLayer = null;
        let satTileLayer = null;

        // Init Lucide
        lucide.createIcons();

        // 1. Inicialización de Mapa
        function initMap() {
            map = L.map('map', {
                zoomControl: false,
                attributionControl: false
            }).setView([19.4326, -99.1332], 12); // Centro default CDMX

            L.control.zoom({ position: 'bottomleft' }).addTo(map);

            // Dark Tiles (CartoDB Dark Matter)
            darkTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                subdomains: 'abcd'
            }).addTo(map);

            // Satellite Tiles
            satTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19
            });
        }

        function toggleMapLayer() {
            if (activeLayerType === 'dark') {
                map.removeLayer(darkTileLayer);
                satTileLayer.addTo(map);
                activeLayerType = 'sat';
            } else {
                map.removeLayer(satTileLayer);
                darkTileLayer.addTo(map);
                activeLayerType = 'dark';
            }
        }

        // 2. Icono Custom de Vehículo con Rumbo y Estado
        function createVehicleIcon(speed, heading, isOnline) {
            const isMoving = speed > 3;
            const colorClass = isOnline ? (isMoving ? '#10b981' : '#f59e0b') : '#64748b';
            const pulseClass = (isOnline && isMoving) ? 'pulse-ring' : '';

            const svgHtml = `
                <div class="relative flex items-center justify-center">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${pulseClass}" style="background: rgba(16, 22, 35, 0.9); border: 2px solid ${colorClass};">
                        <svg class="w-5 h-5 custom-vehicle-marker" style="transform: rotate(${heading || 0}deg); fill: ${colorClass};" viewBox="0 0 24 24">
                            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                        </svg>
                    </div>
                    <div class="absolute -bottom-2 bg-white px-1.5 py-0.2 rounded text-[9px] font-mono font-bold text-slate-900 border border-slate-300">
                        ${Math.round(speed)}k
                    </div>
                </div>
            `;

            return L.divIcon({
                html: svgHtml,
                className: 'custom-leaflet-marker',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
        }

        // 3. Consulta de Telemetría en Vivo (Cada 1 segundo)
        async function fetchTelemetry() {
            try {
                const res = await fetch('/api/devices.php');
                const data = await res.json();

                if (data && data.devices) {
                    devicesData = data.devices;
                    renderFleetList();
                    updateMapMarkers();
                    updateHeaderMetrics();

                    // Si hay un dispositivo seleccionado en el HUD, refrescar sus datos
                    if (selectedDeviceUid) {
                        const activeDev = devicesData.find(d => d.device_uid === selectedDeviceUid);
                        if (activeDev) updateHudWithDevice(activeDev);
                    }
                }
            } catch (err) {
                console.error("Error obteniendo telemetría:", err);
            }
        }

        // 4. Actualizar Marcadores en el Mapa
        function updateMapMarkers() {
            if (!map) return;

            const bounds = [];

            devicesData.forEach(dev => {
                const lat = parseFloat(dev.current_lat || dev.last_lat || 0);
                const lng = parseFloat(dev.current_lng || dev.last_lng || 0);
                const speed = parseFloat(dev.current_speed_kmh || dev.last_speed_kmh || 0);
                const heading = parseFloat(dev.heading || 0);

                if (lat !== 0 && lng !== 0) {
                    const isOnline = isDeviceOnline(dev.last_ping_at);

                    // Filtrado visual
                    if (activeFilter === 'moving' && speed <= 3) return;
                    if (activeFilter === 'stopped' && (speed > 3 || !isOnline)) return;
                    if (activeFilter === 'offline' && isOnline) return;

                    const icon = createVehicleIcon(speed, heading, isOnline);

                    if (vehicleMarkers[dev.device_uid]) {
                        vehicleMarkers[dev.device_uid].setLatLng([lat, lng]);
                        vehicleMarkers[dev.device_uid].setIcon(icon);
                    } else {
                        const marker = L.marker([lat, lng], { icon: icon }).addTo(map);
                        marker.on('click', () => selectDevice(dev.device_uid));
                        vehicleMarkers[dev.device_uid] = marker;
                    }

                    bounds.push([lat, lng]);
                }
            });
        }

        function fitAllMarkers() {
            const validCoords = [];
            devicesData.forEach(dev => {
                const lat = parseFloat(dev.current_lat || dev.last_lat || 0);
                const lng = parseFloat(dev.current_lng || dev.last_lng || 0);
                if (lat !== 0 && lng !== 0) validCoords.push([lat, lng]);
            });

            if (validCoords.length > 0) {
                map.fitBounds(validCoords, { padding: [50, 50], maxZoom: 15 });
            }
        }

        // 5. Renderizar Lista Lateral de Flota
        function renderFleetList() {
            const container = document.getElementById('fleet-items-container');
            const searchVal = document.getElementById('fleet-search').value.toLowerCase();

            const filtered = devicesData.filter(dev => {
                const name = (dev.driver_name || '').toLowerCase();
                const plate = (dev.vehicle_plate || '').toLowerCase();
                const route = (dev.route_code || '').toLowerCase();
                const uid = (dev.device_uid || '').toLowerCase();
                const speed = parseFloat(dev.current_speed_kmh || dev.last_speed_kmh || 0);
                const isOnline = isDeviceOnline(dev.last_ping_at);

                const matchesSearch = name.includes(searchVal) || plate.includes(searchVal) || route.includes(searchVal) || uid.includes(searchVal);
                if (!matchesSearch) return false;

                if (activeFilter === 'moving') return isOnline && speed > 3;
                if (activeFilter === 'stopped') return isOnline && speed <= 3;
                if (activeFilter === 'offline') return !isOnline;
                return true;
            });

            document.getElementById('fleet-count-summary').innerText = `${filtered.length} de ${devicesData.length} unidades`;

            if (filtered.length === 0) {
                container.innerHTML = `
                    <div class="p-6 text-center text-slate-500 text-xs">
                        No se encontraron unidades con los filtros actuales.
                    </div>
                `;
                return;
            }

            container.innerHTML = filtered.map(dev => {
                const isOnline = isDeviceOnline(dev.last_ping_at);
                const speed = parseFloat(dev.current_speed_kmh || dev.last_speed_kmh || 0);
                const isMoving = speed > 3;
                const statusDot = isOnline ? (isMoving ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-slate-600';
                const statusText = isOnline ? (isMoving ? `${Math.round(speed)} km/h` : 'Detenido') : 'Offline';
                const isSelected = selectedDeviceUid === dev.device_uid;

                return `
                    <div onclick="selectDevice('${dev.device_uid}')" class="p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-slate-100 bg-white/60 subtle-border'}">
                        <div class="flex items-start justify-between">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full ${statusDot}"></span>
                                <span class="font-bold text-slate-900 text-xs">${dev.driver_name || 'Sin Asignar'}</span>
                            </div>
                            <span class="text-[11px] font-mono font-bold ${isOnline && isMoving ? 'text-emerald-600' : 'text-slate-600'}">${statusText}</span>
                        </div>
                        <div class="flex items-center justify-between text-[11px] text-slate-600 font-mono mt-1.5">
                            <span>${dev.vehicle_plate ? `PLACA: ${dev.vehicle_plate}` : `UID: ${dev.device_uid.substring(0, 10)}...`}</span>
                            <span class="text-[10px] text-slate-500">${formatTimeAgo(dev.last_ping_at)}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 6. Seleccionar Dispositivo & Desplegar HUD
        function selectDevice(uid) {
            selectedDeviceUid = uid;
            const dev = devicesData.find(d => d.device_uid === uid);
            if (!dev) return;

            renderFleetList();
            updateHudWithDevice(dev);

            const lat = parseFloat(dev.current_lat || dev.last_lat || 0);
            const lng = parseFloat(dev.current_lng || dev.last_lng || 0);
            if (lat !== 0 && lng !== 0 && map) {
                map.flyTo([lat, lng], 15, { duration: 1 });
            }
        }

        function updateHudWithDevice(dev) {
            const hud = document.getElementById('telemetry-hud');
            hud.classList.remove('hidden');

            document.getElementById('hud-driver-name').innerText = dev.driver_name || 'Unidad No Asignada';
            document.getElementById('hud-vehicle-plate').innerText = `PLACA: ${dev.vehicle_plate || 'S/P'} • RUTA: ${dev.route_code || 'Gral'}`;
            
            const speed = parseFloat(dev.current_speed_kmh || dev.last_speed_kmh || 0);
            document.getElementById('hud-speed').innerHTML = `${Math.round(speed)} <span class="text-[10px] font-normal text-slate-600">km/h</span>`;
            document.getElementById('hud-battery').innerText = `${dev.battery_level || 100}%`;
            document.getElementById('hud-fuel').innerHTML = `${(dev.fuel_rate || 1.2).toFixed(1)} <span class="text-[10px] font-normal text-slate-600">L/h</span>`;
            
            document.getElementById('hud-device-uid').innerText = dev.device_uid;
            document.getElementById('hud-last-ping').innerText = formatTimeAgo(dev.last_ping_at);
            document.getElementById('hud-g-force').innerText = `${(dev.accel_g || 1.0).toFixed(2)} G (${(dev.accel_g || 1.0) > 1.4 ? 'Alerta Impacto' : 'Normal'})`;
        }

        function closeHud() {
            document.getElementById('telemetry-hud').classList.add('hidden');
            selectedDeviceUid = null;
            renderFleetList();
        }

        // 7. Modales de Comandos MDM
        function openMdmModalFromHud() {
            if (!selectedDeviceUid) return;
            document.getElementById('mdm-modal-target-uid').innerText = `Dispositivo Objetivo: ${selectedDeviceUid}`;
            document.getElementById('modal-mdm').classList.remove('hidden');
        }

        function closeMdmModal() {
            document.getElementById('modal-mdm').classList.add('hidden');
            document.getElementById('mdm-feedback').classList.add('hidden');
        }

        async function sendMdmCommand(type) {
            if (!selectedDeviceUid) return;

            let commandString = '';
            let actionType = 'send_command';

            if (type === 'message') {
                const msg = document.getElementById('mdm-input-msg').value.trim();
                if (!msg) return alert('Escribe un mensaje');
                commandString = `SHOW_MESSAGE:${msg}`;
            } else if (type === 'siren') {
                commandString = 'PLAY_ALARM_SOUND';
            } else if (type === 'screenshot') {
                commandString = 'SCREENSHOT';
                actionType = 'request_screenshot';
            } else if (type === 'set_package') {
                const pkg = document.getElementById('mdm-input-pkg').value.trim();
                if (!pkg) return alert('Escribe el nombre de paquete');
                commandString = `SET_PACKAGE:${pkg}`;
            } else if (type === 'force_ota') {
                const apkUrl = document.getElementById('mdm-input-apk').value.trim();
                if (!apkUrl) return alert('Pega el link directo al APK');
                commandString = `INSTALL_APK_OTA:${apkUrl}`;
                actionType = 'send_command';
            }

            const feedback = document.getElementById('mdm-feedback');
            feedback.className = 'p-3 rounded-lg text-xs font-mono bg-slate-50 text-amber-500 border border-amber-500/30';
            feedback.innerText = `Despachando orden: ${commandString}...`;
            feedback.classList.remove('hidden');

            try {
                const payload = {
                    action: actionType,
                    device_uid: selectedDeviceUid === 'ALL_DEVICES' ? null : selectedDeviceUid,
                    command: commandString
                };

                const res = await fetch('/api/devices.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                const resJson = await res.json();

                if (resJson.status === 'ok') {
                    feedback.className = 'p-3 rounded-lg text-xs font-mono bg-emerald-50 text-emerald-600 border border-emerald-500/30';
                    feedback.innerText = `✅ ${resJson.message || 'Comando encolado exitosamente.'}`;
                    
                    if (type === 'screenshot') {
                        setTimeout(() => {
                            closeMdmModal();
                            requestScreenshotFromHud();
                        }, 2000);
                    }
                } else {
                    feedback.className = 'p-3 rounded-lg text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/30';
                    feedback.innerText = `❌ Error: ${resJson.message}`;
                }
            } catch (err) {
                feedback.className = 'p-3 rounded-lg text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/30';
                feedback.innerText = `❌ Excepción: ${err.message}`;
            }
        }

        // 8. Captura de Pantalla Bajo Demanda
        async function requestScreenshotFromHud() {
            if (!selectedDeviceUid) return;
            document.getElementById('modal-screenshot').classList.remove('hidden');
            document.getElementById('screenshot-title').innerText = `Captura de Pantalla • ${selectedDeviceUid}`;
            document.getElementById('screenshot-img').src = '';
            document.getElementById('screenshot-timestamp').innerText = 'Solicitando y descargando fotograma...';

            refreshScreenshot();
        }

        async function refreshScreenshot() {
            if (!selectedDeviceUid) return;
            try {
                const res = await fetch(`/api/devices.php?action=get_screenshot&device_uid=${selectedDeviceUid}&t=${Date.now()}`);
                const data = await res.json();

                if (data.has_screenshot) {
                    document.getElementById('screenshot-img').src = data.screenshot_url;
                    document.getElementById('screenshot-timestamp').innerText = `Capturada: ${data.captured_at} (Hace ${data.age_seconds}s)`;
                } else {
                    document.getElementById('screenshot-timestamp').innerText = 'El dispositivo aún no envía la captura. Solicitando nueva...';
                    sendMdmCommand('screenshot');
                }
            } catch (err) {
                document.getElementById('screenshot-timestamp').innerText = `Error: ${err.message}`;
            }
        }

        function closeScreenshotModal() {
            document.getElementById('modal-screenshot').classList.add('hidden');
        }

        // 9. QR de Aprovisionamiento
        function openEnrollmentQrModal() {
            document.getElementById('modal-qr').classList.remove('hidden');
            const qrContainer = document.getElementById('qrcode-container');
            qrContainer.innerHTML = '';

            const qrPayload = JSON.stringify({
                "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.rutacontrol.telematics/com.rutacontrol.telematics.receivers.DeviceAdminPolicyReceiver",
                "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": "https://zoltrak.websolutionsgarcia.com/api/apks.php?action=download_active",
                "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM": "",
                "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true
            });

            new QRCode(qrContainer, {
                text: qrPayload,
                width: 220,
                height: 220,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.M
            });
        }

        function closeQrModal() {
            document.getElementById('modal-qr').classList.add('hidden');
        }

        // 10. Navegación por Pestañas
        function switchTab(tabId) {
            document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('bg-slate-200', 'text-slate-900', 'shadow-sm');
                b.classList.add('text-slate-600');
            });

            const targetView = document.getElementById(`view-${tabId}`);
            const targetBtn = document.getElementById(`tab-btn-${tabId}`);
            if (targetView && targetBtn) {
                targetView.classList.remove('hidden');
                targetBtn.classList.add('bg-slate-200', 'text-slate-900', 'shadow-sm');
                targetBtn.classList.remove('text-slate-600');
            }

            if (tabId === 'map' && map) {
                setTimeout(() => map.invalidateSize(), 200);
            } else if (tabId === 'devices') {
                renderDevicesTable();
            } else if (tabId === 'apks') {
                fetchApksList();
            } else if (tabId === 'diagnostics') {
                runServerDiagnostics();
            }
        }

        // 11. Render de Tabla de Dispositivos
        function renderDevicesTable() {
            const tbody = document.getElementById('devices-table-body');
            tbody.innerHTML = devicesData.map(dev => {
                const isOnline = isDeviceOnline(dev.last_ping_at);
                const statusBadge = isOnline 
                    ? '<span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">EN LÍNEA</span>'
                    : '<span class="px-2 py-0.5 rounded bg-slate-800 text-slate-600 text-[10px] font-bold border border-slate-700">OFFLINE</span>';

                return `
                    <tr class="hover:bg-slate-100/50 transition-colors">
                        <td class="px-4 py-3">${statusBadge}</td>
                        <td class="px-4 py-3 text-slate-900 font-bold">${dev.device_uid}</td>
                        <td class="px-4 py-3 font-sans text-slate-700">${dev.driver_name || 'Sin Asignar'}</td>
                        <td class="px-4 py-3">${dev.vehicle_plate || '---'}</td>
                        <td class="px-4 py-3 text-emerald-600">${dev.apk_version || '1.0.0'}</td>
                        <td class="px-4 py-3 text-slate-600">${formatTimeAgo(dev.last_ping_at)}</td>
                        <td class="px-4 py-3 text-right">
                            <button onclick="selectedDeviceUid='${dev.device_uid}'; openMdmModalFromHud();" class="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded border border-slate-300 text-xs">
                                Comandos MDM
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // 12. Módulo de APKs
        async function fetchApksList() {
            try {
                const res = await fetch('/api/apks.php');
                const data = await res.json();
                const tbody = document.getElementById('apks-table-body');

                if (data && data.apks) {
                    tbody.innerHTML = data.apks.map(apk => `
                        <tr class="hover:bg-slate-100/50">
                            <td class="px-4 py-3 text-slate-900 font-bold">v${apk.version_name}</td>
                            <td class="px-4 py-3">${apk.version_code}</td>
                            <td class="px-4 py-3 text-slate-600">${apk.file_name}</td>
                            <td class="px-4 py-3 text-slate-600">${apk.created_at}</td>
                            <td class="px-4 py-3">
                                ${apk.is_active == 1 
                                    ? '<span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">ACTIVA (PRODUCCIÓN)</span>'
                                    : '<span class="text-slate-500 text-[10px]">Archivada</span>'
                                }
                            </td>
                            <td class="px-4 py-3 text-right">
                                <a href="/uploads/apks/${apk.file_name}" download class="text-emerald-600 hover:underline">Descargar .apk</a>
                            </td>
                        </tr>
                    `).join('');
                }
            } catch (e) {}
        }

        // Formulario Subida APK
        document.getElementById('apk-upload-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-apk');
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Subiendo y compilando versión...';
            lucide.createIcons();

            try {
                const formData = new FormData(e.target);
                const res = await fetch('/api/upload_apk.php', {
                    method: 'POST',
                    body: formData
                });
                const resJson = await res.json();

                if (resJson.status === 'ok') {
                    alert('✅ APK publicada exitosamente. Las terminales se actualizarán silenciosamente.');
                    e.target.reset();
                    fetchApksList();
                } else {
                    alert(`❌ Error: ${resJson.message}`);
                }
            } catch (err) {
                alert(`❌ Excepción: ${err.message}`);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="upload" class="w-4 h-4"></i> Publicar y Distribuir Actualización';
                lucide.createIcons();
            }
        });

        // 13. Diagnóstico de Servidor
        async function runServerDiagnostics() {
            try {
                const res = await fetch('/api/telemetry.php?action=diagnostic');
                const text = await res.text();
                document.getElementById('raw-telemetry-log').innerText = text;
            } catch (e) {
                document.getElementById('raw-telemetry-log').innerText = `Error ejecutando diagnóstico: ${e.message}`;
            }
        }

        // Helper: Formato de Tiempo
        function isDeviceOnline(dateStr) {
            if (!dateStr) return false;
            const pingTime = new Date(dateStr).getTime();
            const now = Date.now();
            return (now - pingTime) <= 5 * 60 * 1000; // 5 minutos
        }

        function formatTimeAgo(dateStr) {
            if (!dateStr) return 'Nunca';
            const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
            if (diff < 5) return 'En vivo';
            if (diff < 60) return `Hace ${diff}s`;
            if (diff < 3600) return `Hace ${Math.floor(diff / 60)}m`;
            return `Hace ${Math.floor(diff / 3600)}h`;
        }

        function setFilter(filter) {
            activeFilter = filter;
            document.querySelectorAll('.filter-chip').forEach(b => {
                b.classList.remove('bg-slate-200', 'text-slate-900');
                b.classList.add('text-slate-600');
            });
            const activeBtn = document.getElementById(`filter-${filter}`);
            if (activeBtn) {
                activeBtn.classList.add('bg-slate-200', 'text-slate-900');
                activeBtn.classList.remove('text-slate-600');
            }
            renderFleetList();
            updateMapMarkers();
        }

        function updateHeaderMetrics() {
            let moving = 0;
            let active = 0;
            let offline = 0;

            devicesData.forEach(dev => {
                const isOnline = isDeviceOnline(dev.last_ping_at);
                const speed = parseFloat(dev.current_speed_kmh || dev.last_speed_kmh || 0);
                if (isOnline) {
                    active++;
                    if (speed > 3) moving++;
                } else {
                    offline++;
                }
            });

            document.getElementById('metric-moving').innerText = moving;
            document.getElementById('metric-active').innerText = active;
            document.getElementById('metric-offline').innerText = offline;
            document.getElementById('badge-total-devs').innerText = devicesData.length;
        }

        // Auto-Polling cada 1.5s
        document.getElementById('fleet-search').addEventListener('input', renderFleetList);

        // Arranque
        window.addEventListener('DOMContentLoaded', () => {
            initMap();
            fetchTelemetry();
            setInterval(fetchTelemetry, 1500);
        });
    </script>
</body>
</html>
