import React, { useState } from 'react';
import { 
  Battery, 
  Wifi, 
  Lock, 
  Power, 
  ShieldCheck, 
  Cpu, 
  Database, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  Gauge, 
  Smartphone,
  Server,
  ArrowRight,
  Info,
  KeyRound,
  FileCheck
} from 'lucide-react';

export const BatteryAndSecurityAnalyzer: React.FC = () => {
  // Data consumption calculator state
  const [fleetSize, setFleetSize] = useState<number>(15);
  const [hoursPerDay, setHoursPerDay] = useState<number>(9);
  const [pingIntervalSec, setPingIntervalSec] = useState<number>(10);
  const [useBatchingCompression, setUseBatchingCompression] = useState<boolean>(true);
  const [workingDaysPerMonth, setWorkingDaysPerMonth] = useState<number>(26);

  // Payload byte size calculation
  // Raw JSON: ~280 bytes. Compressed Protobuf / Gzip Batched: ~75 bytes per coordinate
  const bytesPerPing = useBatchingCompression ? 75 : 280;
  const pingsPerHour = 3600 / pingIntervalSec;
  const kbPerHourPerVehicle = (pingsPerHour * bytesPerPing) / 1024;
  const mbPerDayPerVehicle = (kbPerHourPerVehicle * hoursPerDay) / 1024;
  const mbPerMonthPerVehicle = mbPerDayPerVehicle * workingDaysPerMonth;
  const totalFleetMonthlyGb = (mbPerMonthPerVehicle * fleetSize) / 1024;

  // Battery Drain calculation state
  const [batteryOptimizationMode, setBatteryOptimizationMode] = useState<'adaptive' | 'unoptimized'>('adaptive');
  const [screenState, setScreenState] = useState<'off' | 'on'>('off');
  const [inVehicleCharging, setInVehicleCharging] = useState<boolean>(true);

  const getBatteryDrainRate = () => {
    let rate = 0;
    if (batteryOptimizationMode === 'unoptimized') {
      rate = screenState === 'on' ? 19.5 : 12.0; // Continuous GPS polling + wakeLock
    } else {
      // Adaptive GPS (Fused Location + Displacement + Accelerometer rest)
      rate = screenState === 'on' ? 8.5 : 2.7; // ~2.7% per hour in background with screen off
    }
    return rate;
  };

  const drainRate = getBatteryDrainRate();
  // Standard 12V 2.1A in-vehicle USB charger gives +30% to +45% charge per hour
  const chargeRate = inVehicleCharging ? 35.0 : 0;
  const netBatteryDelta = chargeRate - drainRate;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Análisis de Consumo (Datos & Batería), Permisos y Seguridad PIN
              </h1>
            </div>
            <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
              Respuestas técnicas precisas sobre la viabilidad en Android: cómo garantizar que la app <b>no agote la batería ni el plan de datos</b>, arranque automáticamente al encender el celular y quede <b>protegida con PIN de supervisor</b> para evitar que el chofer la apague.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Consumo Datos Promedio</span>
              <span className="text-lg font-black text-cyan-400">~18 MB / mes</span>
              <span className="text-[10px] text-slate-500 block">por vehículo (9h/día)</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">Drenado Batería 2do Plano</span>
              <span className="text-lg font-black text-emerald-400">~2.7% / hora</span>
              <span className="text-[10px] text-slate-500 block">pantalla apagada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid 1: Interactive Data Consumption Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Calculator Controls */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Calculadora Interactiva de Consumo de Datos Móviles</h2>
                <p className="text-xs text-slate-400">Simula el gasto en megabytes según el tamaño de flota y frecuencia</p>
              </div>
            </div>
            <span className="bg-indigo-950 text-indigo-400 border border-indigo-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
              Ultra Bajo Consumo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Fleet Size */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Cantidad de Vehículos:</span>
                <span className="text-indigo-400 font-bold">{fleetSize} unidades</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={fleetSize} 
                onChange={(e) => setFleetSize(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>1 veh.</span>
                <span>50 veh.</span>
                <span>100 veh.</span>
              </div>
            </div>

            {/* Hours per Day */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Horas de Ruta por Día:</span>
                <span className="text-indigo-400 font-bold">{hoursPerDay} horas/día</span>
              </div>
              <input 
                type="range" 
                min="4" 
                max="14" 
                value={hoursPerDay} 
                onChange={(e) => setHoursPerDay(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>4h (Medio día)</span>
                <span>8-9h (Normal)</span>
                <span>14h (Intensivo)</span>
              </div>
            </div>

            {/* Ping Frequency */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Frecuencia de Transmisión GPS:</span>
                <span className="text-cyan-400 font-bold">Cada {pingIntervalSec} segundos</span>
              </div>
              <select 
                value={pingIntervalSec}
                onChange={(e) => setPingIntervalSec(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value={5}>Cada 5 segundos (Super Alta Fidelidad en Ciudad)</option>
                <option value={10}>Cada 10 segundos (Recomendado - Óptimo)</option>
                <option value={15}>Cada 15 segundos (Económico)</option>
                <option value={30}>Cada 30 segundos (Ultra Ahorro)</option>
                <option value={60}>Cada 60 segundos (Mínimo)</option>
              </select>
            </div>

            {/* Working days */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Días Laborales por Mes:</span>
                <span className="text-indigo-400 font-bold">{workingDaysPerMonth} días</span>
              </div>
              <select 
                value={workingDaysPerMonth}
                onChange={(e) => setWorkingDaysPerMonth(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={20}>20 días (Lunes a Viernes)</option>
                <option value={26}>26 días (Lunes a Sábado - Estándar)</option>
                <option value={30}>30 días (Operación 24/7 continua)</option>
              </select>
            </div>
          </div>

          {/* Compression Toggle */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">Compresión en Lote (GZIP / Protobuf / SQLite Buffer)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Empaqueta 3 a 5 reportes por paquete HTTP/MQTT, reduciendo el peso de cabeceras de 280 bytes a ~75 bytes por punto.
              </p>
            </div>
            <button
              onClick={() => setUseBatchingCompression(!useBatchingCompression)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                useBatchingCompression 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {useBatchingCompression ? 'Activado (75B)' : 'Desactivado (280B)'}
            </button>
          </div>
        </div>

        {/* Right Column: Calculated Results */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Consumo Estimado de Datos Móviles
            </h3>

            <div className="space-y-3.5">
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Por hora por chofer</span>
                  <span className="text-[11px] text-slate-500">{pingsPerHour} reportes/hora</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-white">{kbPerHourPerVehicle.toFixed(1)} KB</span>
                  <span className="text-[10px] text-emerald-400 block font-semibold">Casi imperceptible</span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Por día de ruta ({hoursPerDay} horas)</span>
                  <span className="text-[11px] text-slate-500">1 celular</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-cyan-400">{mbPerDayPerVehicle.toFixed(2)} MB</span>
                  <span className="text-[10px] text-slate-400 block">Menos que 1 video de TikTok</span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Por mes por chofer ({workingDaysPerMonth} días)</span>
                  <span className="text-[11px] text-slate-500">Plan de chip requerido</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-emerald-400">{mbPerMonthPerVehicle.toFixed(1)} MB</span>
                  <span className="text-[10px] text-emerald-300 block font-semibold">Cualquier plan básico alcanza</span>
                </div>
              </div>

              {/* Total Fleet Result */}
              <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-cyan-300 font-bold block">Toda la Flota ({fleetSize} vehículos)</span>
                  <span className="text-[11px] text-slate-400">Gasto total mensual de la empresa</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-white">{totalFleetMonthlyGb.toFixed(2)} GB</span>
                  <span className="text-[10px] text-cyan-400 block font-semibold">Total para toda la flota</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-400">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>
              <b>Modo Sin Conexión (Offline-First):</b> Si el chofer entra en sótanos o zonas sin señal 4G, la app almacena los datos localmente en SQLite y los transmite en un solo envío compacto al recuperar la cobertura.
            </p>
          </div>
        </div>
      </div>

      {/* Grid 2: Battery Consumption & Smart Power Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <Battery className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Consumo de Batería & Algoritmo Adaptativo</h2>
                <p className="text-xs text-slate-400">Cómo logramos que la batería rinda todo el día en 2do plano</p>
              </div>
            </div>
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
              ~2.7% / hora
            </span>
          </div>

          {/* Interactive Simulation Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 block">Algoritmo GPS:</span>
              <div className="space-y-1.5">
                <button
                  onClick={() => setBatteryOptimizationMode('adaptive')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    batteryOptimizationMode === 'adaptive'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>Adaptativo Fused</span>
                  {batteryOptimizationMode === 'adaptive' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  onClick={() => setBatteryOptimizationMode('unoptimized')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    batteryOptimizationMode === 'unoptimized'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>GPS Bruto sin optimizar</span>
                  {batteryOptimizationMode === 'unoptimized' && <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />}
                </button>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 block">Pantalla del Celular:</span>
              <div className="space-y-1.5">
                <button
                  onClick={() => setScreenState('off')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    screenState === 'off'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>Apagada (2do Plano)</span>
                  {screenState === 'off' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
                <button
                  onClick={() => setScreenState('on')}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    screenState === 'on'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>Encendida Todo el Tiempo</span>
                  {screenState === 'on' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 block">Cargador 12V en Tablero:</span>
              <div className="space-y-1.5">
                <button
                  onClick={() => setInVehicleCharging(true)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    inVehicleCharging
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>Conectado al Vehículo</span>
                  {inVehicleCharging && <Zap className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  onClick={() => setInVehicleCharging(false)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    !inVehicleCharging
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>Solo Batería Interna</span>
                  {!inVehicleCharging && <Battery className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* 3 Adaptive Power States Diagram */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Las 3 Fases del Algoritmo Inteligente de Batería:
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  1. Detenido / Cliente
                </div>
                <p className="text-[11px] text-slate-400">
                  El acelerómetro detecta reposo. El GPS entra en <b>modo suspensión</b> (&lt;0.5%/h). Despierta solo cuando el vehículo se mueve más de 20 metros.
                </p>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold mb-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  2. Velocidad Crucero
                </div>
                <p className="text-[11px] text-slate-400">
                  Muestrea cada 10 a 15 segundos en línea recta. Ahorra 65% de batería manteniendo el cálculo de km y combustible perfecto.
                </p>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  3. Maniobra / Frenazo
                </div>
                <p className="text-[11px] text-slate-400">
                  Si el sensor IMU detecta giro cerrado o desaceleración &gt;0.3G, aumenta a 1 Hz instantáneamente para no perder la precisión del evento.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Battery Balance Card */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-5">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Balance Energético en Vivo
            </h3>

            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">Gasto del Foreground Service:</span>
                  <span className={`text-base font-black ${drainRate > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    -{drainRate.toFixed(1)}% / hora
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full ${drainRate > 10 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${Math.min(100, (drainRate / 20) * 100)}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {batteryOptimizationMode === 'adaptive' ? 'Optimizado con Fused Location y Activity Recognition' : 'Modo voraz sin optimización de sensores'}
                </span>
              </div>

              {inVehicleCharging && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400">Carga USB 12V Mechero:</span>
                    <span className="text-base font-black text-emerald-400">+{chargeRate.toFixed(1)}% / hora</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: '80%' }}></div>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Cargador estándar de 2.1 Amperios en tablero</span>
                </div>
              )}

              {/* Net Balance Result */}
              <div className={`p-4 rounded-xl border ${
                netBatteryDelta >= 0 
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300' 
                  : 'bg-amber-950/40 border-amber-800/80 text-amber-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block">Balance Neto Batería</span>
                    <span className="text-[11px] text-slate-400">
                      {inVehicleCharging ? 'Teléfono cargando mientras rastrea' : 'Autonomía restante estimada sin cargador'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-white">
                      {netBatteryDelta >= 0 ? `+${netBatteryDelta.toFixed(1)}%` : `${netBatteryDelta.toFixed(1)}%`}
                    </span>
                    <span className="text-[10px] block font-semibold text-emerald-400">
                      {inVehicleCharging ? 'Siempre al 100% de carga' : `~${(100 / drainRate).toFixed(0)} horas de autonomía`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <b>Conclusión técnica:</b> Con el cargador de 12V conectado en la camioneta, la batería nunca se descarga. Sin cargador, rinde más de 24 horas continuas de ruta.
            </span>
          </div>
        </div>
      </div>

      {/* Grid 3: Permissions, Auto-Boot and PIN Security Lock */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Permisos Android, Auto-Arranque (Boot) y Bloqueo con PIN</h2>
              <p className="text-xs text-slate-400">Mecanismos nativos para evitar manipulación o apagado por parte del chofer</p>
            </div>
          </div>
          <span className="bg-rose-950 text-rose-400 border border-rose-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
            Anti-Manipulación MDM
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Permissions */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <FileCheck className="w-4 h-4" />
              <span>1. Permisos Android Requeridos</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Android exige permisos explícitos para operar en 2do plano sin interrupción:
            </p>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <code className="text-cyan-300 text-[11px] font-mono">ACCESS_BACKGROUND_LOCATION</code>
                  <p className="text-[10px] text-slate-400 mt-0.5">Permite leer GPS con la pantalla apagada o en otra app.</p>
                </div>
              </li>
              <li className="flex items-start gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <code className="text-cyan-300 text-[11px] font-mono">FOREGROUND_SERVICE_LOCATION</code>
                  <p className="text-[10px] text-slate-400 mt-0.5">Obligatorio en Android 14+ con notificación fija de servicio.</p>
                </div>
              </li>
              <li className="flex items-start gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <code className="text-cyan-300 text-[11px] font-mono">REQUEST_IGNORE_BATTERY_OPTIMIZATIONS</code>
                  <p className="text-[10px] text-slate-400 mt-0.5">Evita que Android ponga la app en sueño profundo (Doze Mode).</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Card 2: Auto-Boot on Power-on */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Power className="w-4 h-4" />
              <span>2. Auto-Arranque al Prender el Celular</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              ¿Qué pasa si el chofer apaga o reinicia el teléfono?
            </p>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-xs font-bold text-white">BroadcastReceiver: BOOT_COMPLETED</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Apenas el sistema operativo Android termina de iniciar, el evento <code className="text-emerald-300">android.intent.action.BOOT_COMPLETED</code> dispara el Foreground Service inmediatamente.
              </p>
              <div className="bg-slate-950 p-2 rounded text-[10px] font-mono text-slate-400 border border-slate-800">
                El chofer NO necesita abrir la app manualmente. El rastreo inicia en silencio en el segundo 1.
              </div>
            </div>
          </div>

          {/* Card 3: PIN Protection & MDM */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <KeyRound className="w-4 h-4" />
              <span>3. Bloqueo con PIN de Supervisor</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Para evitar que el chofer desactive el servicio o desinstale la app:
            </p>
            <ul className="space-y-2 text-xs">
              <li className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-semibold block text-[11px]">PIN para Detener el Rastreo</span>
                  <p className="text-[10px] text-slate-400">El botón de "Pausar/Detener" solicita un PIN de 4 dígitos (ej: 2026).</p>
                </div>
              </li>
              <li className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-semibold block text-[11px]">Modo Kiosco / Android Enterprise</span>
                  <p className="text-[10px] text-slate-400">Bloquea el botón de apagar GPS, desinstalar app o poner Modo Avión.</p>
                </div>
              </li>
              <li className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white font-semibold block text-[11px]">Detección de GPS Falso</span>
                  <p className="text-[10px] text-slate-400">Alerta instantánea al portal si el chofer instala apps de Mock Location.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
