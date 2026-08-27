package com.rutacontrol.telematics.receivers

import android.app.admin.DeviceAdminReceiver
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.UserManager
import android.widget.Toast

class DeviceAdminPolicyReceiver : DeviceAdminReceiver() {

    override fun onProfileProvisioningComplete(context: Context, intent: Intent) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(context, DeviceAdminPolicyReceiver::class.java)

        if (dpm.isDeviceOwnerApp(context.packageName)) {
            // 1. Bloquear restricciones de usuario (Modo Kiosco / Seguridad Flota)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_FACTORY_RESET)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_SAFE_BOOT)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_MOUNT_PHYSICAL_MEDIA)
            dpm.addUserRestriction(adminComponent, UserManager.DISALLOW_USB_FILE_TRANSFER)
            
            // 2. Establecer como Launcher de Inicio Predeterminado (Kiosk)
            val filter = android.content.IntentFilter(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                addCategory(Intent.CATEGORY_DEFAULT)
            }
            val activity = ComponentName(context, "com.rutacontrol.telematics.MainActivity")
            dpm.addPersistentPreferredActivity(adminComponent, filter, activity)

            // 3. Mantener pantalla encendida cuando esté conectado al cargador del vehículo
            dpm.setGlobalSetting(
                adminComponent,
                android.provider.Settings.Global.STAY_ON_WHILE_PLUGGED_IN,
                (android.os.BatteryManager.BATTERY_PLUGGED_AC or android.os.BatteryManager.BATTERY_PLUGGED_USB).toString()
            )

            Toast.makeText(context, "RutaControl: Dispositivo Enrolado en Modo Flota", Toast.LENGTH_LONG).show()
        }
    }

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
    }
}
