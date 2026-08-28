<?php
$index = file_get_contents('hostinger_deploy/index.php');

// Add driver modal
$driverModalHtml = <<<HTML
    <!-- ============================================================ -->
    <!-- MODAL: CREAR CONDUCTOR -->
    <!-- ============================================================ -->
    <div id="modal-driver" class="hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-xl subtle-border w-full max-w-md shadow-2xl p-5 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                <div class="flex items-center gap-2">
                    <i data-lucide="user-plus" class="w-4 h-4 text-emerald-600"></i>
                    <h3 class="text-sm font-bold text-slate-900">Registrar Conductor</h3>
                </div>
                <button onclick="document.getElementById('modal-driver').classList.add('hidden')" class="text-slate-600 hover:text-slate-900">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <form id="form-driver" class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo</label>
                    <input type="text" id="driver-name" required class="w-full bg-slate-50 text-xs text-slate-900 px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-emerald-500">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                    <input type="text" id="driver-phone" class="w-full bg-slate-50 text-xs text-slate-900 px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-emerald-500">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Placas de Vehículo</label>
                    <input type="text" id="driver-plate" class="w-full bg-slate-50 text-xs text-slate-900 px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-emerald-500">
                </div>
                <div class="pt-2">
                    <button type="submit" class="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-900 text-xs font-bold rounded-lg transition-colors">Guardar Conductor</button>
                </div>
            </form>
        </div>
    </div>
HTML;

$index = str_replace('    <!-- MODAL: SCREENSHOT VIEWER -->', $driverModalHtml . "\n    <!-- MODAL: SCREENSHOT VIEWER -->", $index);

// Add Driver loading JS
$driverJs = <<<JS
        async function fetchDriversList() {
            try {
                const res = await fetch('/api/drivers.php');
                const data = await res.json();
                const grid = document.getElementById('drivers-grid');
                if (data && data.drivers) {
                    grid.innerHTML = data.drivers.map(d => `
                        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="font-bold text-sm text-slate-900">\${d.name}</h4>
                                    <p class="text-xs text-slate-500">\${d.phone || 'Sin teléfono'}</p>
                                </div>
                                <span class="px-2 py-1 bg-slate-100 rounded text-[10px] font-mono text-slate-600">\${d.vehicle_plate || 'S/P'}</span>
                            </div>
                            <div class="mt-auto pt-3 border-t border-slate-100 flex justify-between">
                                <button onclick="deleteDriver(\${d.id})" class="text-xs text-red-500 hover:text-red-700">Eliminar</button>
                            </div>
                        </div>
                    `).join('');
                }
            } catch (e) {
                console.error(e);
            }
        }
        
        function openNewDriverModal() {
            document.getElementById('modal-driver').classList.remove('hidden');
        }
        
        document.getElementById('form-driver').addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                name: document.getElementById('driver-name').value,
                phone: document.getElementById('driver-phone').value,
                vehicle_plate: document.getElementById('driver-plate').value
            };
            await fetch('/api/drivers.php', { method: 'POST', body: JSON.stringify(payload) });
            document.getElementById('modal-driver').classList.add('hidden');
            e.target.reset();
            fetchDriversList();
        });
        
        async function deleteDriver(id) {
            if (confirm("¿Estás seguro de borrar este conductor?")) {
                await fetch('/api/drivers.php?id=' + id, { method: 'DELETE' });
                fetchDriversList();
            }
        }
        
        async function deleteDevice(uid) {
            if (confirm("¿Estás seguro de borrar este dispositivo de prueba?")) {
                await fetch('/api/devices.php?device_uid=' + uid, { method: 'DELETE' });
                alert("Dispositivo borrado");
                fetchTelemetry();
            }
        }
        
        async function assignDriver(deviceUid) {
            const driverId = prompt("Ingresa el ID del conductor para asignarlo a este dispositivo:");
            if (driverId) {
                await fetch('/api/drivers.php', { method: 'POST', body: JSON.stringify({ action: 'assign_device', driver_id: driverId, device_uid: deviceUid }) });
                fetchTelemetry();
            }
        }
JS;

$index = str_replace('// 12. Módulo de APKs', $driverJs . "\n        // 12. Módulo de APKs", $index);

// Add deleteDevice button and assign button in devices list
$oldDeviceButtons = <<<HTML
<button onclick="selectedDeviceUid='\${dev.device_uid}'; openMdmModalFromHud();" class="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded border border-slate-300 text-xs">
                                Comandos MDM
                            </button>
HTML;

$newDeviceButtons = <<<HTML
<div class="flex gap-1 justify-end">
                            <button onclick="selectedDeviceUid='\${dev.device_uid}'; openMdmModalFromHud();" class="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded border border-slate-300 text-[10px]">MDM</button>
                            <button onclick="assignDriver('\${dev.device_uid}')" class="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded border border-emerald-300 text-[10px]">Asignar Chofer</button>
                            <button onclick="deleteDevice('\${dev.device_uid}')" class="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 text-[10px]">Borrar</button>
                            </div>
HTML;

$index = str_replace($oldDeviceButtons, $newDeviceButtons, $index);

file_put_contents('hostinger_deploy/index.php', $index);
?>
