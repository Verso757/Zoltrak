import React, { useState } from 'react';
import { 
  Driver, 
  DriverAlert, 
  RouteStop, 
  DriverStatus 
} from '../types';
import { InteractiveMap } from './InteractiveMap';
import { 
  Navigation, 
  Gauge, 
  Fuel, 
  Battery, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Search, 
  Filter, 
  Phone,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
  Layers
} from 'lucide-react';

interface LiveFleetViewProps {
  drivers: Driver[];
  selectedDriver: Driver | null;
  onSelectDriver: (driver: Driver) => void;
  alerts: DriverAlert[];
  onDismissAlert?: (alertId: string) => void;
}

export const LiveFleetView: React.FC<LiveFleetViewProps> = ({
  drivers,
  selectedDriver,
  onSelectDriver,
  alerts,
  onDismissAlert,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'stops' | 'telemetry' | 'alerts'>('stops');

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.routeCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && d.status === statusFilter;
  });

  const getStatusBadge = (status: DriverStatus) => {
    switch (status) {
      case 'en_ruta':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">En Ruta</span>;
      case 'en_cliente':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">En Cliente</span>;
      case 'detenido_ralenti':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Ralentí &gt; 5 min</span>;
      case 'exceso_velocidad':
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full animate-pulse">Exceso Velocidad</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">Inactivo</span>;
    }
  };

  const currentDriver = selectedDriver || drivers[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Overview Top Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Unidades en Ruta</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Navigation className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {drivers.filter(d => d.status === 'en_ruta' || d.status === 'en_cliente').length}
            </span>
            <span className="text-xs text-slate-500">de {drivers.length} activos</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Promedio Eco-Score</span>
            <span className="p-1.5 rounded-lg bg-cyan-50 text-cyan-600">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {Math.round(drivers.reduce((acc, d) => acc + d.ecoScore, 0) / drivers.length)}/100
            </span>
            <span className="text-xs text-emerald-600 font-medium">+4.2 pts vs ayer</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Combustible Estimado</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Fuel className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {drivers.reduce((acc, d) => acc + d.estimatedFuelConsumedLiters, 0).toFixed(1)} L
            </span>
            <span className="text-xs text-slate-500">promedio 10.2 L/100km</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Alertas Operativas</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{alerts.length}</span>
            <span className="text-xs text-rose-600 font-medium">requieren atención</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column Driver List, Center/Right Map & Live Telemetry Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Driver Selection List (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Vehículos en Circulación</h2>
              <span className="text-xs text-slate-500 font-medium">{filteredDrivers.length} unidades</span>
            </div>

            {/* Search and Filters */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                id="search-drivers"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por chofer, placa o ruta..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800"
              />
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                id="filter-status-all"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  statusFilter === 'all' 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                id="filter-status-en-ruta"
                onClick={() => setStatusFilter('en_ruta')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  statusFilter === 'en_ruta' 
                    ? 'bg-emerald-700 text-white' 
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                En Ruta
              </button>
              <button
                id="filter-status-en-cliente"
                onClick={() => setStatusFilter('en_cliente')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  statusFilter === 'en_cliente' 
                    ? 'bg-indigo-700 text-white' 
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                En Cliente
              </button>
              <button
                id="filter-status-detenido"
                onClick={() => setStatusFilter('detenido_ralenti')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  statusFilter === 'detenido_ralenti' 
                    ? 'bg-amber-700 text-white' 
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Ralentí
              </button>
            </div>

            {/* Drivers list */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredDrivers.map((driver) => {
                const isSelected = currentDriver?.id === driver.id;
                return (
                  <div
                    id={`driver-card-${driver.id}`}
                    key={driver.id}
                    onClick={() => onSelectDriver(driver)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-semibold text-xs ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {driver.name}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                            isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {driver.routeCode}
                          </span>
                        </div>
                        <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          {driver.vehiclePlate} • {driver.vehicleModel}
                        </div>
                      </div>
                      <div>
                        {getStatusBadge(driver.status)}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-cyan-400" />
                        <span className={`font-mono font-medium ${isSelected ? 'text-cyan-300' : 'text-slate-700'}`}>
                          {driver.currentSpeedKmH} km/h
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Fuel className="w-3 h-3 text-amber-400" />
                        <span className={`font-mono ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                          {driver.estimatedFuelConsumedLiters.toFixed(1)} L
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Battery className="w-3 h-3 text-emerald-400" />
                        <span className={`font-mono ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                          {driver.batteryLevel}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Map + Selected Driver Telemetry Cockpit (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Map Container Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {/* Map Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  Vista Satelital & Geocercas en Tiempo Real
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  GPS {currentDriver.currentLat.toFixed(4)}, {currentDriver.currentLng.toFixed(4)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> En Ruta
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" /> En Cliente
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Ralentí
                </span>
              </div>
            </div>

            {/* Map Canvas */}
            <div className="h-[380px] w-full relative">
              <InteractiveMap
                drivers={drivers}
                selectedDriver={currentDriver}
                onSelectDriver={onSelectDriver}
              />
            </div>
          </div>

          {/* Selected Driver Deep Telemetry Details */}
          {currentDriver && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-4">
              {/* Driver Header Summary */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <img
                    src={currentDriver.avatar}
                    alt={currentDriver.name}
                    className="w-11 h-11 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{currentDriver.name}</h3>
                      {getStatusBadge(currentDriver.status)}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentDriver.routeName} • Placas <span className="font-mono font-semibold text-slate-700">{currentDriver.vehiclePlate}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${currentDriver.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Llamar Chofer</span>
                  </a>
                </div>
              </div>

              {/* Real-time Vehicle Cockpit Numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">Velocidad Instantánea</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{currentDriver.currentSpeedKmH}</span>
                    <span className="text-xs text-slate-500 font-medium">km/h</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Límite vía: 60 km/h</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">Aceleración / G-Force</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className={`text-xl font-bold font-mono ${
                      Math.abs(currentDriver.currentAccelG) > 0.25 ? 'text-amber-600' : 'text-slate-900'
                    }`}>
                      {currentDriver.currentAccelG > 0 ? `+${currentDriver.currentAccelG.toFixed(2)}` : currentDriver.currentAccelG.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">G</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Frenado brusco: &lt; -0.30G</span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">Consumo Estimado</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">
                      {currentDriver.estimatedFuelConsumedLiters.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">L</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium mt-1 block">
                    {currentDriver.excessFuelWastedLiters > 0 ? `Desperdicio: ${currentDriver.excessFuelWastedLiters.toFixed(2)} L` : 'Eficiencia óptima'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">Terminal Celular</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-slate-900">{currentDriver.batteryLevel}%</span>
                    <span className="text-xs text-emerald-600 font-medium">{currentDriver.isCharging ? '(Cargando)' : ''}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">{currentDriver.deviceModel}</span>
                </div>
              </div>

              {/* Sub-tabs for Stops, Telemetry Trail, and Alerts */}
              <div className="pt-2">
                <div className="flex border-b border-slate-200 text-xs font-semibold">
                  <button
                    id="tab-sub-stops"
                    onClick={() => setActiveSubTab('stops')}
                    className={`pb-2 px-3 border-b-2 transition-colors ${
                      activeSubTab === 'stops' 
                        ? 'border-slate-900 text-slate-900' 
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Hoja de Ruta ({currentDriver.stops.filter(s => s.status === 'completado').length}/{currentDriver.stops.length} Entregas)
                  </button>
                  <button
                    id="tab-sub-telemetry"
                    onClick={() => setActiveSubTab('telemetry')}
                    className={`pb-2 px-3 border-b-2 transition-colors ${
                      activeSubTab === 'telemetry' 
                        ? 'border-slate-900 text-slate-900' 
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Comportamiento & Eco-Score ({currentDriver.ecoScore}/100)
                  </button>
                </div>

                {/* SubTab 1: Stops */}
                {activeSubTab === 'stops' && (
                  <div className="mt-3 space-y-2">
                    {currentDriver.stops.map((stop, idx) => (
                      <div
                        key={stop.id}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                            stop.status === 'completado' 
                              ? 'bg-emerald-600 text-white' 
                              : stop.status === 'en_atencion' 
                              ? 'bg-amber-500 text-white' 
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                            {stop.status === 'completado' ? '✓' : idx + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{stop.clientName}</div>
                            <div className="text-[11px] text-slate-500">{stop.address} • Prog. {stop.scheduledTime}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-slate-900">${stop.orderValue.toLocaleString()} MXN</div>
                          <span className={`text-[10px] font-semibold uppercase ${
                            stop.status === 'completado' ? 'text-emerald-600' : stop.status === 'en_atencion' ? 'text-amber-600' : 'text-slate-400'
                          }`}>
                            {stop.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* SubTab 2: Telemetry Performance */}
                {activeSubTab === 'telemetry' && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 font-medium">Frenados Bruscos</span>
                      <div className="text-lg font-bold text-slate-900 mt-1">{currentDriver.suddenBrakingCount} eventos</div>
                      <p className="text-[11px] text-slate-500 mt-1">Impacto en desgaste de pastillas y combustible.</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 font-medium">Aceleraciones Bruscas</span>
                      <div className="text-lg font-bold text-slate-900 mt-1">{currentDriver.suddenAccelCount} eventos</div>
                      <p className="text-[11px] text-slate-500 mt-1">Mayor inyección de combustible (+18%).</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-slate-500 font-medium">Tiempo en Ralentí</span>
                      <div className="text-lg font-bold text-slate-900 mt-1">{currentDriver.idleTimeMinutes} minutos</div>
                      <p className="text-[11px] text-slate-500 mt-1">Motor encendido con vehículo estacionado.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
