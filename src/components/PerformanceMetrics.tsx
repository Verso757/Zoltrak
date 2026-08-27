import React, { useState } from 'react';
import { Driver } from '../types';
import { 
  BarChart3, 
  Trophy, 
  Fuel, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Download,
  DollarSign,
  Award,
  Zap
} from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/telemetryMath';

interface PerformanceMetricsProps {
  drivers: Driver[];
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ drivers }) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id || '');
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState<number>(24.5); // MXN / standard price

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0];

  // Sort drivers by eco score descending
  const sortedDrivers = [...drivers].sort((a, b) => b.ecoScore - a.ecoScore);

  const totalFuelFleet = drivers.reduce((acc, d) => acc + d.estimatedFuelConsumedLiters, 0);
  const totalWastedFleet = drivers.reduce((acc, d) => acc + d.excessFuelWastedLiters, 0);
  const totalIdleMinutesFleet = drivers.reduce((acc, d) => acc + d.idleTimeMinutes, 0);
  const totalSpeedingFleet = drivers.reduce((acc, d) => acc + d.speedingEventsCount, 0);
  const totalBrakingFleet = drivers.reduce((acc, d) => acc + d.suddenBrakingCount, 0);

  // Financial impact calculations (Monthly projection for 30 days)
  const monthlyWastedCost = totalWastedFleet * fuelPricePerLiter * 26; // 26 working days
  const potentialSavingsMonthly = monthlyWastedCost * 0.75; // 75% savable with telematics alerts

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Performance & ROI Headline */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Trophy className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white">
              Métricas de Desempeño, Eco-Conducción & Ahorro de Combustible
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Monitoreo comparativo de choferes, detección de desperdicio por ralentí y frenados bruscos con proyección financiera de ahorro.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-400 block">Precio Combustible / L:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={fuelPricePerLiter}
                  onChange={(e) => setFuelPricePerLiter(Number(e.target.value))}
                  className="w-16 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-white font-bold text-xs"
                />
                <span className="text-slate-400">MXN</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Fleet Performance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Score Eco Promedio Flota</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {Math.round(drivers.reduce((acc, d) => acc + d.ecoScore, 0) / drivers.length)}/100
          </div>
          <p className="text-[11px] text-slate-400">
            {sortedDrivers[0].name} lidera con {sortedDrivers[0].ecoScore} pts
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Combustible Desperdiciado (Hoy)</span>
            <Fuel className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {totalWastedFleet.toFixed(2)} L
          </div>
          <p className="text-[11px] text-slate-400">
            Costo: <b className="text-slate-200">{formatCurrency(totalWastedFleet * fuelPricePerLiter)} hoy</b>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Tiempo Total en Ralentí</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {totalIdleMinutesFleet} min
          </div>
          <p className="text-[11px] text-slate-400">
            Motor encendido en paradas y semáforos
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Ahorro Mensual Estimado</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {formatCurrency(potentialSavingsMonthly)}
          </div>
          <p className="text-[11px] text-emerald-300/80">
            Optimizando hábitos de conducción (-75% ralentí)
          </p>
        </div>
      </div>

      {/* Main Grid: Driver Leaderboard Table (Left 7) & Individual Diagnostic Scorecard (Right 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Leaderboard Table (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Ranking de Conducción y Eficiencia
                </h3>
                <p className="text-xs text-slate-400">Puntaje calculado en tiempo real con datos de telemetría</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Pos</th>
                    <th className="p-2.5">Chofer & Ruta</th>
                    <th className="p-2.5 text-center">Score Eco</th>
                    <th className="p-2.5 text-center">Consumo (L)</th>
                    <th className="p-2.5 text-center">Desperdicio</th>
                    <th className="p-2.5 text-center">Frenazos / Vel.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sortedDrivers.map((driver, index) => {
                    const isSelected = driver.id === selectedDriver.id;
                    return (
                      <tr
                        key={driver.id}
                        onClick={() => setSelectedDriverId(driver.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-slate-800/80 text-white'
                            : 'hover:bg-slate-950/40 text-slate-300'
                        }`}
                      >
                        <td className="p-2.5 font-bold">
                          {index === 0 ? (
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                              1
                            </span>
                          ) : index === 1 ? (
                            <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-950 flex items-center justify-center font-black">
                              2
                            </span>
                          ) : index === 2 ? (
                            <span className="w-5 h-5 rounded-full bg-amber-700 text-white flex items-center justify-center font-black">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono ml-1.5">{index + 1}</span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-2">
                            <img
                              src={driver.avatar}
                              alt={driver.name}
                              className="w-7 h-7 rounded-full object-cover border border-slate-700"
                            />
                            <div>
                              <div className="font-bold text-slate-100">{driver.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{driver.routeCode} • {driver.vehiclePlate}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs ${
                            driver.ecoScore > 88
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : driver.ecoScore > 75
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {driver.ecoScore}/100
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-200">
                          {driver.estimatedFuelConsumedLiters.toFixed(2)} L
                        </td>
                        <td className="p-2.5 text-center font-mono text-rose-400 font-semibold">
                          +{driver.excessFuelWastedLiters.toFixed(2)} L
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          <span className="text-amber-400">{driver.suddenBrakingCount}</span> /{' '}
                          <span className="text-rose-400">{driver.speedingEventsCount}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Selected Driver Detailed Scorecard (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <img
                src={selectedDriver.avatar}
                alt={selectedDriver.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400"
              />
              <div>
                <h3 className="font-bold text-base text-white">{selectedDriver.name}</h3>
                <p className="text-xs text-slate-400">
                  {selectedDriver.routeName} • {selectedDriver.vehicleModel}
                </p>
              </div>
            </div>

            {/* Score breakdown metrics */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                Desglose de Factores de Conducción
              </h4>

              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Suavidad de Frenado & Aceleración</span>
                  <span className="font-bold text-slate-200">
                    {Math.max(0, 100 - selectedDriver.suddenBrakingCount * 8 - selectedDriver.suddenAccelCount * 6)}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full rounded-full"
                    style={{ width: `${Math.max(0, 100 - selectedDriver.suddenBrakingCount * 8 - selectedDriver.suddenAccelCount * 6)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Respeto a Límites de Velocidad</span>
                  <span className="font-bold text-slate-200">
                    {Math.max(0, 100 - selectedDriver.speedingEventsCount * 18)}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full rounded-full"
                    style={{ width: `${Math.max(0, 100 - selectedDriver.speedingEventsCount * 18)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Eficiencia en Ralentí (Paradas con motor apagado)</span>
                  <span className="font-bold text-slate-200">
                    {Math.max(0, 100 - Math.round((selectedDriver.idleTimeMinutes / selectedDriver.totalTimeMinutes) * 200))}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full"
                    style={{ width: `${Math.max(0, 100 - Math.round((selectedDriver.idleTimeMinutes / selectedDriver.totalTimeMinutes) * 200))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* AI / Telematics Recommendation Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                Diagnóstico Telemétrico Automático
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {selectedDriver.ecoScore > 85
                  ? 'Excelente hábito de manejo. Mantiene velocidades uniformes y apaga el motor al descender a atender a los clientes de la ruta.'
                  : selectedDriver.speedingEventsCount > 2
                  ? 'Alerta de exceso de velocidad en avenidas principales. Se recomienda capacitar en límites urbanos para reducir riesgo de accidentes y consumo de combustible.'
                  : selectedDriver.idleTimeMinutes > 45
                  ? 'Alto tiempo en ralentí estacionario (>45 min). El chofer suele dejar encendido el aire acondicionado o motor mientras descarga mercancía.'
                  : 'Desempeño promedio. Reducir aceleraciones intempestivas después de semáforos puede ahorrar hasta 1.2 L diarios.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
