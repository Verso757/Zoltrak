package com.rutacontrol.telematics

import android.Manifest
import android.app.ActivityManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.os.UserManager
import android.provider.Settings
import android.util.Log
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.rutacontrol.telematics.receivers.DeviceAdminPolicyReceiver
import com.rutacontrol.telematics.services.TelemetryForegroundService

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "MainActivity"
    }

    private lateinit var tvStatus: TextView
    private lateinit var tvDeviceId: TextView
    private lateinit var btnOpenSalesApp: Button
    private lateinit var btnOpenWhatsApp: Button
    private lateinit var btnOpenTimemark: Button
    private lateinit var btnBluetoothPrinter: Button
    private lateinit var btnClearSalesCache: Button
    private lateinit var btnToggleService: Button
    private lateinit var btnExitPin: Button

    private val defaultSupervisorPin = "7575"
    private val masterSupervisorPin = "2026"
    private val prefsKeySalesPkg = "sales_app_package"
    private val defaultSalesPkg = "com.lechelaimperial.com.ventas"

    private val requiredPermissions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.POST_NOTIFICATIONS,
            Manifest.permission.FOREGROUND_SERVICE_LOCATION
        )
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.POST_NOTIFICATIONS
        )
    } else {
        arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.entries.all { it.value }
        if (allGranted) {
            checkBatteryOptimizations()
            startTelemetryService()
        } else {
            Toast.makeText(this, "Permisos de ubicación requeridos para monitoreo de ruta", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvStatus = findViewById(R.id.tvStatus)
        tvDeviceId = findViewById(R.id.tvDeviceId)
        btnOpenSalesApp = findViewById(R.id.btnOpenSalesApp)
        btnOpenWhatsApp = findViewById(R.id.btnOpenWhatsApp)
        btnOpenTimemark = findViewById(R.id.btnOpenTimemark)
        btnBluetoothPrinter = findViewById(R.id.btnBluetoothPrinter)
        btnClearSalesCache = findViewById(R.id.btnClearSalesCache)
        btnToggleService = findViewById(R.id.btnToggleService)
        btnExitPin = findViewById(R.id.btnExitPin)

        val androidId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: "DESCONOCIDO"
        tvDeviceId.text = "ID Dispositivo: $androidId"

        // Aplicar políticas de Device Owner, Home Launcher y LockTask
        applyDeviceOwnerKioskPolicies()

        // 1. Abrir App de Ventas
        btnOpenSalesApp.setOnClickListener {
            launchSalesApp()
        }

        // 2. Abrir WhatsApp
        btnOpenWhatsApp.setOnClickListener {
            launchAppByPackages(
                listOf("com.whatsapp", "com.whatsapp.w4b"),
                "WhatsApp"
            )
        }

        // 3. Abrir Timemark / Evidencias
        btnOpenTimemark.setOnClickListener {
            launchAppByPackages(
                listOf("com.oceangalaxy.camera.new", "com.timemark.camera", "com.timestampcamera.auto"),
                "Timemark"
            )
        }

        // 4. Enlazar Impresora Bluetooth (Libre para choferes, sin PIN)
        btnBluetoothPrinter.setOnClickListener {
            openBluetoothSettings()
        }

        // 5. Limpiar Caché de Apps (Libre para choferes)
        btnClearSalesCache.setOnClickListener {
            clearSalesAppCache()
        }

        // 6. Pausar / Iniciar Telemetría (Protegido con PIN)
        btnToggleService.setOnClickListener {
            promptPin("Pausar / Iniciar Telemetría") {
                if (TelemetryForegroundService.isServiceRunning) {
                    stopTelemetryService()
                } else {
                    checkPermissionsAndStart()
                }
            }
        }

        // 7. Menú de Supervisor (Wi-Fi, Ajustes, Salida de Kiosco)
        btnExitPin.setOnClickListener {
            promptPin("Acceso Menú Supervisor") {
                showSupervisorMenu()
            }
        }

        checkPermissionsAndStart()
    }

    override fun onResume() {
        super.onResume()
        updateUIState()
        applyDeviceOwnerKioskPolicies()
    }

    private fun getSalesAppPackage(): String {
        val prefs = getSharedPreferences("rutacontrol_config", Context.MODE_PRIVATE)
        return prefs.getString(prefsKeySalesPkg, defaultSalesPkg) ?: defaultSalesPkg
    }

    private fun setSalesAppPackage(pkgName: String) {
        val prefs = getSharedPreferences("rutacontrol_config", Context.MODE_PRIVATE)
        prefs.edit().putString(prefsKeySalesPkg, pkgName.trim()).apply()
        Toast.makeText(this, "Paquete de ventas guardado: $pkgName", Toast.LENGTH_SHORT).show()
    }

    private fun launchSalesApp() {
        val pkg = getSalesAppPackage()
        val launchIntent = packageManager.getLaunchIntentForPackage(pkg)
        if (launchIntent != null) {
            startActivity(launchIntent)
        } else {
            Toast.makeText(this, "App de ventas ($pkg) no encontrada. Configure el paquete en Menú Supervisor.", Toast.LENGTH_LONG).show()
        }
    }

    private fun openBluetoothSettings() {
        try {
            val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(this, "No se pudo abrir Bluetooth: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun clearSalesAppCache() {
        val pkg = getSalesAppPackage()
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(this, DeviceAdminPolicyReceiver::class.java)

        try {
            // Si somos Device Owner, podemos limpiar datos / forzar detención
            if (dpm.isDeviceOwnerApp(packageName)) {
                try {
                    val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
                    am.killBackgroundProcesses(pkg)
                } catch (e: Exception) {}
            }

            // Abrir la pantalla de almacenamiento de la app para limpieza inmediata si lo requiere el OS
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$pkg")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
            Toast.makeText(this, "Procesos reiniciados. Presione 'Borrar Caché' si es necesario.", Toast.LENGTH_LONG).show()
        } catch (e: Exception) {
            Toast.makeText(this, "Error al reiniciar app de ventas: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun checkPermissionsAndStart() {
        val missingPermissions = requiredPermissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missingPermissions.isNotEmpty()) {
            permissionLauncher.launch(missingPermissions.toTypedArray())
        } else {
            checkBatteryOptimizations()
            startTelemetryService()
        }
    }

    private fun checkBatteryOptimizations() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(PowerManager::class.java)
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                try {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:$packageName")
                    }
                    startActivity(intent)
                } catch (e: Exception) {}
            }
        }
    }

    private fun startTelemetryService() {
        val serviceIntent = Intent(this, TelemetryForegroundService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
        updateUIState()
    }

    private fun stopTelemetryService() {
        val serviceIntent = Intent(this, TelemetryForegroundService::class.java)
        stopService(serviceIntent)
        updateUIState()
    }

    private fun updateUIState() {
        val isRunning = TelemetryForegroundService.isServiceRunning
        if (isRunning) {
            tvStatus.text = "● TRANSMITIENDO 1Hz A HOSTINGER"
            tvStatus.setTextColor(ContextCompat.getColor(this, android.R.color.holo_green_dark))
            btnToggleService.text = "Pausar Telemetría (PIN)"
        } else {
            tvStatus.text = "○ SERVICIO DETENIDO"
            tvStatus.setTextColor(ContextCompat.getColor(this, android.R.color.holo_red_dark))
            btnToggleService.text = "Iniciar Telemetría 1Hz"
        }
    }

    private fun launchAppByPackages(candidatePackages: List<String>, appName: String) {
        var launched = false
        for (pkg in candidatePackages) {
            val launchIntent = packageManager.getLaunchIntentForPackage(pkg)
            if (launchIntent != null) {
                try {
                    startActivity(launchIntent)
                    launched = true
                    break
                } catch (e: Exception) {}
            }
        }

        if (!launched) {
            Toast.makeText(this, "$appName no está instalada en el dispositivo.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun promptPin(title: String, onSuccess: () -> Unit) {
        val input = EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
            hint = "Ingrese PIN de 4 dígitos"
        }

        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage("Ingrese el PIN de Supervisor para continuar:")
            .setView(input)
            .setPositiveButton("Verificar") { _, _ ->
                val entered = input.text.toString().trim()
                if (entered == defaultSupervisorPin || entered == masterSupervisorPin) {
                    onSuccess()
                } else {
                    Toast.makeText(this, "PIN Incorrecto", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun showSupervisorMenu() {
        val options = arrayOf(
            "📡 Diagnóstico de Telemetría y Enlace a Hostinger",
            "🛠️ Habilitar Depuración USB / Opciones de Desarrollador",
            "📶 Configurar Red Wi-Fi",
            "⚙️ Abrir Ajustes de Android",
            "🔓 Pausar Kiosco (Liberar Sistema Temporalmente)",
            "📦 Configurar Nombre de Paquete App de Ventas",
            "🚪 Salir de la Aplicación",
            "⚠️ DESACTIVAR DEVICE OWNER (Desvincular Modo Empresa)"
        )

        AlertDialog.Builder(this)
            .setTitle("Panel de Supervisor / SuperAdmin")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> {
                        showDiagnosticsDialog()
                    }
                    1 -> {
                        // Habilitar Depuración USB y abrir Opciones de Desarrollador
                        enableUsbDebuggingAndOpenDevSettings()
                    }
                    2 -> {
                        // Temporalmente permitir configurar Wi-Fi
                        stopKioskLockTask()
                        unlockSupervisorRestrictions()
                        try {
                            startActivity(Intent(Settings.ACTION_WIFI_SETTINGS).apply {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                            })
                        } catch (e: Exception) {
                            Toast.makeText(this, "Abriendo ajustes: ${e.message}", Toast.LENGTH_SHORT).show()
                        }
                    }
                    3 -> {
                        stopKioskLockTask()
                        unlockSupervisorRestrictions()
                        try {
                            startActivity(Intent(Settings.ACTION_SETTINGS).apply {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                            })
                        } catch (e: Exception) {
                            Toast.makeText(this, "Abriendo ajustes: ${e.message}", Toast.LENGTH_SHORT).show()
                        }
                    }
                    4 -> {
                        // Pausar modo kiosco y liberar sistema temporalmente
                        stopKioskLockTask()
                        unlockSupervisorRestrictions()
                        Toast.makeText(this, "Kiosco pausado. Presione Inicio para ir al Launcher de Android.", Toast.LENGTH_LONG).show()
                        val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                            addCategory(Intent.CATEGORY_HOME)
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        try {
                            startActivity(homeIntent)
                        } catch (e: Exception) {}
                    }
                    5 -> {
                        showConfigurePackageDialog()
                    }
                    6 -> {
                        // Salir de la aplicación
                        stopKioskLockTask()
                        unlockSupervisorRestrictions()
                        finishAffinity()
                    }
                    7 -> {
                        // Desactivar Device Owner / Modo Empresa
                        confirmDisableDeviceOwner()
                    }
                }
            }
            .setNegativeButton("Cerrar", null)
            .show()
    }

    private fun enableUsbDebuggingAndOpenDevSettings() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(this, DeviceAdminPolicyReceiver::class.java)

        stopKioskLockTask()
        unlockSupervisorRestrictions()

        var successDirectSetting = false
        if (dpm.isDeviceOwnerApp(packageName)) {
            try {
                // Device Owner puede habilitar directamente la configuración global de ADB
                dpm.setGlobalSetting(adminComponent, Settings.Global.ADB_ENABLED, "1")
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_DEBUGGING_FEATURES)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_USB_FILE_TRANSFER)
                successDirectSetting = true
            } catch (e: Exception) {
                Log.w(TAG, "Error aplicando global ADB setting: ${e.message}")
            }
        }

        val msg = if (successDirectSetting) {
            "✅ Depuración USB activada por política Device Owner.\n\nAbriendo Opciones de Desarrollador para verificar."
        } else {
            "Abriendo Opciones de Desarrollador de Android para activar Depuración USB manualmente."
        }

        Toast.makeText(this, msg, Toast.LENGTH_LONG).show()

        // Intentar abrir directamente Opciones de Desarrollador
        try {
            val devIntent = Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(devIntent)
        } catch (e: Exception) {
            // Fallback a Ajustes generales
            try {
                startActivity(Intent(Settings.ACTION_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                })
            } catch (ex: Exception) {}
        }
    }

    private fun showDiagnosticsDialog() {
        val deviceUid = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: "DESCONOCIDO"
        val lastTime = if (TelemetryForegroundService.lastTransmissionTime > 0) {
            val secondsAgo = (System.currentTimeMillis() - TelemetryForegroundService.lastTransmissionTime) / 1000
            "Hace $secondsAgo segundos"
        } else {
            "Nunca / Esperando conexión"
        }

        val msg = """
            📱 ID del Dispositivo (UID):
            $deviceUid

            🌐 Servidor Destino:
            https://zoltrak.websolutionsgarcia.com/api/telemetry.php

            📊 Paquetes Enviados: ${TelemetryForegroundService.totalPacketsSent}
            ⏱️ Último Enlace: $lastTime
            🛰️ Coordenadas GPS: ${TelemetryForegroundService.lastGpsCoordinates}
            📡 Código HTTP: ${TelemetryForegroundService.lastHttpCode}
            📝 Estado / Error: ${TelemetryForegroundService.lastErrorReason}
            💬 Respuesta Servidor:
            ${TelemetryForegroundService.lastServerResponse}
        """.trimIndent()

        AlertDialog.Builder(this)
            .setTitle("📡 Diagnóstico de Telemetría")
            .setMessage(msg)
            .setPositiveButton("🚀 Forzar Envío de Prueba") { _, _ ->
                Toast.makeText(this, "Enviando paquete de prueba a Hostinger...", Toast.LENGTH_SHORT).show()
                // Ejecutar ping de prueba estático seguro
                TelemetryForegroundService.forceImmediatePing(this) { success, result ->
                    AlertDialog.Builder(this)
                        .setTitle(if (success) "✅ Enlace Exitoso" else "❌ Error de Enlace")
                        .setMessage(result)
                        .setPositiveButton("Aceptar", null)
                        .show()
                }
            }
            .setNeutralButton("🔄 Actualizar", { _, _ ->
                showDiagnosticsDialog()
            })
            .setNegativeButton("Cerrar", null)
            .show()
    }

    private fun confirmDisableDeviceOwner() {
        val input = EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
            hint = "Escriba el PIN SuperAdmin"
        }

        AlertDialog.Builder(this)
            .setTitle("⚠️ Desactivar Device Owner")
            .setMessage("Esta acción desvinculará completamente el modo empresa y devolverá el teléfono a su estado de fábrica/usuario libre.\n\nEscriba el PIN SuperAdmin para confirmar:")
            .setView(input)
            .setPositiveButton("DESACTIVAR AHORA") { _, _ ->
                val entered = input.text.toString().trim()
                if (entered == masterSupervisorPin || entered == defaultSupervisorPin) {
                    performDisableDeviceOwner()
                } else {
                    Toast.makeText(this, "PIN SuperAdmin inválido. Acción cancelada.", Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun performDisableDeviceOwner() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(this, DeviceAdminPolicyReceiver::class.java)

        try {
            stopKioskLockTask()

            if (dpm.isDeviceOwnerApp(packageName)) {
                // 1. Limpiar todas las restricciones de usuario
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_INSTALL_APPS)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_UNINSTALL_APPS)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_FACTORY_RESET)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_SAFE_BOOT)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_MOUNT_PHYSICAL_MEDIA)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_USB_FILE_TRANSFER)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_CONFIG_MOBILE_NETWORKS)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_CONFIG_LOCATION)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_CONFIG_WIFI)

                // 2. Restaurar Google Play Store
                try {
                    dpm.setApplicationHidden(adminComponent, "com.android.vending", false)
                } catch (e: Exception) {}

                // 3. Limpiar actividad preferida fija
                dpm.clearPackagePersistentPreferredActivities(adminComponent, packageName)

                // 4. Limpiar paquetes de LockTask
                dpm.setLockTaskPackages(adminComponent, arrayOf())

                // 5. Eliminar el estado de Device Owner
                dpm.clearDeviceOwnerApp(packageName)

                Toast.makeText(this, "✅ Device Owner Desactivado con Éxito. Teléfono liberado.", Toast.LENGTH_LONG).show()
            } else {
                Toast.makeText(this, "La app no es Device Owner.", Toast.LENGTH_SHORT).show()
            }
            finishAffinity()
        } catch (e: Exception) {
            Toast.makeText(this, "Error al desactivar Device Owner: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun unlockSupervisorRestrictions() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(this, DeviceAdminPolicyReceiver::class.java)
        if (dpm.isDeviceOwnerApp(packageName)) {
            try {
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_CONFIG_WIFI)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_CONFIG_MOBILE_NETWORKS)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_CONFIG_LOCATION)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_USB_FILE_TRANSFER)
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    dpm.setLockTaskFeatures(
                        adminComponent,
                        DevicePolicyManager.LOCK_TASK_FEATURE_SYSTEM_INFO or
                        DevicePolicyManager.LOCK_TASK_FEATURE_NOTIFICATIONS or
                        DevicePolicyManager.LOCK_TASK_FEATURE_HOME or
                        DevicePolicyManager.LOCK_TASK_FEATURE_KEYGUARD or
                        DevicePolicyManager.LOCK_TASK_FEATURE_GLOBAL_ACTIONS
                    )
                }
            } catch (e: Exception) {}
        }
    }

    private fun applyDeviceOwnerKioskPolicies() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(this, DeviceAdminPolicyReceiver::class.java)

        if (dpm.isDeviceOwnerApp(packageName)) {
            try {
                // 1. Establecer RutaControl como el Home Launcher persistente
                val filter = android.content.IntentFilter(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_HOME)
                    addCategory(Intent.CATEGORY_DEFAULT)
                }
                val activity = ComponentName(this, MainActivity::class.java)
                dpm.addPersistentPreferredActivity(adminComponent, filter, activity)

                // 2. Permitir LockTask para nuestra app y la app de ventas/WhatsApp/Timemark
                val salesPkg = getSalesAppPackage()
                val allowedPackages = arrayOf(
                    packageName,
                    salesPkg,
                    "com.lechelaimperial.com.ventas",
                    "com.oceangalaxy.camera.new",
                    "com.timemark.camera",
                    "com.whatsapp",
                    "com.whatsapp.w4b",
                    "com.android.settings",
                    "com.android.settings.intelligence"
                ).distinct().toTypedArray()
                dpm.setLockTaskPackages(adminComponent, allowedPackages)

                // 3. Activar funciones de LockTask (Barra de estado mínima, notificaciones bloqueadas)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    dpm.setLockTaskFeatures(
                        adminComponent,
                        DevicePolicyManager.LOCK_TASK_FEATURE_NONE or
                        DevicePolicyManager.LOCK_TASK_FEATURE_SYSTEM_INFO
                    )
                }

                // 4. Bloquear la pantalla en modo Kiosco (Lock Task)
                startKioskLockTask()

                Toast.makeText(this, "🛡️ RutaControl: Dispositivo Asegurado en Modo Kiosco", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, "Info de políticas: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun startKioskLockTask() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        if (dpm.isDeviceOwnerApp(packageName)) {
            try {
                if (dpm.isLockTaskPermitted(packageName)) {
                    startLockTask()
                }
            } catch (e: Exception) {}
        }
    }

    private fun stopKioskLockTask() {
        try {
            stopLockTask()
        } catch (e: Exception) {}
    }

    private fun unlockWifiTemporarily() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(this, DeviceAdminPolicyReceiver::class.java)
        if (dpm.isDeviceOwnerApp(packageName)) {
            try {
                dpm.clearUserRestriction(adminComponent, UserManager.DISALLOW_CONFIG_WIFI)
            } catch (e: Exception) {}
        }
    }

    private fun showConfigurePackageDialog() {
        val input = EditText(this).apply {
            setText(getSalesAppPackage())
            hint = "ej: com.empresa.ventas"
        }

        AlertDialog.Builder(this)
            .setTitle("Paquete App de Ventas")
            .setMessage("Escriba el nombre de paquete de la aplicación de ventas a enlazar:")
            .setView(input)
            .setPositiveButton("Guardar") { _, _ ->
                setSalesAppPackage(input.text.toString())
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }
}
