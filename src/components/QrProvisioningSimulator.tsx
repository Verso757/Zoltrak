import React, { useState } from 'react';
import { 
  QrCode, 
  Smartphone, 
  ShieldCheck, 
  Settings, 
  Layers, 
  Download, 
  Sparkles, 
  Check, 
  Copy, 
  ExternalLink,
  MessageSquare,
  PackageCheck,
  Radio,
  Lock,
  Zap,
  HelpCircle,
  Cpu,
  ArrowRight
} from 'lucide-react';

export const QrProvisioningSimulator: React.FC = () => {
  const [wifiSsid, setWifiSsid] = useState('Bodega_Despacho_5G');
  const [wifiPassword, setWifiPassword] = useState('Flota2026Secure');
  const [apkDownloadUrl, setApkDownloadUrl] = useState('https://app.rutacontrol.com/apk/rutacontrol-v2.4.apk');
  const [salesAppPackage, setSalesAppPackage] = useState('com.empresa.ventas');
  const [includeWhatsApp, setIncludeWhatsApp] = useState(true);
  const [includeSalesApp, setIncludeSalesApp] = useState(true);
  const [autoEnableGps, setAutoEnableGps] = useState(true);
  const [autoLockKiosk, setAutoLockKiosk] = useState(true);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [copiedJson, setCopiedJson] = useState(false);

  // Generate standard Android Enterprise QR JSON payload
  const qrJsonPayload = {
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.rutacontrol.telematics/.admin.KioskDeviceAdminReceiver",
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": apkDownloadUrl,
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM": "4a72e259b3f37b12d5... (sha256)",
    "android.app.extra.PROVISIONING_WIFI_SSID": wifiSsid,
    "android.app.extra.PROVISIONING_WIFI_PASSWORD": wifiPassword,
    "android.app.extra.PROVISIONING_WIFI_SECURITY_TYPE": "WPA",
    "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": false,
    "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
      "kiosk_mode": autoLockKiosk,
      "force_gps_always_on": autoEnableGps,
      "allowed_apps": [
        "com.rutacontrol.telematics",
        ...(includeWhatsApp ? ["com.whatsapp"] : []),
        ...(includeSalesApp && salesAppPackage ? [salesAppPackage] : [])
      ],
      "install_play_store_apps": [
        ...(includeWhatsApp ? ["https://play.google.com/store/apps/details?id=com.whatsapp"] : [])
      ],
      "lock_airplane_mode": true,
      "lock_uninstall": true,
      "supervisor_pin": "2026"
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(qrJsonPayload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Hero Explanatory Banner */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-indigo-950/60 border border-cyan-500/30 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Cero Costo en Cuentas Externas • 100% Nativo de Android</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Auto-Aprovisionamiento por Código QR & Modo Kiosco Multi-App
            </h2>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              <b>No necesitas pagar suscripciones ni crear cuentas en plataformas externas.</b> Android incluye de fábrica el sistema <span className="text-cyan-300 font-mono">Android Enterprise Provisioning</span>. Al sacar un celular nuevo de la caja o recién formateado, das <b>6 toques en la pantalla</b>, escaneas el QR generado y el equipo se configura solo en 90 segundos.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col items-center text-center w-full lg:w-auto">
            <div className="p-3 bg-white rounded-xl shadow-lg shadow-cyan-950/50 mb-2">
              <QrCode className="w-24 h-24 text-slate-950" />
            </div>
            <span className="text-[11px] font-mono text-cyan-400 font-semibold">QR de Enrolamiento Flota</span>
            <span className="text-[10px] text-slate-400">Escaneo en Pantalla de Bienvenida</span>
          </div>
        </div>
      </div>

      {/* 3 Core Answers Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            1
          </div>
          <h3 className="font-bold text-white text-base">¿Ocupo crear cuenta en algún servicio?</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            <b className="text-emerald-400">No.</b> No necesitas pagar plataformas MDM de terceros (como Knox, Soti o Jamf). El protocolo de aprovisionamiento por QR es <b>un estándar abierto integrado dentro del propio sistema operativo Android</b> (Google AOSP). Lo puedes hacer tú mismo con tu propia APK.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
            2
          </div>
          <h3 className="font-bold text-white text-base">¿Sirve para configurar un equipo desde cero?</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            <b className="text-cyan-400">Sí, exactamente para eso fue creado.</b> Al encender un teléfono nuevo o recién restablecido de fábrica, tocas 6 veces la pantalla de bienvenida. Se abre la cámara de Android, escaneas el QR y el teléfono <b>se conecta al Wi-Fi, baja las apps y activa el GPS en automático</b>.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
            3
          </div>
          <h3 className="font-bold text-white text-base">¿Puede dejar WhatsApp y mi app de ventas?</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            <b className="text-purple-400">Sí (Modo Kiosco Multi-App).</b> Puedes definir una lista blanca (Whitelist): el chofer <b>solo podrá ver y abrir tu App de Telemetría, WhatsApp y tu App de Ventas</b>. Todo lo demás (YouTube, Facebook, Juegos, Menú de Ajustes y Modo Avión) queda oculto y bloqueado.
          </p>
        </div>
      </div>

      {/* Interactive QR Generator & Flow Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Builder */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-sm text-white">Configurador del QR de Aprovisionamiento</h3>
            </div>
            <span className="text-[11px] text-slate-400">Genera el JSON oficial de Android</span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Wi-Fi Credentials for Auto-Connect */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 space-y-2">
              <span className="font-semibold text-slate-200 block text-xs flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                1. Conexión Automática a Wi-Fi de Bodega/Oficina
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Nombre de Red Wi-Fi (SSID)</label>
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Contraseña Wi-Fi</label>
                  <input
                    type="text"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* APK Download URL */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                2. Enlace Directo de tu APK de Telemetría (Servidor Propio)
              </label>
              <input
                type="text"
                value={apkDownloadUrl}
                onChange={(e) => setApkDownloadUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Puede ser un link en tu servidor web, Firebase Hosting, AWS S3 o Google Drive directo.
              </span>
            </div>

            {/* Allowed Apps (Multi-App Kiosk) */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 space-y-2.5">
              <span className="font-semibold text-slate-200 block text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                3. Aplicaciones Permitidas para el Chofer (Modo Kiosco Multi-App)
              </span>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">Permitir WhatsApp</span>
                      <span className="text-[10px] text-slate-400">com.whatsapp (para coordinar entregas y clientes)</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeWhatsApp}
                    onChange={(e) => setIncludeWhatsApp(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-950 border-slate-700"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded bg-slate-900/80 border border-slate-800 cursor-pointer hover:border-slate-700">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-amber-400" />
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-slate-200 block">Permitir App de Ventas / Facturación</span>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={salesAppPackage}
                          onChange={(e) => setSalesAppPackage(e.target.value)}
                          placeholder="Package ID (ej: com.empresa.ventas)"
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-amber-300 font-mono w-48 focus:outline-none focus:border-amber-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeSalesApp}
                    onChange={(e) => setIncludeSalesApp(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-950 border-slate-700"
                  />
                </label>
              </div>
            </div>

            {/* Hardware Restrictions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoEnableGps}
                  onChange={(e) => setAutoEnableGps(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500"
                />
                <span className="text-[11px] text-slate-300 font-medium">Forzar GPS Siempre Activo</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoLockKiosk}
                  onChange={(e) => setAutoLockKiosk(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500"
                />
                <span className="text-[11px] text-slate-300 font-medium">Bloquear Modo Avión & Reset</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Step-by-Step Provisioning Flow */}
        <div className="lg:col-span-6 space-y-5">
          {/* Step visualizer */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Paso a Paso: Cómo aprovisionar el celular (90 seg)</span>
              </h3>
              <span className="text-xs text-emerald-400 font-semibold">Paso {activeStep} de 4</span>
            </div>

            {/* Steps navigation */}
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((step) => (
                <button
                  key={step}
                  onClick={() => setActiveStep(step)}
                  className={`py-1.5 rounded text-xs font-semibold transition-colors ${
                    activeStep === step
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Paso {step}
                </button>
              ))}
            </div>

            {/* Step content */}
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 min-h-[160px] flex flex-col justify-between">
              {activeStep === 1 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-[11px]">1</span>
                    Enciende el celular nuevo o formateado
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Al encender el teléfono aparecerá la pantalla que dice <b>"Hola / Bienvenido"</b> para seleccionar idioma. <b>NO avances el asistente.</b>
                  </p>
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-cyan-300">
                    👉 <b>Acción Secreta de Android:</b> Da <b>6 toques seguidos en cualquier espacio vacío</b> de la pantalla de bienvenida.
                  </div>
                </div>
              )}

              {activeStep === 2 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-[11px]">2</span>
                    Se abre automáticamente el lector QR de Android
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Android mostrará un mensaje indicando <i>"Configuración de dispositivo de empresa"</i> y encenderá la cámara.
                  </p>
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-emerald-300">
                    📷 <b>Apunta la cámara al código QR</b> que generas con el configurador de la izquierda.
                  </div>
                </div>
              )}

              {activeStep === 3 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-[11px]">3</span>
                    Auto-Descarga e Instalación Silenciosa
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    El teléfono se conectará al Wi-Fi <span className="font-mono text-cyan-300">"{wifiSsid}"</span> automáticamente sin pedir contraseña y descargará la APK de telemetría e instalará las apps permitidas.
                  </p>
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300">
                    ⏳ <b>Tarda ~45 segundos:</b> Se otorgan todos los permisos de GPS en segundo plano y Auto-Boot automáticamente sin que nadie tenga que aceptar permisos manuales.
                  </div>
                </div>
              )}

              {activeStep === 4 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-[11px]">4</span>
                    ¡Celular Blindado y Listo para Entregar al Chofer!
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    El celular arranca directamente en el <b>Lanzador Kiosco</b>. El chofer solo verá los íconos de <b>RutaControl, WhatsApp y App de Ventas</b>.
                  </p>
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/80 rounded-lg text-xs text-emerald-300">
                    🔒 <b>Seguridad:</b> La barra superior queda bloqueada (no puede apagar GPS ni poner Modo Avión). El rastreo funciona de inmediato.
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                <button
                  disabled={activeStep === 1}
                  onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  disabled={activeStep === 4}
                  onClick={() => setActiveStep(prev => Math.min(4, prev + 1))}
                  className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>Siguiente Paso</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Generated QR JSON Payload Inspector */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">Payload JSON Real de Android Enterprise</span>
              </div>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-xs transition-colors border border-slate-700"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? 'Copiado' : 'Copiar JSON'}</span>
              </button>
            </div>

            <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto scrollbar-thin">
              {JSON.stringify(qrJsonPayload, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
