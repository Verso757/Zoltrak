package com.rutacontrol.telematics

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class RutaControlApp : Application() {

    companion object {
        const val TELEMETRY_CHANNEL_ID = "rutacontrol_telemetry_channel"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Telemetría de Flota 1Hz"
            val descriptionText = "Transmisión en tiempo real de posición GPS y consumo de combustible"
            val importance = NotificationManager.IMPORTANCE_LOW
            val channel = NotificationChannel(TELEMETRY_CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannel(channel)
        }
    }
}
