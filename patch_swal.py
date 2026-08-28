import re

with open('hostinger_deploy/index.php', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace prompts and confirms
code = code.replace('prompt("Para asignar, ingresa el ID NUMÉRICO del conductor (lo puedes ver en la pestaña Conductores):")', 'await Swal.fire({title: "Asignar Conductor", input: "number", inputLabel: "ID Numérico del conductor", showCancelButton: true, confirmButtonColor: "#10b981"}).then(r => r.value)')
code = code.replace('if (confirm("¿Estás seguro de borrar este conductor? Esto desvinculará sus dispositivos asociados."))', 'if ((await Swal.fire({title: "¿Borrar conductor?", text: "Esto desvinculará sus dispositivos.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Sí, borrar"})).isConfirmed)')
code = code.replace('if (confirm("¿Estás seguro de borrar este dispositivo de prueba?"))', 'if ((await Swal.fire({title: "¿Borrar dispositivo?", text: "Se borrará su historial.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ef4444", confirmButtonText: "Sí, borrar"})).isConfirmed)')

# Replace alerts
code = code.replace('alert("Dispositivo borrado");', 'Swal.fire("Borrado", "Dispositivo eliminado", "success");')
code = code.replace('alert("Conductor asignado correctamente");', 'Swal.fire("¡Éxito!", "Conductor asignado correctamente", "success");')
code = code.replace('alert(data.message || "Error");', 'Swal.fire("Atención", data.message || "Error", "info");')
code = code.replace('alert("Comando enviado: " + data.message);', 'Swal.fire("¡Enviado!", data.message, "success");')
code = code.replace('alert("Selecciona un APK válido (menor a 50MB)");', 'Swal.fire("Error", "Selecciona un APK válido (menor a 50MB)", "error");')
code = code.replace('alert("Error de red");', 'Swal.fire("Error", "Fallo de conexión al servidor", "error");')

# Ensure the functions using await Swal are async
# 1. driver assignment
code = code.replace('async function assignDriver(deviceId) {', 'async function assignDriver(deviceId) {') # already async? let's check
code = code.replace('function assignDriver(deviceId) {', 'async function assignDriver(deviceId) {')

# 2. delete driver
code = code.replace('function deleteDriver(driverId) {', 'async function deleteDriver(driverId) {')

# 3. delete device
code = code.replace('function deleteDevice(deviceId) {', 'async function deleteDevice(deviceId) {')

with open('hostinger_deploy/index.php', 'w', encoding='utf-8') as f:
    f.write(code)
print("Patched alerts safely.")
