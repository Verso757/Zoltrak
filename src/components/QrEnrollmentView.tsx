import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Wifi, 
  Shield, 
  Smartphone, 
  Download, 
  Copy, 
  Check, 
  Printer, 
  Info,
  CheckCircle2,
  Lock,
  Radio,
  FileJson,
  Layers,
  Sparkles
} from 'lucide-react';

interface QrEnrollmentViewProps {
  initialPin?: string;
}

export const QrEnrollmentView: React.FC<QrEnrollmentViewProps> = ({ initialPin = '2026' }) => {
  const [wifiSsid, setWifiSsid] = useState('RutaControl_Almacen_5G');
  const [wifiPassword, setWifiPassword] = useState('Flota2026Secure!');
  const [wifiSecurity, setWifiSecurity] = useState<'WPA' | 'WEP' | 'NONE'>('WPA');
  const [supervisorPin, setSupervisorPin] = useState(initialPin);
  const [apkDownloadUrl, setApkDownloadUrl] = useState('https://zoltrak.websolutionsgarcia.com/uploads/apks/rutacontrol-latest.apk');
  const [apkChecksum, setApkChecksum] = useState('');
  const [includeWifi, setIncludeWifi] = useState(true);
  const [forceGpsAlwaysOn, setForceGpsAlwaysOn] = useState(true);
  const [disableFactoryReset, setDisableFactoryReset] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate Android Enterprise Provisioning JSON
  const provisioningPayload: Record<string, any> = {
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.rutacontrol.telematics/.receivers.DeviceAdminPolicyReceiver",
    "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": apkDownloadUrl,
    "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": false,
    "android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE": {
      "supervisor_pin": supervisorPin,
      "force_gps_always": forceGpsAlwaysOn,
      "disable_factory_reset": disableFactoryReset,
      "telemetry_server_url": "https://zoltrak.websolutionsgarcia.com/api/telemetry.php"
    }
  };

  if (apkChecksum.trim()) {
    provisioningPayload["android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_CHECKSUM"] = apkChecksum.trim();
  }

  if (includeWifi && wifiSsid.trim()) {
    provisioningPayload["android.app.extra.PROVISIONING_WIFI_SSID"] = wifiSsid.trim();
    if (wifiPassword) {
      provisioningPayload["android.app.extra.PROVISIONING_WIFI_PASSWORD"] = wifiPassword;
    }
    provisioningPayload["android.app.extra.PROVISIONING_WIFI_SECURITY_TYPE"] = wifiSecurity;
  }

  const jsonString = JSON.stringify(provisioningPayload, null, 2);

  // Generate QR Code with qrcode library
  useEffect(() => {
    QRCode.toDataURL(
      JSON.stringify(provisioningPayload),
      {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a', // Deep slate-900
          light: '#ffffff'  // Pure white
        },
        errorCorrectionLevel: 'M'
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [wifiSsid, wifiPassword, wifiSecurity, supervisorPin, apkDownloadUrl, apkChecksum, includeWifi, forceGpsAlwaysOn, disableFactoryReset]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Top Explanation Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Enrolamiento Automático (Android Enterprise Zero-Touch)</h2>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Modo Kiosco / Device Owner
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
            Convierte cualquier celular Android nuevo o recién formateado en una terminal de chofer en menos de 90 segundos. El código QR conecta el teléfono al Wi-Fi, descarga las APKs oficiales y bloquea la salida con PIN de supervisor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '¡JSON Copiado!' : 'Copiar Payload JSON'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Hoja de Enrolamiento</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls (5 cols) & Right High-Resolution QR Card (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Form: Configuration parameters (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Card 1: Wi-Fi Credentials for Automatic Connection */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-slate-700" />
              <span>1. Red Wi-Fi de Almacén / Oficina</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              El celular se conectará inmediatamente a esta red al escanear el QR para descargar las APKs sin gastar datos celulares.
            </p>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nombre de Red (SSID)</label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={e => setWifiSsid(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contraseña de Wi-Fi</label>
                <input
                  type="password"
                  value={wifiPassword}
                  onChange={e => setWifiPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Card 2: APK Download Location & Checksum */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-slate-700" />
              <span>2. Ubicación de Descarga del APK Oficial</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Android descargará el archivo .apk directamente desde esta URL HTTPS pública durante el enrolamiento de fábrica.
            </p>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">URL de Descarga del APK (HTTPS)</label>
                <input
                  type="url"
                  value={apkDownloadUrl}
                  onChange={e => setApkDownloadUrl(e.target.value)}
                  placeholder="https://tudominio.com/uploads/apks/app-debug.apk"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800 font-mono text-[11px]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Sube tu APK a tu Hostinger (Gestor de APKs) o usa tu URL de GitHub Releases.
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Checksum SHA-256 (Opcional si usas HTTPS confiable)</label>
                <input
                  type="text"
                  value={apkChecksum}
                  onChange={e => setApkChecksum(e.target.value)}
                  placeholder="Dejar vacío o pegar hash SHA-256"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800 font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Security & Supervisor Locks */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-slate-700" />
              <span>3. Políticas de Seguridad de Flota</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">PIN de Supervisor / Desbloqueo</label>
                <input
                  type="text"
                  maxLength={6}
                  value={supervisorPin}
                  onChange={e => setSupervisorPin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800 font-mono text-center tracking-widest text-base font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Necesario para salir del modo kiosco o apagar el GPS.</span>
              </div>

              <div className="pt-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceGpsAlwaysOn}
                    onChange={e => setForceGpsAlwaysOn(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-slate-700 font-medium">Forzar GPS de Alta Precisión siempre activo</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disableFactoryReset}
                    onChange={e => setDisableFactoryReset(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-slate-700 font-medium">Bloquear Restablecimiento de Fábrica no autorizado</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Clean White QR Card & Step-by-Step Instructions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Printable QR Code Poster Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs text-center space-y-4">
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-slate-700" />
              <span>Código QR de Aprovisionamiento Oficial</span>
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              Escanear con Teléfono en Pantalla de Bienvenida
            </h3>
            
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Da <b>6 toques seguidos</b> en cualquier espacio vacío de la pantalla inicial de bienvenida de Android para activar el lector QR de fábrica.
            </p>

            {/* Rendered Genuine QR Code */}
            <div className="my-6 inline-block p-4 bg-white rounded-xl border-2 border-slate-200 shadow-sm">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code de Aprovisionamiento Android Enterprise"
                  className="w-64 h-64 mx-auto object-contain"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-xs text-slate-400">
                  Generando QR...
                </div>
              )}
            </div>

            {/* Quick Summary Pill Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg mx-auto text-left text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-400 block text-[10px]">Wi-Fi SSID</span>
                <span className="font-semibold text-slate-800 truncate block mt-0.5">{wifiSsid}</span>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-400 block text-[10px]">PIN Supervisor</span>
                <span className="font-mono font-bold text-slate-800 block mt-0.5">{supervisorPin}</span>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[10px]">Modo</span>
                <span className="font-semibold text-indigo-600 block mt-0.5">
                  Device Owner / Kiosk
                </span>
              </div>
            </div>
          </div>

          {/* Step-by-Step Instructions Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900">Procedimiento en 3 Pasos (Para el Técnico de Flota)</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[11px]">1</span>
                <div className="font-semibold text-slate-900 pt-1">Prender Celular Nuevo</div>
                <p className="text-[11px] text-slate-500">En la pantalla de "Hola / Welcome", toca 6 veces seguidas en cualquier área vacía.</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[11px]">2</span>
                <div className="font-semibold text-slate-900 pt-1">Escanear este QR</div>
                <p className="text-[11px] text-slate-500">Apunta la cámara al código. El celular se conectará a "{wifiSsid}" automáticamente.</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[11px]">3</span>
                <div className="font-semibold text-slate-900 pt-1">Instalación Silenciosa</div>
                <p className="text-[11px] text-slate-500">En 90 segundos las APKs quedan instaladas y el servicio GPS arranca en 2do plano.</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
