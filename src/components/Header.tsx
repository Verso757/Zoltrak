import React from 'react';
import { 
  Navigation, 
  Package, 
  QrCode, 
  Smartphone, 
  Sliders, 
  Radio, 
  Play, 
  Pause, 
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Fuel
} from 'lucide-react';
import { FleetSummary } from '../types';

export type DashboardTab = 'fleet' | 'apks' | 'qr_enrollment' | 'devices' | 'settings';

interface HeaderProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  summary: FleetSummary;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onResetSimulation: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  summary,
  isSimulating,
  onToggleSimulation,
  onResetSimulation,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      {/* Top Bar with Brand & Essential Live KPIs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & System Status */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
            <Navigation className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-slate-900 tracking-tight">RutaControl</h1>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                Portal Empresarial
              </span>
            </div>
            <p className="text-[12px] text-slate-500">Telemetría GPS en 2do Plano & Aprovisionamiento de Terminales</p>
          </div>
        </div>

        {/* Live Metrics Counters & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSimulating ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isSimulating ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-slate-600 font-medium">
              {isSimulating ? 'Telemetría Activa (1 Hz)' : 'Simulador en Pausa'}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <Radio className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-500">Flota:</span>
            <span className="font-semibold text-slate-900">{summary.activeDriversCount}/{summary.totalDriversCount} en ruta</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <Fuel className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-500">Combustible:</span>
            <span className="font-semibold text-slate-900">{summary.totalFuelConsumedL.toFixed(1)} L</span>
          </div>

          {summary.activeAlertsCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>{summary.activeAlertsCount} Alertas</span>
            </div>
          )}

          {/* Quick Simulation Toggles */}
          <div className="flex items-center gap-1 pl-1">
            <button
              id="btn-header-toggle-sim"
              onClick={onToggleSimulation}
              title={isSimulating ? 'Pausar actualización en vivo' : 'Reanudar actualización en vivo'}
              className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isSimulating 
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50' 
                  : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isSimulating ? 'Pausar' : 'Reanudar'}</span>
            </button>

            <button
              id="btn-header-reset-sim"
              onClick={onResetSimulation}
              title="Restablecer valores de prueba"
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto scrollbar-none">
        <button
          id="tab-fleet"
          onClick={() => setActiveTab('fleet')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'fleet'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>1. Flota & Monitoreo en Vivo</span>
        </button>

        <button
          id="tab-apks"
          onClick={() => setActiveTab('apks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'apks'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>2. Gestor de APKs & Versiones</span>
        </button>

        <button
          id="tab-qr"
          onClick={() => setActiveTab('qr_enrollment')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'qr_enrollment'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>3. Enrolamiento QR (Android Enterprise)</span>
        </button>

        <button
          id="tab-devices"
          onClick={() => setActiveTab('devices')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'devices'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>4. Terminales & Batería</span>
        </button>

        <button
          id="tab-settings"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>5. Seguridad PIN & Parámetros</span>
        </button>
      </div>
    </header>
  );
};
