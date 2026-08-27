package com.rutacontrol.telematics.services

import android.annotation.SuppressLint
import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.rutacontrol.telematics.MainActivity
import com.rutacontrol.telematics.R
import com.rutacontrol.telematics.RutaControlApp
import kotlinx.coroutines.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import kotlin.math.sqrt

class TelemetryForegroundService : Service(), SensorEventListener {

    companion object {
        private const val TAG = "TelemetryService"
        private const val NOTIFICATION_ID = 1001
        
        // ENDPOINT EN PRODUCCIÓN
        private const val HOSTINGER_API_URL = "https://zoltrak.websolutionsgarcia.com/api/telemetry.php"
        
        var isServiceRunning = false
            private set
    }

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    
    private var sensorManager: SensorManager? = null
    private var currentAccelG: Float = 0.0f
    private var lastLocation: Location? = null
    
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .writeTimeout(5, TimeUnit.SECONDS)
        .build()

    override fun onCreate() {
        super.onCreate()
        isServiceRunning = true
        initSensors()
        initLocationClient()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = buildForegroundNotification("Transmisión GPS activa (1 Hz)")
        startForeground(NOTIFICATION_ID, notification)
        startLocationUpdates()
        return START_STICKY
    }

    private fun initSensors() {
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        val accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        accelerometer?.let {
            sensorManager?.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
    }

    private fun initLocationClient() {
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                for (location in locationResult.locations) {
                    lastLocation = location
                    sendTelemetryPacket(location)
                }
            }
        }
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000L)
            .setMinUpdateIntervalMillis(800L)
            .setMaxUpdateDelayMillis(1200L)
            .setMinUpdateDistanceMeters(0.0f)
            .build()

        try {
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
        } catch (e: Exception) {
            Log.e(TAG, "Error iniciando actualizaciones de ubicación: ${e.message}")
        }
    }

    private fun sendTelemetryPacket(location: Location) {
        serviceScope.launch {
            try {
                val deviceUid = getDeviceUniqueId()
                val speedKmh = location.speed * 3.6f // m/s a km/h
                val (batteryLevel, isCharging) = getBatteryStatus()

                // Estimación de combustible en tiempo real (L/hora)
                val fuelRateLh = if (speedKmh > 5.0) {
                    (speedKmh * 0.115f).toDouble()
                } else {
                    1.2 // Ralentí
                }

                val payload = JSONObject().apply {
                    put("device_uid", deviceUid)
                    put("lat", location.latitude)
                    put("lng", location.longitude)
                    put("speed", speedKmh)
                    put("accel_g", currentAccelG)
                    put("heading", location.bearing.toInt())
                    put("battery", batteryLevel)
                    put("charging", isCharging)
                    put("fuel_rate", fuelRateLh)
                    put("apk_version", "1.0.0")
                    put("model", "${Build.MANUFACTURER} ${Build.MODEL}")
                    put("os", "Android ${Build.VERSION.RELEASE}")
                }

                val mediaType = "application/json; charset=utf-8".toMediaType()
                val body = payload.toString().toRequestBody(mediaType)
                val request = Request.Builder()
                    .url(HOSTINGER_API_URL)
                    .post(body)
                    .build()

                httpClient.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        Log.w(TAG, "Fallo HTTP: ${response.code}")
                    } else {
                        Log.d(TAG, "Telemetría 1Hz enviada con éxito a Hostinger")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error enviando telemetría: ${e.message}")
            }
        }
    }

    @SuppressLint("HardwareIds")
    private fun getDeviceUniqueId(): String {
        return Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: "DEVICE_UNKNOWN"
    }

    private fun getBatteryStatus(): Pair<Int, Boolean> {
        val batteryIntent = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = batteryIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val status = batteryIntent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL
        val batteryPct = if (level >= 0 && scale > 0) (level * 100 / scale) else 100
        return Pair(batteryPct, isCharging)
    }

    private fun buildForegroundNotification(content: String): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, RutaControlApp.TELEMETRY_CHANNEL_ID)
            .setContentTitle("RutaControl Telematics")
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type == Sensor.TYPE_ACCELEROMETER) {
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]
            val gMagnitude = (sqrt((x * x + y * y + z * z).toDouble()) / 9.80665).toFloat() - 1.0f
            currentAccelG = String.format("%.2f", gMagnitude).toFloatOrNull() ?: 0.0f
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
        fusedLocationClient.removeLocationUpdates(locationCallback)
        sensorManager?.unregisterListener(this)
        serviceScope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
