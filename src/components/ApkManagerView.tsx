import React, { useState } from 'react';
import { ApkApp, ApkVersion } from '../types';
import { 
  Package, 
  Upload, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Smartphone, 
  Clock, 
  FileCode, 
  ArrowRight,
  Plus,
  RefreshCw,
  AlertCircle,
  QrCode
} from 'lucide-react';

export const INITIAL_APK_APPS: ApkApp[] = [
  {
    id: 'app-telematics',
    name: 'RutaControl Telematics (Foreground Service)',
    packageName: 'com.rutacontrol.telematics',
    category: 'telematics_core',
    description: 'Servicio nativo en 2do plano con GPS a 1 Hz, auto-arranque tras reinicio (BOOT_COMPLETED) y bloqueo de configuración con PIN.',
    iconType: 'telematics',
    isMandatoryKiosk: true,
    autoUpdateMode: 'immediate_silent',
    versions: [
      {
        id: 'ver-tel-241',
        versionName: 'v2.4.1 (Estable Prod)',
        versionCode: 241,
        releaseDate: '2026-08-20',
        fileSizeBytes: 14780000,
        downloadUrl: 'https://storage.googleapis.com/rutacontrol-apks/rutacontrol-telematics-v2.4.1.apk',
        sha256Checksum: '8f7a9d2e1b4c3f5a6b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a',
        isCurrentProduction: true,
        minAndroidSdk: 26,
        targetAndroidSdk: 34,
        changelog: [
          'Optimización del algoritmo de cálculo de L/100km en tiempo real.',
          'Re-conexión socket TCP con backoff exponencial ante caídas de red.',
          'Compatibilidad completa con Android 14 Foreground Service Types (LOCATION).'
        ]
      },
      {
        id: 'ver-tel-240',
        versionName: 'v2.4.0',
        versionCode: 240,
        releaseDate: '2026-08-01',
        fileSizeBytes: 14500000,
        downloadUrl: 'https://storage.googleapis.com/rutacontrol-apks/rutacontrol-telematics-v2.4.0.apk',
        sha256Checksum: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
        isCurrentProduction: false,
        minAndroidSdk: 26,
        targetAndroidSdk: 34,
        changelog: [
          'Detección de aceleraciones bruscas con giroscopio calibrado a 50 Hz.',
          'Soporte para PIN de supervisor de 4 a 6 dígitos.'
        ]
      }
    ]
  },
  {
    id: 'app-sales',
    name: 'AutoVenta Móvil Pro',
    packageName: 'com.empresa.ventas.movil',
    category: 'sales_billing',
    description: 'App de toma de pedidos, facturación electrónica offline y cobro en ruta.',
    iconType: 'sales',
    isMandatoryKiosk: true,
    autoUpdateMode: 'immediate_silent',
    versions: [
      {
        id: 'ver-sales-312',
        versionName: 'v3.1.2 (Estable)',
        versionCode: 312,
        releaseDate: '2026-08-15',
        fileSizeBytes: 22400000,
        downloadUrl: 'https://storage.googleapis.com/rutacontrol-apks/autoventa-pro-v3.1.2.apk',
        sha256Checksum: '9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d',
        isCurrentProduction: true,
        minAndroidSdk: 28,
        targetAndroidSdk: 34,
        changelog: [
          'Sincronización de catálogo de 15,000 SKUs en menos de 2 segundos.',
          'Soporte para impresión de ticket térmico por Bluetooth ESC/POS.'
        ]
      }
    ]
  },
  {
    id: 'app-whatsapp',
    name: 'WhatsApp Business',
    packageName: 'com.whatsapp',
    category: 'messaging',
    description: 'Canal de comunicación directo con almacén, clientes y soporte de flota.',
    iconType: 'whatsapp',
    isMandatoryKiosk: false,
    autoUpdateMode: 'on_wifi_only',
    versions: [
      {
        id: 'ver-wa-224',
        versionName: 'v2.24.16.78',
        versionCode: 2241678,
        releaseDate: '2026-08-10',
        fileSizeBytes: 48900000,
        downloadUrl: 'https://storage.googleapis.com/rutacontrol-apks/whatsapp-business-2.24.apk',
        sha256Checksum: '3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
        isCurrentProduction: true,
        minAndroidSdk: 21,
        targetAndroidSdk: 34,
        changelog: ['Versión oficial para comunicación operativa.']
      }
    ]
  }
];

interface ApkManagerViewProps {
  onNavigateToQr?: () => void;
}

