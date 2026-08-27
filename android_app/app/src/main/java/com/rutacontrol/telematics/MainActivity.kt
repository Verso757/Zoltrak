package com.rutacontrol.telematics

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.rutacontrol.telematics.services.TelemetryForegroundService

class MainActivity : AppCompatActivity() {

    private lateinit var tvStatus: TextView
    private lateinit var tvDeviceId: TextView
    private lateinit var btnToggleService: Button
    private lateinit var btnExitPin: Button

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
        btnToggleService = findViewById(R.id.btnToggleService)
        btnExitPin = findViewById(R.id.btnExitPin)

        val androidId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: "DESCONOCIDO"
        tvDeviceId.text = "ID Dispositivo: $androidId"

        btnToggleService.setOnClickListener {
            if (TelemetryForegroundService.isServiceRunning) {
                stopTelemetryService()
            } else {
                checkPermissionsAndStart()
            }
        }

        btnExitPin.setOnClickListener {
            showSupervisorPinDialog()
        }

        checkPermissionsAndStart()
    }

    override fun onResume() {
        super.onResume()
        updateUIState()
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
                } catch (e: Exception) {
                    // Ignorado si la política del OEM lo restringe
                }
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
            btnToggleService.text = "Pausar Monitoreo"
        } else {
            tvStatus.text = "○ SERVICIO DETENIDO"
            tvStatus.setTextColor(ContextCompat.getColor(this, android.R.color.holo_red_dark))
            btnToggleService.text = "Iniciar Monitoreo 1Hz"
        }
    }

    private fun showSupervisorPinDialog() {
        val input = android.widget.EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
            hint = "Ingresar PIN (Default: 2026)"
        }

        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Desbloqueo de Supervisor")
            .setMessage("Ingrese el PIN de supervisor para salir del modo Kiosco:")
            .setView(input)
            .setPositiveButton("Desbloquear") { _, _ ->
                if (input.text.toString() == "2026") {
                    finishAffinity()
                } else {
                    Toast.makeText(this, "PIN Incorrecto", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }
}
