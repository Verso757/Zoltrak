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

    private lateinit var tvStatus: TextView
    private lateinit var tvDeviceId: TextView
    private lateinit var btnOpenSalesApp: Button
    private lateinit var btnBluetoothPrinter: Button
    private lateinit var btnClearSalesCache: Button
    private lateinit var btnToggleService: Button
    private lateinit var btnExitPin: Button

    private val defaultSupervisorPin = "2026"
    private val prefsKeySalesPkg = "sales_app_package"

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
        btnBluetoothPrinter = findViewById(R.id.btnBluetoothPrinter)
        btnClearSalesCache = findViewById(R.id.btnClearSalesCache)
        btnToggleService = findViewById(R.id.btnToggleService)
        btnExitPin = findViewById(R.id.btnExitPin)

        val androidId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: "DESCONOCIDO"
        tvDeviceId.text = "ID Dispositivo: $androidId"

        // 1. Abrir App de Ventas
        btnOpenSalesApp.setOnClickListener {
            launchSalesApp()
        }

        // 2. Enlazar Impresora Bluetooth (Libre para choferes, sin PIN)
        btnBluetoothPrinter.setOnClickListener {
            openBluetoothSettings()
        }

        // 3. Limpiar Caché de la App de Ventas (Libre para choferes)
        btnClearSalesCache.setOnClickListener {
            clearSalesAppCache()
        }

        // 4. Pausar / Iniciar Telemetría (Protegido con PIN)
        btnToggleService.setOnClickListener {
            promptPin("Pausar / Iniciar Telemetría") {
                if (TelemetryForegroundService.isServiceRunning) {
                    stopTelemetryService()
                } else {
                    checkPermissionsAndStart()
                }
            }
        }

        // 5. Menú de Supervisor (Wi-Fi, Ajustes, Salida de Kiosco)
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
    }

    private fun getSalesAppPackage(): String {
        val prefs = getSharedPreferences("rutacontrol_config", Context.MODE_PRIVATE)
        return prefs.getString(prefsKeySalesPkg, "com.ventas.app") ?: "com.ventas.app"
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

    private fun promptPin(title: String, onSuccess: () -> Unit) {
        val input = EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
            hint = "Ingrese PIN (Default: $defaultSupervisorPin)"
        }

        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage("Ingrese el PIN de Supervisor para continuar:")
            .setView(input)
            .setPositiveButton("Verificar") { _, _ ->
                if (input.text.toString() == defaultSupervisorPin) {
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
            "📶 Configurar Red Wi-Fi",
            "⚙️ Abrir Ajustes de Android",
            "📦 Configurar Nombre de Paquete App de Ventas",
            "🚪 Salir del Modo Kiosco"
        )

        AlertDialog.Builder(this)
            .setTitle("Panel de Supervisor")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> {
                        // Temporalmente permitir configurar Wi-Fi
                        unlockWifiTemporarily()
                        startActivity(Intent(Settings.ACTION_WIFI_SETTINGS))
                    }
                    1 -> {
                        startActivity(Intent(Settings.ACTION_SETTINGS))
                    }
                    2 -> {
                        showConfigurePackageDialog()
                    }
                    3 -> {
                        finishAffinity()
                    }
                }
            }
            .setNegativeButton("Cerrar", null)
            .show()
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
