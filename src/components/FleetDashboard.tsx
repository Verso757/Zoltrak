import React, { useState } from 'react';
import { 
  Driver, 
  DriverAlert, 
  RouteStop 
} from '../types';
import { InteractiveMap } from './InteractiveMap';
import { 
  Battery, 
  BatteryCharging, 
  Gauge, 
  Fuel, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  UserCheck, 
  Phone, 
  Smartphone,
  Navigation,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  DollarSign
} from 'lucide-react';
import { formatCurrency } from '../utils/telemetryMath';

interface FleetDashboardProps {
  drivers: Driver[];
  selectedDriver: Driver;
  onSelectDriver: (driver: Driver) => void;
  alerts: DriverAlert[];
  onDismissAlert: (id: string) => void;
  onUpdateStopStatus: (driverId: string, stopId: string, status: RouteStop['status']) => void;
}

export const FleetDashboard: React.FC<FleetDashboardProps> = ({
  drivers,
  selectedDriver,
  onSelectDriver,
  alerts,
  onDismissAlert,
  onUpdateStopStatus,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterStatus === 'todos') return matchesSearch;
    if (filterStatus === 'alerta') return matchesSearch && (d.status === 'exceso_velocidad' || d.status === 'detenido_ralenti');
    if (filterStatus === 'en_ruta') return matchesSearch && d.status === 'en_ruta';
    if (filterStatus === 'en_cliente') return matchesSearch && d.status === 'en_cliente';
    return matchesSearch;
  });

  const getStatusBadge = (status: Driver['status']) => {
    switch (status) {
      case 'en_ruta':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            En Ruta
          </span>
        );
      case 'en_cliente':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            En Cliente
          </span>
        );
      case 'detenido_ralenti':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            Ralentí &gt;10 min
          </span>
        );
      case 'exceso_velocidad':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3 text-rose-400 animate-bounce" />
            Exceso Vel.
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* Real-time Alerts Banner if any */}
      {alerts.length > 0 && (
        <div className="bg-slate-900 border border-rose-900/50 rounded-xl p-3.5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-rose-500/20 text-rose-400 rounded-md">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                Alertas Telemétricas en Tiempo Real ({alerts.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Generadas por sensores de celular y GPS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {alerts.slice(0, 4).map((alert) => (
              <div
                key={alert.id}
                className="bg-slate-950/80 border border-slate-800 hover:border-rose-700/60 p-2.5 rounded-lg text-xs space-y-1 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-rose-300 line-clamp-1">{alert.driverName}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{alert.timestamp}</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-snug">{alert.message}</p>
                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-900">
                  <span>{alert.routeCode}</span>
                  <button
                    onClick={() => onDismissAlert(alert.id)}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                  >
                    Atender
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Left Drivers Sidebar, Center Map, Right Live Telemetry HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Col: Driver Fleet Roster (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-slate-100">Flota de Preventa & Entrega</h2>
                <p className="text-[11px] text-slate-400">Celulares con servicio en 2do plano</p>
              </div>
              <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                {drivers.length} Unidades
              </span>
            </div>

            {/* Search & Filter pills */}
            <div className="space-y-2">
              <input
                id="search-drivers"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar chofer, ruta o placa..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />

              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                {['todos', 'en_ruta', 'en_cliente', 'alerta'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setFilterStatus(filter)}
                    className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors whitespace-nowrap ${
                      filterStatus === filter
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {filter === 'todos' ? 'Todos' : filter.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Drivers Scrollable List */}
            <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
              {filteredDrivers.map((driver) => {
                const isSelected = selectedDriver.id === driver.id;
                const completedStops = driver.stops.filter((s) => s.status === 'completado').length;
                const progressPct = Math.round((completedStops / driver.stops.length) * 100);

                return (
                  <div
                    key={driver.id}
                    id={`driver-card-${driver.id}`}
                    onClick={() => onSelectDriver(driver)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={driver.avatar}
                          alt={driver.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-100">{driver.name}</span>
                            <span className="text-[10px] text-cyan-400 font-mono font-semibold">
                              {driver.routeCode}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{driver.vehicleModel}</p>
                        </div>
                      </div>
                      {getStatusBadge(driver.status)}
                    </div>

                    {/* Quick Telemetry Row */}
                    <div className="grid grid-cols-3 gap-1.5 py-1.5 px-2 bg-slate-900/80 rounded-lg text-[11px] border border-slate-800/60 mb-2">
                      <div>
                        <span className="text-[10px] text-slate-500 block leading-tight">Velocidad</span>
                        <span className="font-bold text-slate-200">{driver.currentSpeedKmH} km/h</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block leading-tight">Consumo</span>
                        <span className="font-bold text-amber-400">{driver.estimatedFuelConsumedLiters.toFixed(1)} L</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block leading-tight">Score Eco</span>
                        <span className={`font-bold ${driver.ecoScore > 85 ? 'text-emerald-400' : driver.ecoScore > 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {driver.ecoScore}/100
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Device Battery */}
                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span>Entregas: {completedStops}/{driver.stops.length} ({progressPct}%)</span>
                          <span>Venta: {formatCurrency(driver.totalSalesAmount)}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pl-2">
                        {driver.isCharging ? (
                          <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Battery className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{driver.batteryLevel}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center & Right Col: Interactive Map & Selected Driver Live Telemetry HUD (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Map Container */}
          <div className="h-[400px] w-full relative">
            <InteractiveMap
              drivers={drivers}
              selectedDriver={selectedDriver}
              onSelectDriver={onSelectDriver}
            />
          </div>

          {/* Selected Driver Detailed Telemetry Gauges & Real-time Sensor HUD */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={selectedDriver.avatar}
                  alt={selectedDriver.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">{selectedDriver.name}</h3>
                    <span className="bg-cyan-500/20 text-cyan-300 font-mono text-xs px-2 py-0.5 rounded font-bold border border-cyan-500/40">
                      {selectedDriver.routeCode}
                    </span>
                    {getStatusBadge(selectedDriver.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>{selectedDriver.routeName}</span>
                    <span>•</span>
                    <span>Placa: <b className="text-slate-200">{selectedDriver.vehiclePlate}</b></span>
                    <span>•</span>
                    <span>{selectedDriver.vehicleModel}</span>
                  </div>
                </div>
              </div>

              {/* Android Enterprise Status Pill */}
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-200">{selectedDriver.deviceModel}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Foreground Service Activo"></span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">2do Plano Activo (WakeLock OK)</span>
                </div>
              </div>
            </div>

            {/* 4 Real-time Telemetry Tele-Gauges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Gauge 1: Speedometer */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    Velocímetro
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Límite: 60</span>
                </div>
                <div className="my-1">
                  <span className={`text-2xl sm:text-3xl font-black font-mono ${selectedDriver.currentSpeedKmH > 60 ? 'text-rose-400 animate-pulse' : 'text-slate-100'}`}>
                    {selectedDriver.currentSpeedKmH}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">km/h</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  GPS Fused Location (Precisión: ±2m)
                </div>
              </div>

              {/* Gauge 2: Relative Fuel Telemetry */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                  <span className="flex items-center gap-1">
                    <Fuel className="w-3.5 h-3.5 text-amber-400" />
                    Consumo Relativo
                  </span>
                  <span className="text-[10px] font-mono text-amber-400">{selectedDriver.fuelType}</span>
                </div>
                <div className="my-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
                    {selectedDriver.estimatedFuelConsumedLiters.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">Litros</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Desperdicio ralenti: <b className="text-rose-400">{selectedDriver.excessFuelWastedLiters.toFixed(2)} L</b>
                </div>
              </div>

              {/* Gauge 3: Eco-Score & Driving Style */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Score Conducción
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">Objetivo &gt;85</span>
                </div>
                <div className="my-1">
                  <span className={`text-2xl sm:text-3xl font-black font-mono ${selectedDriver.ecoScore > 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedDriver.ecoScore}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">/100</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {selectedDriver.suddenBrakingCount} frenadas • {selectedDriver.suddenAccelCount} aceleraciones
                </div>
              </div>

              {/* Gauge 4: G-Force Accelerometer Peak */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    Acelerómetro Celular
                  </span>
                  <span className="text-[10px] font-mono text-purple-400">Sensor IMU</span>
                </div>
                <div className="my-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono text-purple-300">
                    {selectedDriver.currentAccelG > 0 ? `+${selectedDriver.currentAccelG.toFixed(2)}` : selectedDriver.currentAccelG.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">G</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Filtro Kalman lineal en Android
                </div>
              </div>
            </div>

            {/* Route Stops / Customers Delivery Timeline */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span>Itinerario y Geocercas ({selectedDriver.stops.length} Paradas Programadas)</span>
                </h4>
                <div className="text-xs text-slate-400">
                  Avance: <b className="text-emerald-400">{selectedDriver.stops.filter(s => s.status === 'completado').length}/{selectedDriver.stops.length} visitados</b>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedDriver.stops.map((stop, idx) => (
                  <div
                    key={stop.id}
                    className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                      stop.status === 'completado'
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-200'
                        : stop.status === 'en_atencion'
                        ? 'bg-purple-950/30 border-purple-500/50 text-slate-100 shadow-md ring-1 ring-purple-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            stop.status === 'completado'
                              ? 'bg-emerald-500 text-slate-950'
                              : stop.status === 'en_atencion'
                              ? 'bg-purple-500 text-white animate-pulse'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-100 line-clamp-1">{stop.clientName}</span>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400 font-semibold shrink-0">
                          {stop.scheduledTime}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mb-1.5">{stop.address}</p>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 text-[11px]">
                      <div>
                        <span className="text-slate-400">Ventana: </span>
                        <span className="font-bold text-slate-100">{stop.scheduledTime}</span>
                        {stop.durationMinutes && (
                          <span className="text-[10px] text-cyan-400 ml-1">({stop.durationMinutes} min en cliente)</span>
                        )}
                      </div>

                      {/* Status toggle actions */}
                      <div className="flex items-center gap-1">
                        {stop.status === 'pendiente' && (
                          <button
                            onClick={() => onUpdateStopStatus(selectedDriver.id, stop.id, 'en_atencion')}
                            className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 border border-purple-500/40 text-[10px] font-semibold"
                          >
                            Iniciar Visita
                          </button>
                        )}
                        {stop.status === 'en_atencion' && (
                          <button
                            onClick={() => onUpdateStopStatus(selectedDriver.id, stop.id, 'completado')}
                            className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 hover:bg-emerald-400 text-[10px] font-bold flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Finalizar
                          </button>
                        )}
                        {stop.status === 'completado' && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            {stop.durationMinutes} min ({stop.arrivalTime})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
