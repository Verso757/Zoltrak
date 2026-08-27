package com.rutacontrol.telematics.receivers

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.UserManager
import android.provider.Settings
import android.widget.Toast

class DeviceAdminPolicyReceiver : DeviceAdminReceiver() {

    override fun onProfileProvisioningComplete(context: Context, intent: Intent) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(context, DeviceAdminPolicyReceiver::class.java)

        if (dpm.isDeviceOwnerApp(context.packageName)) {
            // =========================================================================
            // 1. BLOQUEOS ESTRICTOS DE FLOTA (SIN PLAY STORE, SIN APPS DE TERCEROS)
            // =========================================================================
            
            // No permitir instalar aplicaciones externas ni desde APKs desconocidos
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_INSTALL_APPS)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_INSTALL_UNKNOWN_SOURCES)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_UNINSTALL_APPS)
            
            // Deshabilitar Google Play Store para evitar descargas no corporativas
            try {
                dpm.setApplicationHidden(adminComponent, "com.android.vending", true)
            } catch (e: Exception) {
                // Si el dispositivo no tiene Google Play Store nativo
            }

            // Bloquear reseteo de fábrica y modo seguro para que el chofer no burle el sistema
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_FACTORY_RESET)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_SAFE_BOOT)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_MOUNT_PHYSICAL_MEDIA)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_USB_FILE_TRANSFER)

            // =========================================================================
            // 2. FORZAR DATOS MÓVILES Y GPS SIEMPRE ACTIVOS (NO PERMITIR APAGARLOS)
            // =========================================================================
            
            // Bloquear modificación o apagado de Redes Móviles / Datos
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_CONFIG_MOBILE_NETWORKS)
            
            // Bloquear apagado de Ubicación / GPS (Forzar precisión alta permanente)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_CONFIG_LOCATION)
            dpm.setLocationEnabled(adminComponent, true)

            // Bloquear manipulación de Wi-Fi para choferes (Supervisor accede con PIN)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_CONFIG_WIFI)

            // =========================================================================
            // 3. BLUETOOTH LIBRE PARA ENLAZAR IMPRESORAS DE TICKETS
            // =========================================================================
            // NO agregamos DISALLOW_BLUETOOTH ni DISALLOW_CONFIG_BLUETOOTH
            // Esto permite que el chofer abra el selector de impresoras térmicas Bluetooth libremente.
            dpm.setBluetoothContactSharingDisabled(adminComponent, false)

            // =========================================================================
            // 4. LANZADOR KIOSCO CORPORATIVO PREDETERMINADO
            // =========================================================================
            val filter = android.content.IntentFilter(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                addCategory(Intent.CATEGORY_DEFAULT)
            }
            val activity = ComponentName(context, "com.rutacontrol.telematics.MainActivity")
            dpm.addPersistentPreferredActivity(adminComponent, filter, activity)

            // Mantener pantalla encendida mientras carga en el vehículo
            dpm.setGlobalSetting(
                adminComponent,
                Settings.Global.STAY_ON_WHILE_PLUGGED_IN,
                (android.os.BatteryManager.BATTERY_PLUGGED_AC or 
                 android.os.BatteryManager.BATTERY_PLUGGED_USB or 
                 android.os.BatteryManager.BATTERY_PLUGGED_WIRELESS).toString()
            )

            // Forzar fecha y hora automáticas desde la red
            dpm.setAutoTimeRequired(adminComponent, true)

            Toast.makeText(context, "RutaControl: Modo Kiosco y Políticas de Seguridad Activadas", Toast.LENGTH_LONG).show()
        }
    }

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
    }
}
