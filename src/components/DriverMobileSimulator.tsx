import React, { useState, useEffect, useRef } from 'react';
import { Driver, RouteStop } from '../types';
import { 
  Smartphone, 
  Play, 
  Pause, 
  MapPin, 
  Fuel, 
  Gauge, 
  ShieldCheck, 
  Radio, 
  CheckCircle2, 
  Clock, 
  Battery, 
  Wifi, 
  Zap, 
  Layers, 
  AlertTriangle,
  LocateFixed,
  Lock,
  Unlock,
  KeyRound,
  Power,
  RotateCcw,
  ShieldAlert,
  Server
} from 'lucide-react';

interface DriverMobileSimulatorProps {
  driver: Driver;
  onUpdateDriverTelemetry: (updated: Partial<Driver>) => void;
  onAddAlert: (message: string, type: 'frenado_brusco' | 'exceso_velocidad' | 'ralenti_prolongado') => void;
  onUpdateStopStatus: (driverId: string, stopId: string, status: RouteStop['status'], notes?: string) => void;
}

export const DriverMobileSimulator: React.FC<DriverMobileSimulatorProps> = ({
  driver,
  onUpdateDriverTelemetry,
  onAddAlert,
  onUpdateStopStatus,
}) => {
  const [useRealDeviceGps, setUseRealDeviceGps] = useState(false);
  const [realGpsError, setRealGpsError] = useState<string | null>(null);
  const [throttleSpeed, setThrottleSpeed] = useState(driver.currentSpeedKmH);
  const [offlineBufferCount, setOfflineBufferCount] = useState(14);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Data and battery stats in simulator
  const [kbSentToday, setKbSentToday] = useState(18.4);
  const [packetsSentCount, setPacketsSentCount] = useState(245);
  const [isChargerPlugged, setIsChargerPlugged] = useState(true);

  // PIN & Security lock states
  const [isAppLockedByPin, setIsAppLockedByPin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinActionTarget, setPinActionTarget] = useState<'unlock_app' | 'stop_tracking_service' | 'settings'>('stop_tracking_service');
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [supervisorPin] = useState('2026'); // Default supervisor PIN

  // Boot Simulation State
  const [isRebootingPhone, setIsRebootingPhone] = useState(false);
  const [bootMessage, setBootMessage] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // Real device GPS hook using navigator.geolocation
  useEffect(() => {
    if (useRealDeviceGps && 'geolocation' in navigator) {
      setRealGpsError(null);
      try {
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            const speedKmh = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : throttleSpeed;
            onUpdateDriverTelemetry({
              currentLat: pos.coords.latitude,
              currentLng: pos.coords.longitude,
              currentSpeedKmH: speedKmh,
              gpsSignal: 'excelente',
            });
            setKbSentToday((prev) => Number((prev + 0.08).toFixed(2)));
            setPacketsSentCount((prev) => prev + 1);
          },
          (err) => {
            setRealGpsError(`Permiso o error GPS: ${err.message}`);
            setUseRealDeviceGps(false);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 10000,
          }
        );
        watchIdRef.current = id;
      } catch (e) {
        setRealGpsError('Error al iniciar GPS del navegador');
        setUseRealDeviceGps(false);
      }
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [useRealDeviceGps]);

  const handleApplyBrake = () => {
    onUpdateDriverTelemetry({
      currentSpeedKmH: Math.max(0, throttleSpeed - 35),
      currentAccelG: -0.46,
      suddenBrakingCount: driver.suddenBrakingCount + 1,
      ecoScore: Math.max(40, driver.ecoScore - 6),
    });
    setThrottleSpeed((prev) => Math.max(0, prev - 35));
    onAddAlert('Frenada de emergencia (-0.46G) detectada en acelerómetro del chofer', 'frenado_brusco');
  };

  const handleApplySpeeding = () => {
    const highSpeed = 78;
    setThrottleSpeed(highSpeed);
    onUpdateDriverTelemetry({
      currentSpeedKmH: highSpeed,
      currentAccelG: 0.22,
      status: 'exceso_velocidad',
      speedingEventsCount: driver.speedingEventsCount + 1,
      ecoScore: Math.max(30, driver.ecoScore - 8),
    });
    onAddAlert(`Exceso de velocidad: ${highSpeed} km/h en zona urbana`, 'exceso_velocidad');
  };

  const handleApplyIdle = () => {
    setThrottleSpeed(0);
    onUpdateDriverTelemetry({
      currentSpeedKmH: 0,
      currentAccelG: 0,
      status: 'detenido_ralenti',
      idleTimeMinutes: driver.idleTimeMinutes + 5,
      excessFuelWastedLiters: driver.excessFuelWastedLiters + 0.12,
    });
    onAddAlert('Motor en marcha sin avance (>10 min en ralentí)', 'ralenti_prolongado');
  };

  const handleSyncOfflineData = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setOfflineBufferCount(0);
      setIsSyncing(false);
    }, 1200);
  };

  // PIN security actions
  const promptPinAction = (action: 'unlock_app' | 'stop_tracking_service' | 'settings') => {
    setPinActionTarget(action);
    setEnteredPin('');
    setPinError(null);
    setShowPinModal(true);
  };

  const handlePinSubmit = () => {
    if (enteredPin === supervisorPin) {
      setShowPinModal(false);
      setPinError(null);
      if (pinActionTarget === 'unlock_app') {
        setIsAppLockedByPin(false);
      } else if (pinActionTarget === 'stop_tracking_service') {
        onUpdateDriverTelemetry({ backgroundServiceActive: !driver.backgroundServiceActive });
      }
    } else {
      setPinError('PIN incorrecto. Solo el supervisor autorizado puede modificar esta acción.');
    }
  };

  // Simulate Device Power Reboot -> BOOT_COMPLETED auto start
  const handleSimulateDeviceReboot = () => {
    setIsRebootingPhone(true);
    setBootMessage('Apagando y reiniciando sistema operativo Android...');
    onUpdateDriverTelemetry({ backgroundServiceActive: false });

    setTimeout(() => {
      setBootMessage('Sistema encendido. Recibiendo broadcast "android.intent.action.BOOT_COMPLETED"...');
    }, 1200);

    setTimeout(() => {
      onUpdateDriverTelemetry({ backgroundServiceActive: true });
      setIsRebootingPhone(false);
      setBootMessage('✓ Foreground Service de telemetría auto-iniciado en segundo plano sin tocar la pantalla.');
      setTimeout(() => setBootMessage(null), 4000);
    }, 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg">
              <Smartphone className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white">
              App Móvil del Chofer con Seguridad Anti-Manipulación
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Simulador del teléfono del conductor: ejecuta el <b>Foreground Service en 2do plano</b>, cuenta con <b>auto-arranque al encender el equipo (Boot)</b> y exige <b>PIN de Supervisor</b> para detener el rastreo.
          </p>
        </div>

        {/* Action buttons on top */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setUseRealDeviceGps(!useRealDeviceGps)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              useRealDeviceGps
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <LocateFixed className="w-4 h-4 text-cyan-400" />
            <span>{useRealDeviceGps ? 'GPS REAL DEL NAVEGADOR ON' : 'USAR GPS REAL DE ESTE EQUIPO'}</span>
          </button>

          <button
            onClick={handleSimulateDeviceReboot}
            disabled={isRebootingPhone}
            className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-2 transition-all"
          >
            <Power className={`w-4 h-4 text-emerald-400 ${isRebootingPhone ? 'animate-spin' : ''}`} />
            <span>SIMULAR REINICIO DE CELULAR (BOOT)</span>
          </button>
        </div>
      </div>

      {bootMessage && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{bootMessage}</span>
        </div>
      )}

      {realGpsError && (
        <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{realGpsError}</span>
        </div>
      )}

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Smartphone Frame (5 cols) */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-[340px] bg-slate-950 rounded-[44px] p-3.5 border-[6px] border-slate-800 shadow-2xl shadow-cyan-950/20 relative">
            {/* Top Speaker / Camera */}
            <div className="flex justify-center mb-2.5">
              <div className="w-24 h-4 bg-slate-900 rounded-full flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                <div className="w-10 h-1 bg-slate-800 rounded-full"></div>
              </div>
            </div>

            {/* Android Status Bar */}
            <div className="flex items-center justify-between px-3 py-1 text-[10px] text-slate-400 font-mono">
              <span>09:42</span>
              <div className="flex items-center gap-2">
                {driver.backgroundServiceActive && <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />}
                <Wifi className="w-3 h-3 text-slate-300" />
                <div className="flex items-center gap-0.5">
                  <Battery className="w-3 h-3 text-emerald-400" />
                  <span>{driver.batteryLevel}%</span>
                </div>
              </div>
            </div>

            {/* Foreground Service Permanent Notification */}
            <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-2.5 my-2 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold">
                    RC
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white flex items-center gap-1">
                      <span>RutaControl Background Service</span>
                      {driver.backgroundServiceActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-400">
                      {driver.backgroundServiceActive 
                        ? `GPS Activo • ${driver.nominalConsumptionLPer100Km} L/100km • ${driver.routeCode}` 
                        : 'Servicio en Pausa (Requiere PIN Supervisor)'}
                    </div>
                  </div>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                  driver.backgroundServiceActive ? 'bg-slate-800 text-cyan-300' : 'bg-rose-950 text-rose-300'
                }`}>
                  {driver.backgroundServiceActive ? '2do Plano OK' : 'Detenido'}
                </span>
              </div>
            </div>

            {/* Phone Screen Content */}
            <div className="bg-slate-900/90 rounded-2xl p-3 space-y-3 border border-slate-800 relative overflow-hidden min-h-[440px]">
              {/* If phone is rebooting */}
              {isRebootingPhone ? (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-30 space-y-3">
                  <RotateCcw className="w-8 h-8 text-cyan-400 animate-spin" />
                  <span className="text-xs font-bold text-white">Reiniciando Android...</span>
                  <span className="text-[10px] text-slate-400">Simulando evento BOOT_COMPLETED nativo</span>
                </div>
              ) : isAppLockedByPin ? (
                /* App Locked Screen */
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">App Bloqueada por Seguridad</h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                      El chofer no puede cerrar ni alterar la configuración sin el PIN de supervisor.
                    </p>
                  </div>
                  <button
                    onClick={() => promptPinAction('unlock_app')}
                    className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-950"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Ingresar PIN de Supervisor
                  </button>
                  <div className="text-[10px] text-slate-500 font-mono">
                    El servicio sigue rastreando en 2do plano
                  </div>
                </div>
              ) : (
                /* Normal App Active Screen */
                <>
                  {/* Driver Profile */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={driver.avatar}
                        alt={driver.name}
                        className="w-8 h-8 rounded-full object-cover border border-cyan-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-100">{driver.name}</div>
                        <div className="text-[10px] text-slate-400">{driver.routeName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">Score Eco</div>
                      <div className={`text-xs font-black ${driver.ecoScore > 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {driver.ecoScore}/100
                      </div>
                    </div>
                  </div>

                  {/* Speed and Fuel Gauges */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Velocidad Actual</span>
                      <span className="text-xl font-black font-mono text-cyan-400">{driver.currentSpeedKmH}</span>
                      <span className="text-[9px] text-slate-400 ml-1">km/h</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block uppercase">Combustible Ruta</span>
                      <span className="text-xl font-black font-mono text-amber-400">
                        {driver.estimatedFuelConsumedLiters.toFixed(1)}
                      </span>
                      <span className="text-[9px] text-slate-400 ml-1">Litros</span>
                    </div>
                  </div>

                  {/* Route Progress / Stops */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Paradas del Día
                      </span>
                      <span className="text-slate-400 font-mono">
                        {driver.stops.filter((s) => s.status === 'completado').length} de {driver.stops.length} listas
                      </span>
                    </div>

                    {driver.stops.map((stop) => {
                      if (stop.status !== 'completado') {
                        return (
                          <div key={stop.id} className="space-y-1.5">
                            <div className="text-xs font-bold text-slate-100">{stop.clientName}</div>
                            <div className="text-[10px] text-slate-400 line-clamp-1">{stop.address}</div>
                            <div className="flex items-center justify-between text-[10px] bg-slate-900 p-1.5 rounded">
                              <span className="text-slate-400">Hora estimada:</span>
                              <span className="font-bold text-cyan-400">{stop.scheduledTime}</span>
                            </div>
                            <button
                              onClick={() => onUpdateStopStatus(driver.id, stop.id, 'completado', 'Llegada y descarga completada')}
                              className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Registrar Parada Completada
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })[0] || (
                      <div className="text-center py-2.5 text-xs text-emerald-400 font-bold">
                        🎉 Todas las paradas completadas
                      </div>
                    )}
                  </div>

                  {/* Real-time Data & Battery Counters */}
                  <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5 text-[10px]">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-cyan-400" />
                        Datos Transmitidos Hoy:
                      </span>
                      <span className="font-mono font-bold text-white">{kbSentToday} KB ({packetsSentCount} pings)</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="flex items-center gap-1">
                        <Battery className="w-3 h-3 text-emerald-400" />
                        Drenado Batería:
                      </span>
                      <span className="font-mono font-bold text-emerald-400">~2.7% / h (Pantalla Off)</span>
                    </div>
                  </div>

                  {/* Service Toggle Protected with PIN */}
                  <div className="pt-1">
                    <button
                      onClick={() => promptPinAction('stop_tracking_service')}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                        driver.backgroundServiceActive
                          ? 'bg-rose-950/40 border-rose-800/80 text-rose-300 hover:bg-rose-900/60'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>
                        {driver.backgroundServiceActive 
                          ? 'Detener Rastreo (Requiere PIN)' 
                          : 'Reanudar Rastreo en 2do Plano'}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Home Indicator */}
            <div className="flex justify-center mt-3">
              <div className="w-28 h-1 bg-slate-700 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Telemetry Sensor Control & Security Demo Console (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Security PIN Demonstration Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Protección con PIN de Supervisor</h3>
                  <p className="text-[11px] text-slate-400">Impide que los choferes apaguen o manipulen el servicio</p>
                </div>
              </div>
              <span className="text-[10px] bg-slate-950 text-cyan-400 border border-slate-800 px-2 py-1 rounded font-mono">
                PIN Maestro: 2026
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setIsAppLockedByPin(!isAppLockedByPin)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isAppLockedByPin
                    ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">Bloquear Pantalla de la App</span>
                  {isAppLockedByPin ? <Lock className="w-4 h-4 text-rose-400" /> : <Unlock className="w-4 h-4 text-slate-400" />}
                </div>
                <p className="text-[11px] text-slate-400">
                  {isAppLockedByPin ? 'App en modo Kiosco protegido' : 'Haz clic para simular bloqueo total'}
                </p>
              </button>

              <button
                onClick={() => promptPinAction('stop_tracking_service')}
                className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-left transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">Probar Apagado con PIN</span>
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-[11px] text-slate-400">
                  Verifica cómo la app solicita la clave antes de permitir cualquier cambio
                </p>
              </button>
            </div>
          </div>

          {/* Driving Controls Simulator */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Simulador de Sensores Móviles & Conducción
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Prueba cómo el acelerómetro y GPS del celular calculan combustible y detectan excesos o frenazos.
              </p>
            </div>

            {/* Throttle slider */}
            <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">Acelerador / Velocidad Simulada:</span>
                <span className="font-mono text-cyan-400 font-bold text-sm">{throttleSpeed} km/h</span>
              </div>
              <input
                id="throttle-slider"
                type="range"
                min="0"
                max="100"
                value={throttleSpeed}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setThrottleSpeed(val);
                  onUpdateDriverTelemetry({
                    currentSpeedKmH: val,
                    currentAccelG: val > 60 ? 0.15 : 0.04,
                    status: val > 70 ? 'exceso_velocidad' : val === 0 ? 'detenido_ralenti' : 'en_ruta',
                  });
                  setKbSentToday((prev) => Number((prev + 0.08).toFixed(2)));
                }}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 km/h (Ralentí)</span>
                <span>40 km/h (Ciudad)</span>
                <span>60 km/h (Límite)</span>
                <span>100 km/h (Carretera)</span>
              </div>
            </div>

            {/* Trigger Driving Events Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                id="btn-brake-test"
                onClick={handleApplyBrake}
                className="p-3 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-rose-300">Frenazo Brusco</span>
                  <AlertTriangle className="w-4 h-4 text-rose-400 group-hover:animate-bounce" />
                </div>
                <div className="text-[10px] text-rose-200/80">
                  Desacelera a -0.46G y penaliza score eco.
                </div>
              </button>

              <button
                id="btn-speeding-test"
                onClick={handleApplySpeeding}
                className="p-3 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/80 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-300">Exceso Velocidad</span>
                  <Gauge className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
                </div>
                <div className="text-[10px] text-amber-200/80">
                  Sube a 78 km/h y dispara alerta al portal.
                </div>
              </button>

              <button
                id="btn-idle-test"
                onClick={handleApplyIdle}
                className="p-3 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/80 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-cyan-300">Ralentí Prolongado</span>
                  <Clock className="w-4 h-4 text-cyan-400 group-hover:animate-spin" />
                </div>
                <div className="text-[10px] text-cyan-200/80">
                  Calcula desperdicio de combustible detenido.
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Supervisor PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl animate-scaleUp">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white">Autorización de Supervisor</h3>
              <p className="text-xs text-slate-400">
                {pinActionTarget === 'unlock_app' 
                  ? 'Ingrese el PIN para desbloquear la aplicación'
                  : 'Ingrese el PIN para modificar el estado del rastreo'}
              </p>
            </div>

            {/* PIN Input Display */}
            <div className="space-y-2">
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-xl font-mono font-bold transition-all ${
                      enteredPin.length > i
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                        : 'border-slate-800 bg-slate-950 text-slate-600'
                    }`}
                  >
                    {enteredPin.length > i ? '•' : ''}
                  </div>
                ))}
              </div>

              {pinError && (
                <div className="text-center text-rose-400 text-xs font-semibold pt-1">
                  {pinError}
                </div>
              )}
            </div>

            {/* Numerical Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'C') {
                      setEnteredPin('');
                      setPinError(null);
                    } else if (key === 'OK') {
                      handlePinSubmit();
                    } else {
                      if (enteredPin.length < 4) {
                        const newPin = enteredPin + key;
                        setEnteredPin(newPin);
                        setPinError(null);
                        if (newPin.length === 4 && newPin === supervisorPin) {
                          setTimeout(() => {
                            setShowPinModal(false);
                            if (pinActionTarget === 'unlock_app') setIsAppLockedByPin(false);
                            else onUpdateDriverTelemetry({ backgroundServiceActive: !driver.backgroundServiceActive });
                          }, 200);
                        }
                      }
                    }
                  }}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${
                    key === 'OK'
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black'
                      : key === 'C'
                      ? 'bg-slate-800 text-rose-400 hover:bg-slate-700'
                      : 'bg-slate-950 text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-3">
              <span>PIN Demo: <b className="text-cyan-400">2026</b></span>
              <button
                onClick={() => setShowPinModal(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
