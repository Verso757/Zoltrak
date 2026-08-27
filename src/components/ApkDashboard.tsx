import React, { useState } from 'react';
import { 
  Package, 
  Layers, 
  Upload, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  Radio, 
  Smartphone, 
  Settings, 
  RefreshCw, 
  QrCode, 
  ExternalLink,
  MessageSquare,
  PackageCheck,
  Printer,
  ChevronRight,
  Info,
  Calendar,
  HardDrive
} from 'lucide-react';
import { ApkApp, ApkVersion } from '../types';
import { INITIAL_APK_APPS } from '../data/mockApks';

interface ApkDashboardProps {
  onSelectForQr?: (appPackage: string, apkUrl: string, checksum: string) => void;
  onNavigateToQr?: () => void;
}

export const ApkDashboard: React.FC<ApkDashboardProps> = ({
  onSelectForQr,
  onNavigateToQr
}) => {
  const [apps, setApps] = useState<ApkApp[]>(INITIAL_APK_APPS);
  const [selectedAppId, setSelectedAppId] = useState<string>(INITIAL_APK_APPS[0].id);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [showNewAppModal, setShowNewAppModal] = useState(false);

  // New Version form state
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionCode, setNewVersionCode] = useState<number>(241);
  const [newDownloadUrl, setNewDownloadUrl] = useState('');
  const [newFileSizeBytes, setNewFileSizeBytes] = useState<number>(15200000);
  const [newChecksum, setNewChecksum] = useState('');
  const [newChangelog, setNewChangelog] = useState('');
  const [isProduction, setIsProduction] = useState(true);

  // New App form state
  const [newAppName, setNewAppName] = useState('');
  const [newAppPackage, setNewAppPackage] = useState('');
  const [newAppCategory, setNewAppCategory] = useState<ApkApp['category']>('sales_billing');
  const [newAppDesc, setNewAppDesc] = useState('');

  const selectedApp = apps.find(a => a.id === selectedAppId) || apps[0];

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSetProductionVersion = (appId: string, versionId: string) => {
    setApps(prev => prev.map(app => {
      if (app.id !== appId) return app;
      return {
        ...app,
        versions: app.versions.map(ver => ({
          ...ver,
          isCurrentProduction: ver.id === versionId
        }))
      };
    }));
  };

  const handleAddVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionName || !newDownloadUrl) return;

    const dummyChecksum = newChecksum || `sha256-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const parsedChangelog = newChangelog
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const newVersionObj: ApkVersion = {
      id: `ver-${Date.now()}`,
      versionName: newVersionName,
      versionCode: Number(newVersionCode) || 100,
      releaseDate: new Date().toISOString().split('T')[0],
      fileSizeBytes: Number(newFileSizeBytes) || 15000000,
      downloadUrl: newDownloadUrl,
      sha256Checksum: dummyChecksum,
      changelog: parsedChangelog.length ? parsedChangelog : ['Optimizaciones y corrección de errores.'],
      isCurrentProduction: isProduction,
      minAndroidSdk: 26,
      targetAndroidSdk: 34
    };

    setApps(prev => prev.map(app => {
      if (app.id !== selectedApp.id) return app;
      const updatedVersions = isProduction 
        ? app.versions.map(v => ({ ...v, isCurrentProduction: false }))
        : [...app.versions];

      return {
        ...app,
        versions: [newVersionObj, ...updatedVersions]
      };
    }));

    setShowNewVersionModal(false);
    setNewVersionName('');
    setNewDownloadUrl('');
    setNewChecksum('');
    setNewChangelog('');
  };

  const handleCreateApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName || !newAppPackage) return;

    const newApp: ApkApp = {
      id: `app-${Date.now()}`,
      name: newAppName,
      packageName: newAppPackage,
      category: newAppCategory,
      description: newAppDesc || 'Aplicación para dispositivos de flota.',
      iconType: newAppCategory === 'sales_billing' ? 'sales' : 'custom',
      isMandatoryKiosk: true,
      autoUpdateMode: 'immediate_silent',
      versions: [
        {
          id: `ver-init-${Date.now()}`,
          versionName: 'v1.0.0 (Inicial)',
          versionCode: 100,
          releaseDate: new Date().toISOString().split('T')[0],
          fileSizeBytes: 18000000,
          downloadUrl: `https://cdn.rutacontrol.com/apk/${newAppPackage}/v1.0.0.apk`,
          sha256Checksum: 'a8b9c1d2e3f405162738495a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
          changelog: ['Versión de lanzamiento inicial para enrolamiento QR.'],
          isCurrentProduction: true,
          minAndroidSdk: 26,
          targetAndroidSdk: 34
        }
      ]
    };

    setApps(prev => [newApp, ...prev]);
    setSelectedAppId(newApp.id);
    setShowNewAppModal(false);
    setNewAppName('');
    setNewAppPackage('');
    setNewAppDesc('');
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCategoryBadge = (category: ApkApp['category']) => {
    switch (category) {
      case 'telematics_core':
        return <span className="bg-cyan-950 text-cyan-400 border border-cyan-800/80 px-2 py-0.5 rounded text-[10px] font-bold">Núcleo GPS 2do Plano</span>;
      case 'sales_billing':
        return <span className="bg-amber-950 text-amber-400 border border-amber-800/80 px-2 py-0.5 rounded text-[10px] font-bold">Ventas & Cobranza</span>;
      case 'messaging':
        return <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded text-[10px] font-bold">Mensajería Chofer</span>;
      default:
        return <span className="bg-purple-950 text-purple-400 border border-purple-800/80 px-2 py-0.5 rounded text-[10px] font-bold">Herramienta Flota</span>;
    }
  };

  const getAppIcon = (iconType: ApkApp['iconType']) => {
    switch (iconType) {
      case 'telematics':
        return <Radio className="w-5 h-5 text-cyan-400" />;
      case 'sales':
        return <PackageCheck className="w-5 h-5 text-amber-400" />;
      case 'whatsapp':
        return <MessageSquare className="w-5 h-5 text-emerald-400" />;
      default:
        return <Printer className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-2">
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              <span>Gestor Centralizado de Versiones de APKs & Auto-Instalación</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Dashboard de APKs y Control de Versiones
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
              Administra las aplicaciones que el código QR de Android Enterprise y los teléfonos de la flota descargarán e instalarán automáticamente. Gestiona versiones de prueba, versiones en producción y firmas SHA-256.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowNewAppModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Registrar Nueva App</span>
            </button>

            {onNavigateToQr && (
              <button
                onClick={onNavigateToQr}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-cyan-950/60"
              >
                <QrCode className="w-4 h-4" />
                <span>Generar QR con Estas Versiones</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left App Catalog, Right Versions & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Applications List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Aplicaciones de la Flota ({apps.length})</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">MDM Whitelist</span>
            </div>

            <div className="space-y-2">
              {apps.map((app) => {
                const isSelected = app.id === selectedApp.id;
                const prodVersion = app.versions.find(v => v.isCurrentProduction) || app.versions[0];

                return (
                  <button
                    key={app.id}
                    onClick={() => setSelectedAppId(app.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500/70 shadow-md shadow-cyan-950/40'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/80 mt-0.5">
                      {getAppIcon(app.iconType)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-white truncate block">
                          {app.name}
                        </span>
                        {isSelected && <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 truncate block mt-0.5">
                        {app.packageName}
                      </span>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                          {prodVersion?.versionName || 'v1.0'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {app.versions.length} versiones
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Auto-Update Policy Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs text-slate-300">
            <span className="font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Política de Despliegue Silencioso
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Al publicar una nueva versión en producción aquí, los celulares enrolados bajo el <b>Modo Kiosco</b> descargarán el nuevo archivo APK en segundo plano y realizarán la actualización silenciosa sin interrumpir la ruta del chofer.
            </p>
          </div>
        </div>

        {/* Right Column: Selected App Detail & Version History (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Active App Header Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
                  {getAppIcon(selectedApp.iconType)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {selectedApp.name}
                    </h3>
                    {getCategoryBadge(selectedApp.category)}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Package ID: <b className="text-slate-200">{selectedApp.packageName}</b>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const prod = selectedApp.versions.find(v => v.isCurrentProduction) || selectedApp.versions[0];
                  setNewVersionCode((prod?.versionCode || 200) + 1);
                  setShowNewVersionModal(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-md shadow-emerald-950/50 self-start sm:self-auto"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Subir / Registrar Nueva Versión</span>
              </button>
            </div>

            <p className="text-xs text-slate-300">
              {selectedApp.description}
            </p>

            {/* Quick App Attributes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block">Modo de Kiosco</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Obligatoria en QR
                </span>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block">Estrategia de Actualización</span>
                <span className="font-semibold text-cyan-300 mt-0.5 block">
                  {selectedApp.autoUpdateMode === 'immediate_silent' ? 'Silenciosa Inmediata' : 'Solo Wi-Fi'}
                </span>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block">Versión en Producción</span>
                <span className="font-bold text-white font-mono mt-0.5 block">
                  {selectedApp.versions.find(v => v.isCurrentProduction)?.versionName || 'Ninguna activa'}
                </span>
              </div>
            </div>
          </div>

          {/* Versions Table / List */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-cyan-400" />
                <span>Historial de Versiones & Builds Registrados</span>
              </h4>
              <span className="text-xs text-slate-400">
                {selectedApp.versions.length} versiones disponibles
              </span>
            </div>

            <div className="space-y-3">
              {selectedApp.versions.map((version) => {
                return (
                  <div
                    key={version.id}
                    className={`p-4 rounded-xl border transition-all ${
                      version.isCurrentProduction
                        ? 'bg-slate-950 border-emerald-500/50 shadow-md shadow-emerald-950/20'
                        : 'bg-slate-950/50 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-sm text-white">
                          {version.versionName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          code: {version.versionCode}
                        </span>
                        {version.isCurrentProduction ? (
                          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Activa en Producción (QR)
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px] font-medium">
                            Histórica / Test
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {version.releaseDate}
                        </span>
                        <span>•</span>
                        <span>{formatFileSize(version.fileSizeBytes)}</span>
                      </div>
                    </div>

                    {/* Changelog items */}
                    <div className="mt-3 bg-slate-900/80 rounded-lg p-2.5 border border-slate-800/60 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Cambios en esta versión:
                      </span>
                      <ul className="space-y-1 text-slate-300">
                        {version.changelog.map((change, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                            <span className="text-cyan-400 font-bold">•</span>
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Technical Artifact URLs & Actions */}
                    <div className="mt-3 pt-3 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 max-w-md truncate">
                        <span className="text-[10px] text-slate-400 font-mono">SHA256:</span>
                        <code className="text-[10px] text-cyan-300 bg-slate-900 px-1.5 py-0.5 rounded truncate">
                          {version.sha256Checksum.substring(0, 24)}...
                        </code>
                        <button
                          onClick={() => handleCopy(version.sha256Checksum, `sha-${version.id}`)}
                          className="text-slate-400 hover:text-white"
                          title="Copiar Checksum"
                        >
                          {copiedText === `sha-${version.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(version.downloadUrl, `url-${version.id}`)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-[11px]"
                        >
                          {copiedText === `url-${version.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Copiar URL APK</span>
                        </button>

                        {!version.isCurrentProduction && (
                          <button
                            onClick={() => handleSetProductionVersion(selectedApp.id, version.id)}
                            className="px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-[11px] font-semibold"
                          >
                            Activar para Enrolamiento QR
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: New Version Upload */}
      {showNewVersionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                <span>Registrar Nueva Versión de APK ({selectedApp.name})</span>
              </h3>
              <button
                onClick={() => setShowNewVersionModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVersion} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Nombre de Versión</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: v2.4.1 (Parche de Rendimiento)"
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Version Code (Entero)</label>
                  <input
                    type="number"
                    required
                    value={newVersionCode}
                    onChange={(e) => setNewVersionCode(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">URL de Descarga Pública del Archivo APK</label>
                <input
                  type="url"
                  required
                  placeholder="https://tudominio.com/apks/rutacontrol-v2.4.1.apk"
                  value={newDownloadUrl}
                  onChange={(e) => setNewDownloadUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-2 text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Enlace directo a tu bucket S3, Firebase Hosting o servidor Apache/Nginx.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Tamaño Estimado (Bytes)</label>
                  <input
                    type="number"
                    value={newFileSizeBytes}
                    onChange={(e) => setNewFileSizeBytes(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    ~{formatFileSize(newFileSizeBytes)}
                  </span>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Firma SHA-256 (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Generado auto si está vacío"
                    value={newChecksum}
                    onChange={(e) => setNewChecksum(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-2 text-white font-mono focus:outline-none focus:border-cyan-500 text-[10px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Registro de Cambios (1 por línea)</label>
                <textarea
                  rows={3}
                  placeholder="- Corrección de reconexión GPS en túneles&#10;- Nueva validación de geocerca"
                  value={newChangelog}
                  onChange={(e) => setNewChangelog(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isProduction}
                  onChange={(e) => setIsProduction(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-slate-900 border-slate-700"
                />
                <div>
                  <span className="text-xs font-semibold text-white block">Establecer de inmediato como versión oficial de Producción</span>
                  <span className="text-[10px] text-slate-400">Actualizará el código QR de enrolamiento y las descargas activas</span>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewVersionModal(false)}
                  className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar y Publicar Versión</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New App Registration */}
      {showNewAppModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Registrar Nueva Aplicación para la Flota</span>
              </h3>
              <button
                onClick={() => setShowNewAppModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateApp} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nombre Comercial de la App</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cobranzas Express / Lector Códigos QR"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Package Name de Android (Único)</label>
                <input
                  type="text"
                  required
                  placeholder="com.miempresa.modulo.cobranzas"
                  value={newAppPackage}
                  onChange={(e) => setNewAppPackage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-2 text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Categoría</label>
                <select
                  value={newAppCategory}
                  onChange={(e) => setNewAppCategory(e.target.value as ApkApp['category'])}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="sales_billing">Ventas, Facturación y Cobranza</option>
                  <option value="custom_fleet">Herramienta de Camión / Chofer</option>
                  <option value="messaging">Mensajería / Comunicación</option>
                  <option value="telematics_core">Módulo de Telemetría GPS</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Descripción Breve</label>
                <textarea
                  rows={2}
                  placeholder="Para qué sirve esta app en la camioneta..."
                  value={newAppDesc}
                  onChange={(e) => setNewAppDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewAppModal(false)}
                  className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Crear App en Dashboard</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