export const ApkManagerView: React.FC<ApkManagerViewProps> = ({ onNavigateToQr }) => {
  const [apps, setApps] = useState<ApkApp[]>(INITIAL_APK_APPS);
  const [selectedAppId, setSelectedAppId] = useState<string>(INITIAL_APK_APPS[0].id);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [showNewAppModal, setShowNewAppModal] = useState(false);

  // Form states for new version
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionCode, setNewVersionCode] = useState('');
  const [newDownloadUrl, setNewDownloadUrl] = useState('');
  const [newSha256, setNewSha256] = useState('');
  const [newChangelog, setNewChangelog] = useState('');

  // Form states for new app
  const [newAppName, setNewAppName] = useState('');
  const [newPackageName, setNewPackageName] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');

  const selectedApp = apps.find(a => a.id === selectedAppId) || apps[0];
  const currentProdVersion = selectedApp.versions.find(v => v.isCurrentProduction) || selectedApp.versions[0];

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSetProduction = (appId: string, versionId: string) => {
    setApps(prev => prev.map(app => {
      if (app.id !== appId) return app;
      return {
        ...app,
        versions: app.versions.map(v => ({
          ...v,
          isCurrentProduction: v.id === versionId
        }))
      };
    }));
  };

  const handleAddVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionName || !newDownloadUrl) return;

    const newVer: ApkVersion = {
      id: `ver-${Date.now()}`,
      versionName: newVersionName,
      versionCode: parseInt(newVersionCode, 10) || Math.floor(Date.now() / 1000),
      releaseDate: new Date().toISOString().split('T')[0],
      fileSizeBytes: 15200000,
      downloadUrl: newDownloadUrl,
      sha256Checksum: newSha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      isCurrentProduction: true, // Auto set to production
      minAndroidSdk: 26,
      targetAndroidSdk: 34,
      changelog: newChangelog ? newChangelog.split('\n').filter(Boolean) : ['Nueva versión cargada desde el portal.']
    };

    setApps(prev => prev.map(app => {
      if (app.id !== selectedAppId) return app;
      return {
        ...app,
        versions: [newVer, ...app.versions.map(v => ({ ...v, isCurrentProduction: false }))]
      };
    }));

    setShowNewVersionModal(false);
    setNewVersionName('');
    setNewVersionCode('');
    setNewDownloadUrl('');
    setNewSha256('');
    setNewChangelog('');
  };

  const handleAddApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName || !newPackageName) return;

    const newApp: ApkApp = {
      id: `app-${Date.now()}`,
      name: newAppName,
      packageName: newPackageName,
      category: 'custom_fleet',
      description: newAppDesc || 'Aplicación corporativa de flota.',
      iconType: 'custom',
      isMandatoryKiosk: true,
      autoUpdateMode: 'immediate_silent',
      versions: [
        {
          id: `ver-${Date.now()}-1`,
          versionName: 'v1.0.0 (Inicial)',
          versionCode: 100,
          releaseDate: new Date().toISOString().split('T')[0],
          fileSizeBytes: 12000000,
          downloadUrl: `https://storage.googleapis.com/rutacontrol-apks/${newPackageName}-v1.0.0.apk`,
          sha256Checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          isCurrentProduction: true,
          minAndroidSdk: 26,
          targetAndroidSdk: 34,
          changelog: ['Versión de lanzamiento inicial.']
        }
      ]
    };

    setApps(prev => [...prev, newApp]);
    setSelectedAppId(newApp.id);
    setShowNewAppModal(false);
    setNewAppName('');
    setNewPackageName('');
    setNewAppDesc('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Top Banner with Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Repositorio Central de APKs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aloja y distribuye las aplicaciones instalables en los celulares de los choferes. La versión activa se inyecta automáticamente en el QR de aprovisionamiento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToQr && (
            <button
              id="btn-goto-qr"
              onClick={onNavigateToQr}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Ver QR con APKs Activas</span>
            </button>
          )}

          <button
            id="btn-register-app"
            onClick={() => setShowNewAppModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar Otra App</span>
          </button>

          <button
            id="btn-upload-apk-version"
            onClick={() => setShowNewVersionModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Subir Nueva Versión</span>
          </button>
        </div>
      </div>

      {/* Grid: App selector tabs (3 cols) + App Details & Releases table (9 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Apps List (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Aplicaciones en Flota ({apps.length})
          </h3>

          <div className="space-y-2">
            {apps.map(app => {
              const isSelected = app.id === selectedAppId;
              const prod = app.versions.find(v => v.isCurrentProduction) || app.versions[0];

              return (
                <div
                  key={app.id}
                  id={`app-item-${app.id}`}
                  onClick={() => setSelectedAppId(app.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-white border-slate-900 ring-1 ring-slate-900 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        app.category === 'telematics_core' 
                          ? 'bg-slate-900 text-white' 
                          : app.category === 'sales_billing' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-emerald-600 text-white'
                      }`}>
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{app.name}</h4>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">{app.packageName}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Versión Prod:</span>
                    <span className="font-semibold text-slate-900 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                      {prod?.versionName || 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Details Panel (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Active App Header Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{selectedApp.name}</h3>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Kiosco Obligatorio
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-500 mt-1">Package ID: {selectedApp.packageName}</div>
                <p className="text-xs text-slate-600 mt-2 max-w-2xl">{selectedApp.description}</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Versión en Producción</span>
                <span className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">
                  {currentProdVersion.versionName}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Code: {currentProdVersion.versionCode} • {(currentProdVersion.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
            </div>

            {/* Production Download URL Box */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-slate-500" />
                  URL Pública Directa de Descarga (.apk):
                </span>
                <button
                  onClick={() => handleCopy(currentProdVersion.downloadUrl, 'url')}
                  className="text-[11px] text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded"
                >
                  {copiedText === 'url' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedText === 'url' ? '¡Copiado!' : 'Copiar URL'}</span>
                </button>
              </div>
              <div className="text-xs font-mono text-slate-600 break-all bg-white p-2 rounded border border-slate-200">
                {currentProdVersion.downloadUrl}
              </div>

              {/* SHA-256 Checksum */}
              <div className="pt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-mono truncate max-w-[450px]">
                  SHA-256: {currentProdVersion.sha256Checksum}
                </span>
                <button
                  onClick={() => handleCopy(currentProdVersion.sha256Checksum, 'sha')}
                  className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
                >
                  {copiedText === 'sha' ? '¡Checksum copiado!' : 'Copiar SHA-256'}
                </button>
              </div>
            </div>
          </div>

          {/* Release History & Version Switcher Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 tracking-tight">Historial de Versiones & Despliegues</h4>
              <span className="text-xs text-slate-500">{selectedApp.versions.length} versiones registradas</span>
            </div>

            <div className="divide-y divide-slate-100">
              {selectedApp.versions.map((version) => (
                <div key={version.id} className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{version.versionName}</span>
                      {version.isCurrentProduction ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> En Producción (QR)
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.2 rounded-full font-medium">
                          Histórica
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Lanzamiento: {version.releaseDate} • Code: {version.versionCode} • Tamaño: {(version.fileSizeBytes / (1024*1024)).toFixed(1)} MB
                    </div>
                    <div className="text-xs text-slate-600 mt-1 max-w-xl">
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                        {version.changelog.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!version.isCurrentProduction && (
                      <button
                        id={`btn-set-prod-${version.id}`}
                        onClick={() => handleSetProduction(selectedApp.id, version.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
                      >
                        Activar en Producción
                      </button>
                    )}
                    <a
                      href={version.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg bg-white"
                      title="Descargar APK directa"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: New Version Upload */}
      {showNewVersionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Registrar Nueva Versión de APK</h3>
              <button 
                onClick={() => setShowNewVersionModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVersion} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nombre de Versión (ej: v2.4.2)</label>
                <input
                  type="text"
                  required
                  placeholder="v2.4.2"
                  value={newVersionName}
                  onChange={e => setNewVersionName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Version Code (ej: 242)</label>
                <input
                  type="number"
                  placeholder="242"
                  value={newVersionCode}
                  onChange={e => setNewVersionCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">URL Pública de Descarga (.apk)</label>
                <input
                  type="url"
                  required
                  placeholder="https://tudominio.com/apks/rutacontrol-v2.4.2.apk"
                  value={newDownloadUrl}
                  onChange={e => setNewDownloadUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">SHA-256 Checksum (Opcional)</label>
                <input
                  type="text"
                  placeholder="8f7a9d2e..."
                  value={newSha256}
                  onChange={e => setNewSha256(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notas de la Versión (Changelog)</label>
                <textarea
                  rows={3}
                  placeholder="Escribe una mejora por línea..."
                  value={newChangelog}
                  onChange={e => setNewChangelog(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewVersionModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800"
                >
                  Publicar & Activar en QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New App Registration */}
      {showNewAppModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Registrar Nueva Aplicación de Flota</h3>
              <button 
                onClick={() => setShowNewAppModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddApp} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nombre Comercial de la App</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Impresora Térmica Bluetooth"
                  value={newAppName}
                  onChange={e => setNewAppName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Package Name Oficial de Android</label>
                <input
                  type="text"
                  required
                  placeholder="com.empresa.printer.driver"
                  value={newPackageName}
                  onChange={e => setNewPackageName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Descripción de Funcionalidad</label>
                <textarea
                  rows={2}
                  placeholder="Explica qué hace esta app en los celulares de los choferes..."
                  value={newAppDesc}
                  onChange={e => setNewAppDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewAppModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800"
                >
                  Guardar App
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
