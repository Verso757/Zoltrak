import re

with open('/tmp/original_index.php', 'r', encoding='utf-8') as f:
    code = f.read()

# Extract PHP header
php_header_match = re.search(r'<\?php.*?\?>', code, re.DOTALL)
php_header = php_header_match.group(0)

# Extract Main JavaScript (it's the last script tag in the file before </body>)
scripts = re.findall(r'<script>(.*?)</script>', code, re.DOTALL)
# The last script in the original file is the main application logic
js_code = scripts[-1]

# SweetAlert2 Replacements
js_code = js_code.replace('prompt("Para asignar, ingresa el ID NUMÉRICO del conductor (lo puedes ver en la pestaña Conductores):")', 'await Swal.fire({title: "Asignar Conductor", input: "number", inputLabel: "ID Numérico del conductor", showCancelButton: true, confirmButtonColor: "#0284c7"}).then(r => r.value)')
js_code = js_code.replace('if (confirm("¿Estás seguro de borrar este conductor? Esto desvinculará sus dispositivos asociados."))', 'if ((await Swal.fire({title: "¿Borrar conductor?", text: "Esto desvinculará sus dispositivos.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Sí, borrar"})).isConfirmed)')
js_code = js_code.replace('if (confirm("¿Estás seguro de borrar este dispositivo de prueba?"))', 'if ((await Swal.fire({title: "¿Borrar dispositivo?", text: "Se borrará su historial de telemetría.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Sí, borrar"})).isConfirmed)')
js_code = js_code.replace('alert("Dispositivo borrado");', 'Swal.fire("Borrado", "Dispositivo eliminado", "success");')
js_code = js_code.replace('alert("Conductor asignado correctamente");', 'Swal.fire("¡Éxito!", "Conductor asignado correctamente", "success");')
js_code = js_code.replace('alert(data.message || "Error");', 'Swal.fire("Atención", data.message || "Error", "info");')
js_code = js_code.replace('alert("Comando enviado: " + data.message);', 'Swal.fire("¡Enviado!", data.message, "success");')
js_code = js_code.replace('alert("Selecciona un APK válido (menor a 50MB)");', 'Swal.fire("Error", "Selecciona un APK válido (menor a 50MB)", "error");')
js_code = js_code.replace('alert("Error de red");', 'Swal.fire("Error", "Fallo de conexión al servidor", "error");')

# Update switchTab logic to support new sidebar styling
old_switch = """        function switchTab(tabId) {
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
            }"""

new_switch = """        function switchTab(tabId) {
            document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('bg-sky-50', 'text-sky-700', 'font-semibold');
                b.classList.add('text-slate-500', 'hover:bg-slate-50', 'hover:text-slate-700');
            });

            const targetView = document.getElementById(`view-${tabId}`);
            const targetBtn = document.getElementById(`tab-btn-${tabId}`);
            if (targetView && targetBtn) {
                targetView.classList.remove('hidden');
                targetBtn.classList.add('bg-sky-50', 'text-sky-700', 'font-semibold');
                targetBtn.classList.remove('text-slate-500', 'hover:bg-slate-50', 'hover:text-slate-700');
            }"""

js_code = js_code.replace(old_switch, new_switch)

