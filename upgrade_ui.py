import re

with open('/tmp/original_index.php', 'r', encoding='utf-8') as f:
    code = f.read()

# Make the theme "Light / Sky Blue" globally
replacements = {
    'from-emerald-500 to-teal-700': 'from-sky-500 to-blue-600',
    'shadow-emerald-950/50': 'shadow-sky-500/30',
    'bg-emerald-500/10': 'bg-sky-500/10',
    'text-emerald-600': 'text-sky-600',
    'border-emerald-500/20': 'border-sky-500/20',
    'bg-slate-50/80': 'bg-slate-100',
    'bg-slate-200 text-slate-900 shadow-sm': 'bg-sky-50 text-sky-700 font-bold shadow-sm', # active tab
    'text-slate-600 hover:text-slate-800': 'text-slate-500 hover:bg-slate-100 hover:text-slate-700', # inactive tab
    
    # Map markers & buttons
    'bg-emerald-500 hover:bg-emerald-600': 'bg-sky-600 hover:bg-sky-500',
    'bg-emerald-600': 'bg-sky-600',
    'shadow-emerald-500/20': 'shadow-sky-600/20',
    'bg-slate-800': 'bg-slate-100', # Offline badges
    'border-slate-700': 'border-slate-300',
    'text-slate-300': 'text-slate-600',
    'text-slate-400': 'text-slate-500',
    'bg-slate-900': 'bg-white', # Cards
    'bg-slate-900/40': 'bg-slate-900/20', # Modals backdrop
    'bg-slate-900/90': 'bg-white/95', # Hud
    'bg-slate-950': 'bg-slate-50',
    'text-white': 'text-slate-800', 
    'text-slate-200': 'text-slate-700',
    'text-slate-100': 'text-slate-900',
    'border-slate-800': 'border-slate-200',
    'bg-slate-800/50': 'bg-slate-50',
    'bg-slate-800 hover:bg-slate-700': 'bg-slate-100 hover:bg-slate-200',
}

for old, new in replacements.items():
    code = code.replace(old, new)

# Note: The above text-white -> text-slate-800 might break some specific buttons (like primary buttons).
# Let's fix primary buttons manually if needed.
# For instance, bg-sky-600 text-slate-800 is bad contrast. It should be text-white.
code = code.replace('bg-sky-600 text-slate-800', 'bg-sky-600 text-white')
code = code.replace('bg-sky-600 hover:bg-sky-500 text-slate-800', 'bg-sky-600 hover:bg-sky-500 text-white')
code = code.replace('bg-red-500 hover:bg-red-600 text-slate-800', 'bg-red-500 hover:bg-red-600 text-white')

# Also fix the map JS for active tab classes in switchTab
old_switch = """        function switchTab(tabId) {
            document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('bg-sky-50', 'text-sky-700', 'font-bold', 'shadow-sm');
                b.classList.add('text-slate-500', 'hover:bg-slate-100', 'hover:text-slate-700');
            });

            const targetView = document.getElementById(`view-${tabId}`);
            const targetBtn = document.getElementById(`tab-btn-${tabId}`);
            if (targetView && targetBtn) {
                targetView.classList.remove('hidden');
                targetBtn.classList.add('bg-sky-50', 'text-sky-700', 'font-bold', 'shadow-sm');
                targetBtn.classList.remove('text-slate-500', 'hover:bg-slate-100', 'hover:text-slate-700');
            }"""
            
old_switch_original = """        function switchTab(tabId) {
            document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('bg-sky-50 text-sky-700 font-bold shadow-sm', 'text-slate-900', 'shadow-sm');
                b.classList.add('text-slate-500 hover:bg-slate-100 hover:text-slate-700');
            });

            const targetView = document.getElementById(`view-${tabId}`);
            const targetBtn = document.getElementById(`tab-btn-${tabId}`);
            if (targetView && targetBtn) {
                targetView.classList.remove('hidden');
                targetBtn.classList.add('bg-sky-50 text-sky-700 font-bold shadow-sm', 'text-slate-900', 'shadow-sm');
                targetBtn.classList.remove('text-slate-500 hover:bg-slate-100 hover:text-slate-700');
            }"""

# Actually, the python replacement above already did string replacement on the JS code inside switchTab:
# 'bg-slate-200 text-slate-900 shadow-sm' -> 'bg-sky-50 text-sky-700 font-bold shadow-sm'
# 'text-slate-600 hover:text-slate-800' -> 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
# However, the JS classList.remove() takes multiple arguments separated by commas, NOT a single string with spaces.
# Wait, original JS was:
# b.classList.remove('bg-slate-200', 'text-slate-900', 'shadow-sm');
# b.classList.add('text-slate-600');
# Let's fix that JS manually in python with Regex.

code = re.sub(
    r"b\.classList\.remove\('bg-[^']+', 'text-[^']+', 'shadow-sm'\);",
    "b.classList.remove('bg-sky-50', 'text-sky-700', 'font-bold', 'shadow-sm');",
    code
)
code = re.sub(
    r"b\.classList\.add\('text-slate-600'\);",
    "b.classList.add('text-slate-500', 'hover:bg-slate-100', 'hover:text-slate-700');",
    code
)

code = re.sub(
    r"targetBtn\.classList\.add\('bg-[^']+', 'text-[^']+', 'shadow-sm'\);",
    "targetBtn.classList.add('bg-sky-50', 'text-sky-700', 'font-bold', 'shadow-sm');",
    code
)
code = re.sub(
    r"targetBtn\.classList\.remove\('text-slate-600'\);",
    "targetBtn.classList.remove('text-slate-500', 'hover:bg-slate-100', 'hover:text-slate-700');",
    code
)

# Bring back SweetAlerts
code = code.replace('prompt("Para asignar, ingresa el ID NUMÉRICO del conductor (lo puedes ver en la pestaña Conductores):")', 'await Swal.fire({title: "Asignar Conductor", input: "number", inputLabel: "ID Numérico del conductor", showCancelButton: true, confirmButtonColor: "#0ea5e9"}).then(r => r.value)')
code = code.replace('if (confirm("¿Estás seguro de borrar este conductor? Esto desvinculará sus dispositivos asociados."))', 'if ((await Swal.fire({title: "¿Borrar conductor?", text: "Esto desvinculará sus dispositivos.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Sí, borrar"})).isConfirmed)')
code = code.replace('if (confirm("¿Estás seguro de borrar este dispositivo de prueba?"))', 'if ((await Swal.fire({title: "¿Borrar dispositivo?", text: "Se borrará su historial.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Sí, borrar"})).isConfirmed)')

code = code.replace('alert("Dispositivo borrado");', 'Swal.fire("Borrado", "Dispositivo eliminado", "success");')
code = code.replace('alert("Conductor asignado correctamente");', 'Swal.fire("¡Éxito!", "Conductor asignado correctamente", "success");')
code = code.replace('alert(data.message || "Error");', 'Swal.fire("Atención", data.message || "Error", "info");')
code = code.replace('alert("Comando enviado: " + data.message);', 'Swal.fire("¡Enviado!", data.message, "success");')
code = code.replace('alert("Selecciona un APK válido (menor a 50MB)");', 'Swal.fire("Error", "Selecciona un APK válido (menor a 50MB)", "error");')
code = code.replace('alert("Error de red");', 'Swal.fire("Error", "Fallo de conexión al servidor", "error");')

# Ensure script for Swal is present
if 'sweetalert2' not in code:
    code = code.replace('</head>', '<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>\n</head>')

with open('hostinger_deploy/index.php', 'w', encoding='utf-8') as f:
    f.write(code)

print("Upgrade complete")
