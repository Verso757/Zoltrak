import React from 'react';
import { 
  Navigation, 
  Smartphone, 
  BarChart3, 
  Code2, 
  Radio, 
  Play, 
  Pause, 
  RefreshCw,
  Fuel,
  ShieldCheck,
  AlertTriangle,
  Battery,
  Lock,
  QrCode,
  Package
} from 'lucide-react';
import { FleetSummary } from '../types';

interface NavbarProps {
  activeTab: 'dispatch' | 'apk_dashboard' | 'mobile_app' | 'performance' | 'battery_security' | 'qr_provisioning' | 'android_architecture';
  setActiveTab: (tab: 'dispatch' | 'apk_dashboard' | 'mobile_app' | 'performance' | 'battery_security' | 'qr_provisioning' | 'android_architecture') => void;
  summary: FleetSummary;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onResetSimulation: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  summary,
  isSimulating,
  onToggleSimulation,
  onResetSimulation,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      {/* Top Banner with Fleet Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black">
              <Navigation className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white tracking-tight">RutaControl Telematics</span>
                <span className="bg-cyan-950 text-cyan-400 border border-cyan-800/60 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                  Android Enterprise 2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Portal de Monitoreo en Vivo & App Chofer en 2do Plano</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-800">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSimulating ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSimulating ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-slate-300 font-medium">
              {isSimulating ? 'Telemetría en Vivo (1 Hz)' : 'Simulación en Pausa'}
            </span>
          </div>
        </div>

        {/* Global KPI Chips */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <div>
              <span className="text-slate-400 text-[10px] block leading-none">Choferes Activos</span>
              <span className="text-slate-100 font-bold text-xs">{summary.activeDriversCount}/{summary.totalDriversCount} en ruta</span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 flex items-center gap-2">
            <Fuel className="w-3.5 h-3.5 text-amber-400" />
            <div>
              <span className="text-slate-400 text-[10px] block leading-none">Consumo Flota</span>
              <span className="text-slate-100 font-bold text-xs">{summary.totalFuelConsumedL.toFixed(1)} Litros</span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <div>
              <span className="text-slate-400 text-[10px] block leading-none">Score Eco Prom.</span>
              <span className="text-emerald-400 font-bold text-xs">{summary.avgEcoScore}/100</span>
            </div>
          </div>

          {summary.activeAlertsCount > 0 && (
            <div className="bg-rose-950/50 border border-rose-800/80 rounded-lg px-2.5 py-1 flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <div>
                <span className="text-rose-400 text-[10px] block leading-none">Alertas Críticas</span>
                <span className="text-rose-200 font-bold text-xs">{summary.activeAlertsCount} eventos</span>
              </div>
            </div>
          )}

          {/* Simulation Play/Pause Controls */}
          <div className="flex items-center gap-1.5 ml-1">
            <button
              id="btn-toggle-sim"
              onClick={onToggleSimulation}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                isSimulating
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-900/40'
              }`}
            >
              {isSimulating ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pausar Simulación</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Reanudar Flota</span>
                </>
              )}
            </button>
            <button
              id="btn-reset-sim"
              onClick={onResetSimulation}
              title="Reiniciar coordenadas y métricas de prueba"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto scrollbar-none">
        <button
          id="nav-dispatch"
          onClick={() => setActiveTab('dispatch')}
          className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'dispatch'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>1. Portal Monitoreo & Despacho</span>
        </button>

        <button
          id="nav-apk-dashboard"
          onClick={() => setActiveTab('apk_dashboard')}
          className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'apk_dashboard'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Package className="w-4 h-4 text-cyan-400" />
          <span>2. Dashboard de APKs & Versiones</span>
        </button>

        <button
          id="nav-qr-provisioning"
          onClick={() => setActiveTab('qr_provisioning')}
          className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'qr_provisioning'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <QrCode className="w-4 h-4 text-cyan-400" />
          <span>3. Enrolamiento QR & Auto-Instalación</span>
        </button>

        <button
          id="nav-mobile-app"
          onClick={() => setActiveTab('mobile_app')}
          className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'mobile_app'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>4. App Móvil Chofer (Simulador PIN)</span>
        </button>

        <button
          id="nav-performance"
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'performance'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>5. Diagnóstico de Manejo</span>
        </button>

        <button
          id="nav-battery-security"
          onClick={() => setActiveTab('battery_security')}
          className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'battery_security'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Battery className="w-4 h-4" />
          <span>6. Consumo & Seguridad</span>
        </button>

        <button
          id="nav-android-arch"
          onClick={() => setActiveTab('android_architecture')}
          className={`flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'android_architecture'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>7. Código Kotlin</span>
        </button>
      </div>
    </header>
  );
};