# The HTML template for a Clean Light Theme
html_template = f"""{php_header}
<!DOCTYPE html>
<html lang="es" class="h-full bg-slate-50 text-slate-800 antialiased">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>RutaControl MDM • Monitoreo Ejecutivo</title>
    
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {{
            theme: {{
                extend: {{
                    fontFamily: {{
                        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                        mono: ['"JetBrains Mono"', 'monospace']
                    }}
                }}
            }}
        }}
    </script>
    
    <!-- Leaflet JS & CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Phosphor Icons (Ligeros y corporativos) -->
    <script src="https://unpkg.com/@phosphor-icons/web"></script>

    <style>
        /* Light map theme styling */
        .leaflet-container {{ font-family: 'Plus Jakarta Sans', sans-serif; }}
        .custom-leaflet-marker {{ background: transparent; border: none; }}
        .marker-glow {{ filter: drop-shadow(0 0 6px rgba(14, 165, 233, 0.5)); }}
        .marker-glow-offline {{ filter: drop-shadow(0 0 4px rgba(148, 163, 184, 0.6)); }}
        .marker-glow-speed {{ filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.6)); }}
        
        /* Ocultar barra de scroll pero mantener funcionalidad */
        ::-webkit-scrollbar {{ width: 6px; height: 6px; }}
        ::-webkit-scrollbar-track {{ background: transparent; }}
        ::-webkit-scrollbar-thumb {{ background: #cbd5e1; border-radius: 4px; }}
        ::-webkit-scrollbar-thumb:hover {{ background: #94a3b8; }}
    </style>
</head>
<body class="h-full flex overflow-hidden selection:bg-sky-500 selection:text-white">

    <!-- BARRA LATERAL (SIDEBAR) -->
    <nav class="w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 transition-all duration-300">
        <div>
            <!-- Logo -->
            <div class="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-100 mb-6">
                <div class="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center shadow-lg shadow-sky-600/20">
                    <i class="ph-bold ph-radar text-white text-xl"></i>
                </div>
                <span class="ml-3 font-bold text-lg hidden md:block tracking-tight text-slate-900">RutaControl</span>
            </div>

            <!-- Menú de Navegación -->
            <div class="px-3 flex flex-col gap-2">
                <button onclick="switchTab('map')" id="tab-btn-map" class="tab-btn w-full flex items-center p-3 md:px-4 md:py-3 rounded-xl bg-sky-50 text-sky-700 font-semibold transition-all group">
                    <i class="ph-fill ph-map-trifold text-2xl md:text-xl transition-transform group-hover:scale-110"></i>
                    <span class="ml-3 text-sm hidden md:block">Mapa en Vivo</span>
                </button>
                <button onclick="switchTab('devices')" id="tab-btn-devices" class="tab-btn w-full flex items-center p-3 md:px-4 md:py-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all group">
                    <i class="ph-fill ph-device-mobile text-2xl md:text-xl transition-transform group-hover:scale-110"></i>
                    <span class="ml-3 text-sm hidden md:block font-medium">Dispositivos</span>
                </button>
                <button onclick="switchTab('drivers')" id="tab-btn-drivers" class="tab-btn w-full flex items-center p-3 md:px-4 md:py-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all group">
                    <i class="ph-fill ph-users text-2xl md:text-xl transition-transform group-hover:scale-110"></i>
                    <span class="ml-3 text-sm hidden md:block font-medium">Conductores</span>
                </button>
                <button onclick="switchTab('apks')" id="tab-btn-apks" class="tab-btn w-full flex items-center p-3 md:px-4 md:py-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all group">
                    <i class="ph-fill ph-cloud-arrow-up text-2xl md:text-xl transition-transform group-hover:scale-110"></i>
                    <span class="ml-3 text-sm hidden md:block font-medium">OTA Updates</span>
                </button>
                <button onclick="switchTab('diagnostics')" id="tab-btn-diagnostics" class="tab-btn w-full flex items-center p-3 md:px-4 md:py-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all group">
                    <i class="ph-fill ph-activity text-2xl md:text-xl transition-transform group-hover:scale-110"></i>
                    <span class="ml-3 text-sm hidden md:block font-medium">Diagnóstico</span>
                </button>
            </div>
        </div>

        <div class="p-4 mb-2 hidden md:block">
            <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <i class="ph-fill ph-user text-slate-500"></i>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-slate-800">Admin</p>
                        <p class="text-xs text-slate-500">RutaControl</p>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <!-- ÁREA PRINCIPAL -->
    <main class="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        
        <!-- HEADER MÓVIL (Solo visible en pantallas pequeñas) -->
        <header class="md:hidden h-16 border-b border-slate-200 bg-white flex items-center px-4 shrink-0 justify-between">
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded bg-sky-600 flex items-center justify-center shadow-lg shadow-sky-600/20">
                    <i class="ph-bold ph-radar text-white text-sm"></i>
                </div>
                <span class="font-bold text-slate-900">RutaControl</span>
            </div>
            <button onclick="openEnrollmentQrModal()" class="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600">
                <i class="ph-bold ph-qr-code"></i>
            </button>
        </header>

        <!-- DASHBOARD HEADER -->
        <div id="top-metrics-bar" class="p-6 border-b border-slate-200 bg-white shrink-0 hidden md:flex items-center justify-between z-10 relative">
            <div>
                <h1 class="text-2xl font-bold tracking-tight text-slate-900 mb-1">Centro de Monitoreo</h1>
                <p class="text-sm text-slate-500">Control maestro de telemetría y MDM</p>
            </div>
            
            <div class="flex items-center gap-4">
                <div class="flex gap-2">
                    <div class="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
                        <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <i class="ph-fill ph-device-mobile text-slate-500"></i>
                        </div>
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Flota Total</p>
                            <p class="text-lg font-bold text-slate-900 leading-tight"><span id="metric-total"><?php echo $totalDevices; ?></span></p>
                        </div>
                    </div>
                    <div class="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
                        <div class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                            <i class="ph-fill ph-wifi-high text-emerald-600"></i>
                        </div>
                        <div>
                            <p class="text-xs text-slate-500 font-medium">En Línea</p>
                            <p class="text-lg font-bold text-emerald-600 leading-tight"><span id="metric-active"><?php echo $activeNow; ?></span></p>
                        </div>
                    </div>
                    <div class="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
                        <div class="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                            <i class="ph-fill ph-warning-circle text-red-500"></i>
                        </div>
                        <div>
                            <p class="text-xs text-slate-500 font-medium">Offline</p>
                            <p class="text-lg font-bold text-red-500 leading-tight"><span id="metric-offline"><?php echo $offlineNow; ?></span></p>
                        </div>
                    </div>
                </div>
                
                <button onclick="openEnrollmentQrModal()" class="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-slate-900/10 transition-all flex items-center gap-2">
                    <i class="ph-bold ph-qr-code text-lg"></i> Enrolar Dispositivo
                </button>
            </div>
        </div>

        <!-- CONTENEDOR DE VISTAS (TABS) -->
        <div class="flex-1 relative overflow-hidden bg-slate-50">
            
            <!-- VISTA: MAPA EN VIVO -->
            <div id="view-map" class="app-view absolute inset-0 flex flex-col md:flex-row">
                <!-- Panel lateral de flota en mapa -->
                <div class="w-full md:w-80 h-1/3 md:h-full bg-white border-r border-slate-200 flex flex-col shrink-0 z-[400] relative md:shadow-lg">
                    <div class="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 class="font-bold text-slate-800 flex items-center gap-2">
                            <i class="ph-fill ph-list-dashes text-sky-600"></i> Unidades Activas
                        </h2>
                        <button onclick="fitAllMarkers()" class="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition" title="Centrar mapa">
                            <i class="ph-bold ph-corners-out"></i>
                        </button>
                    </div>
                    <div class="p-3 border-b border-slate-100 flex gap-2 overflow-x-auto hide-scrollbar">
                        <button onclick="setFilter('all')" id="filter-all" class="px-3 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-full text-xs font-bold whitespace-nowrap">Todos</button>
                        <button onclick="setFilter('active')" id="filter-active" class="px-3 py-1 bg-slate-50 text-slate-500 border border-slate-200 rounded-full text-xs font-medium whitespace-nowrap">Conectados</button>
                        <button onclick="setFilter('moving')" id="filter-moving" class="px-3 py-1 bg-slate-50 text-slate-500 border border-slate-200 rounded-full text-xs font-medium whitespace-nowrap">En Movimiento</button>
                    </div>
                    <div class="flex-1 overflow-y-auto p-2" id="fleet-list">
                        <!-- Lista inyectada por JS -->
                    </div>
                </div>
                
                <!-- El Mapa Leaflet -->
                <div class="flex-1 relative h-2/3 md:h-full z-0">
                    <div id="map" class="absolute inset-0"></div>
                </div>

                <!-- HUD Lateral de Dispositivo Seleccionado -->
                <div id="device-hud" class="absolute top-4 right-4 w-80 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl z-[500] hidden flex-col overflow-hidden transform transition-all translate-x-full">
                    <div class="bg-slate-50 p-4 flex justify-between items-start border-b border-slate-100">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span id="hud-status" class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                                <h3 id="hud-driver-name" class="font-bold text-slate-900 text-lg leading-tight">Cargando...</h3>
                            </div>
                            <p id="hud-uid" class="text-xs text-slate-500 font-mono"></p>
                        </div>
                        <button onclick="closeHud()" class="w-8 h-8 bg-slate-200 hover:bg-slate-300 rounded-full flex items-center justify-center text-slate-600 transition">
                            <i class="ph-bold ph-x"></i>
                        </button>
                    </div>
                    
                    <div class="p-4 flex flex-col gap-4">
                        <div class="grid grid-cols-2 gap-3">
                            <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <p class="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Velocidad</p>
                                <p class="text-xl font-black text-slate-900 font-mono"><span id="hud-speed">0</span><span class="text-xs text-slate-500 font-sans font-medium ml-1">km/h</span></p>
                            </div>
                            <div class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <p class="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Batería</p>
                                <div class="flex items-end gap-1">
                                    <p class="text-xl font-black text-emerald-600 font-mono"><span id="hud-battery">--</span>%</p>
                                    <i id="hud-charging" class="ph-fill ph-lightning text-emerald-500 text-lg hidden"></i>
                                </div>
                            </div>
                        </div>

                        <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-2">
                            <div class="flex items-center gap-2 text-slate-600 text-sm">
                                <i class="ph-fill ph-car-profile text-slate-400"></i>
                                <span id="hud-plate" class="font-medium">---</span>
                            </div>
                            <div class="flex items-center gap-2 text-slate-600 text-sm">
                                <i class="ph-fill ph-map-pin text-slate-400"></i>
                                <span id="hud-coords" class="font-mono text-xs">---, ---</span>
                            </div>
                            <div class="flex items-center gap-2 text-slate-500 text-sm">
                                <i class="ph-fill ph-clock text-slate-400"></i>
                                <span id="hud-lastping" class="text-xs">Hace unos instantes</span>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-2 mt-2">
                            <button onclick="requestScreenshotFromHud()" class="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg py-2.5 text-xs font-bold flex items-center justify-center gap-2 transition">
                                <i class="ph-bold ph-camera"></i> Pantalla
                            </button>
                            <button onclick="openMdmModalFromHud()" class="bg-sky-600 hover:bg-sky-500 text-white rounded-lg py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition">
                                <i class="ph-bold ph-terminal-window"></i> Consola MDM
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- VISTA: DISPOSITIVOS -->
            <div id="view-devices" class="app-view absolute inset-0 hidden overflow-y-auto p-4 md:p-8 bg-slate-50">
                <div class="max-w-7xl mx-auto">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h2 class="text-2xl font-bold text-slate-900">Inventario de Dispositivos</h2>
                            <p class="text-slate-500 text-sm">Equipos enrolados mediante Android Enterprise</p>
                        </div>
                        <button onclick="fetchTelemetry()" class="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 shadow-sm flex items-center gap-2 transition">
                            <i class="ph-bold ph-arrows-clockwise"></i> Refrescar
                        </button>
                    </div>

                    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-sm whitespace-nowrap">
                                <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                                    <tr>
                                        <th class="px-6 py-4">Estado</th>
                                        <th class="px-6 py-4">ID Dispositivo</th>
                                        <th class="px-6 py-4">Conductor Asignado</th>
                                        <th class="px-6 py-4">Placa</th>
                                        <th class="px-6 py-4">Versión App</th>
                                        <th class="px-6 py-4">Última Conexión</th>
                                        <th class="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="devices-table-body" class="divide-y divide-slate-100">
                                    <!-- Inyectado por JS -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- VISTA: CONDUCTORES -->
            <div id="view-drivers" class="app-view absolute inset-0 hidden overflow-y-auto p-4 md:p-8 bg-slate-50">
                <div class="max-w-7xl mx-auto">
                    <div class="flex justify-between items-center mb-6">
                        <div>
                            <h2 class="text-2xl font-bold text-slate-900">Catálogo de Conductores</h2>
                            <p class="text-slate-500 text-sm">Operadores autorizados para la flota</p>
                        </div>
                        <button onclick="openNewDriverModal()" class="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl font-semibold shadow-lg shadow-sky-600/20 transition flex items-center gap-2 text-sm">
                            <i class="ph-bold ph-plus"></i> Nuevo
                        </button>
                    </div>
                    
                    <div id="drivers-grid" class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <!-- Inyectado por JS -->
                    </div>
                </div>
            </div>

            <!-- VISTA: APKS Y OTA -->
            <div id="view-apks" class="app-view absolute inset-0 hidden overflow-y-auto p-4 md:p-8 bg-slate-50">
                <div class="max-w-4xl mx-auto">
                    <h2 class="text-2xl font-bold text-slate-900 mb-2">Lanzamientos OTA</h2>
                    <p class="text-slate-500 text-sm mb-6">Sube y despacha actualizaciones silenciosas a toda la flota instantáneamente.</p>
                    
                    <!-- Subida -->
                    <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div class="flex-1">
                            <h3 class="font-bold text-slate-900 mb-1 flex items-center gap-2"><i class="ph-fill ph-upload-simple text-sky-600"></i> Subir Nuevo APK</h3>
                            <p class="text-slate-500 text-xs">Carga el archivo .apk firmado (max 50MB) para distribuirlo vía OTA.</p>
                        </div>
                        <form id="upload-apk-form" class="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                            <input type="text" id="apk-version-input" placeholder="Versión (ej. 1.0.2)" required class="bg-slate-50 border border-slate-200 text-slate-900 px-3 py-2 rounded-lg text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none w-full md:w-32">
                            <input type="file" id="apk-file-input" accept=".apk" required class="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-600 hover:file:bg-sky-100 w-full md:w-auto">
                            <button type="submit" class="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm transition shrink-0">Subir APK</button>
                        </form>
                    </div>

                    <!-- Lista de versiones -->
                    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                                <tr>
                                    <th class="px-6 py-4">Versión</th>
                                    <th class="px-6 py-4">Fecha Subida</th>
                                    <th class="px-6 py-4">Status</th>
                                    <th class="px-6 py-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody id="apks-table-body" class="divide-y divide-slate-100">
                                <!-- Inyectado -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- VISTA: DIAGNÓSTICO -->
            <div id="view-diagnostics" class="app-view absolute inset-0 hidden overflow-y-auto p-4 md:p-8 bg-slate-50">
                <div class="max-w-4xl mx-auto">
                    <h2 class="text-2xl font-bold text-slate-900 mb-6">Diagnóstico de Servidor Hostinger</h2>
                    <div id="diagnostic-results" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Inyectado por JS -->
                    </div>
                </div>
            </div>

        </div> <!-- /Tabs -->
    </main>

    <!-- ============================================== -->
    <!-- MODALES (Ocultos por defecto)                  -->
    <!-- ============================================== -->

    <!-- Modal MDM Consola -->
    <div id="mdm-modal" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1000] hidden flex items-center justify-center p-4">
        <div class="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-full">
            <div class="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                <h3 class="font-bold text-slate-900 flex items-center gap-2"><i class="ph-bold ph-terminal-window text-sky-600"></i> Consola MDM Remota</h3>
                <button onclick="closeMdmModal()" class="text-slate-400 hover:text-slate-600"><i class="ph-bold ph-x text-xl"></i></button>
            </div>
            <div class="p-6 overflow-y-auto">
                <p class="text-slate-500 text-sm mb-4">Ejecutando en dispositivo: <strong class="text-sky-600 font-mono" id="mdm-target-uid"></strong></p>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    <button onclick="sendMdmCommand('WIPE_FACTORY')" class="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 p-3 rounded-xl flex items-center gap-3 transition text-left">
                        <i class="ph-fill ph-warning-octagon text-2xl"></i>
                        <div><p class="font-bold text-sm">Wipe Factory</p><p class="text-[10px] opacity-80">Formateo remoto total</p></div>
                    </button>
                    <button onclick="sendMdmCommand('LOCK_DEVICE')" class="bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-100 p-3 rounded-xl flex items-center gap-3 transition text-left">
                        <i class="ph-fill ph-lock-key text-2xl"></i>
                        <div><p class="font-bold text-sm">Bloquear Pantalla</p><p class="text-[10px] opacity-80">Apaga y bloquea</p></div>
                    </button>
                    <button onclick="sendMdmCommand('REBOOT')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 p-3 rounded-xl flex items-center gap-3 transition text-left">
                        <i class="ph-bold ph-power text-2xl"></i>
                        <div><p class="font-bold text-sm">Reiniciar</p><p class="text-[10px] text-slate-500">Reinicio forzado (Root/MDM)</p></div>
                    </button>
                    <button onclick="sendMdmCommand('RESTART_APP')" class="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-100 p-3 rounded-xl flex items-center gap-3 transition text-left">
                        <i class="ph-bold ph-arrows-clockwise text-2xl"></i>
                        <div><p class="font-bold text-sm">Reiniciar App Kiosco</p><p class="text-[10px] opacity-80">Mata el proceso y reabre</p></div>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal QR -->
    <div id="qr-modal" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1000] hidden flex items-center justify-center p-4">
        <div class="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center">
            <h3 class="font-bold text-slate-900 text-xl mb-2">Enrolar Android</h3>
            <p class="text-sm text-slate-500 mb-6">Enciende un dispositivo Android nuevo y toca 6 veces la pantalla de bienvenida para escanear.</p>
            <div class="bg-white border border-slate-200 p-4 rounded-xl inline-block mb-6 mx-auto shadow-sm">
                <img id="qr-image" src="" alt="QR" class="w-48 h-48">
            </div>
            <button onclick="closeQrModal()" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition">Cerrar</button>
        </div>
    </div>

    <!-- Modal Nuevo Conductor -->
    <div id="modal-driver" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1000] hidden flex items-center justify-center p-4">
        <div class="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div class="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                <h3 class="font-bold text-slate-900">Nuevo Conductor</h3>
                <button onclick="document.getElementById('modal-driver').classList.add('hidden')" class="text-slate-400 hover:text-slate-600"><i class="ph-bold ph-x text-xl"></i></button>
            </div>
            <form id="form-driver" class="p-6 flex flex-col gap-4">
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">Nombre Completo</label>
                    <input type="text" id="driver-name" required class="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 rounded-xl focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">Teléfono</label>
                    <input type="text" id="driver-phone" class="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 rounded-xl focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 mb-1">Placas del Vehículo</label>
                    <input type="text" id="driver-plate" class="w-full bg-slate-50 border border-slate-200 text-slate-900 px-4 py-2.5 rounded-xl uppercase focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none">
                </div>
                <button type="submit" class="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-sky-600/20 mt-2 transition">Guardar Conductor</button>
            </form>
        </div>
    </div>

    <!-- Modal Captura Pantalla -->
    <div id="screenshot-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1100] hidden flex flex-col items-center justify-center p-4">
        <div class="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div class="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                <h3 class="font-bold text-slate-900 flex items-center gap-2"><i class="ph-bold ph-camera text-sky-600"></i> Captura de Pantalla Remota</h3>
                <div class="flex items-center gap-3">
                    <button onclick="refreshScreenshot()" class="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm">
                        <i class="ph-bold ph-arrows-clockwise"></i> Refrescar Imagen
                    </button>
                    <button onclick="closeScreenshotModal()" class="text-slate-400 hover:text-slate-600"><i class="ph-bold ph-x text-xl"></i></button>
                </div>
            </div>
            <div class="p-6 flex-1 flex flex-col items-center justify-center bg-slate-50 min-h-[400px]">
                <p id="screenshot-status" class="text-slate-500 text-sm mb-4 animate-pulse">Solicitando captura al dispositivo...</p>
                <img id="screenshot-image" src="" alt="Captura remota" class="max-w-full max-h-[60vh] object-contain rounded-lg border border-slate-200 shadow-md hidden">
                <p id="screenshot-time" class="text-xs text-slate-500 mt-3 hidden"></p>
            </div>
        </div>
    </div>

    <!-- SCRIPT INYECTADO -->
    <script>
{js_code}
    </script>
</body>
</html>
"""

with open('hostinger_deploy/index.php.new', 'w', encoding='utf-8') as f:
    f.write(html_template)

