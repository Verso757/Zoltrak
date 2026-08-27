package com.rutacontrol.telematics

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

/**
 * Actividad requerida por Android 12+ (API 31+) durante el aprovisionamiento de Android Enterprise.
 * Responde a GET_PROVISIONING_MODE y ADMIN_POLICY_COMPLIANCE para confirmar que el dispositivo
 * se configura en modo Fully Managed Device (Device Owner / Kiosco).
 */
class PolicyComplianceActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val action = intent?.action

        if (DevicePolicyManager.ACTION_GET_PROVISIONING_MODE == action || "android.app.action.GET_PROVISIONING_MODE" == action) {
            val resultIntent = Intent().apply {
                putExtra(
                    DevicePolicyManager.EXTRA_PROVISIONING_MODE,
                    DevicePolicyManager.PROVISIONING_MODE_FULLY_MANAGED_DEVICE
                )
            }
            setResult(Activity.RESULT_OK, resultIntent)
            finish()
            return
        }

        if (DevicePolicyManager.ACTION_ADMIN_POLICY_COMPLIANCE == action || "android.app.action.ADMIN_POLICY_COMPLIANCE" == action) {
            setResult(Activity.RESULT_OK)
            finish()
            return
        }

        setResult(Activity.RESULT_OK)
        finish()
    }
}
