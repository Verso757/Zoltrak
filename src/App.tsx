import React, { useState, useEffect, useMemo } from 'react';
import { Driver, DriverAlert, FleetSummary, RouteStop } from './types';
import { INITIAL_DRIVERS, INITIAL_ALERTS } from './data/mockFleet';
import { Header, DashboardTab } from './components/Header';
import { LiveFleetView } from './components/LiveFleetView';
import { ApkManagerView } from './components/ApkManagerView';
import { QrEnrollmentView } from './components/QrEnrollmentView';
import { DevicesView } from './components/DevicesView';
import { SettingsView } from './components/SettingsView';
import { calculateInstantFuelRate } from './utils/telemetryMath';

export default function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('fleet');
  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DRIVERS);
  const [selectedDriverId, setSelectedDriverId] = useState<string>(INITIAL_DRIVERS[0].id);
  const [alerts, setAlerts] = useState<DriverAlert[]>(INITIAL_ALERTS);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [supervisorPin, setSupervisorPin] = useState<string>('2026');

  const selectedDriver = useMemo(() => {
    return drivers.find((d) => d.id === selectedDriverId) || drivers[0];
  }, [drivers, selectedDriverId]);

  // Compute fleet summary
  const summary: FleetSummary = useMemo(() => {
    const activeDriversCount = drivers.filter((d) => d.status !== 'fuera_servicio').length;
    const totalDistanceKm = drivers.reduce((sum, d) => sum + d.totalDistanceKm, 0);
    const totalFuelConsumedL = drivers.reduce((sum, d) => sum + d.estimatedFuelConsumedLiters, 0);
    const avgEcoScore = Math.round(drivers.reduce((sum, d) => sum + d.ecoScore, 0) / (drivers.length || 1));
    const allStops = drivers.flatMap((d) => d.stops);
    const totalStopsCompleted = allStops.filter((s) => s.status === 'completado').length;
    const totalSalesAmount = allStops
      .filter((s) => s.status === 'completado')
      .reduce((sum, s) => sum + s.orderValue, 0);

    return {
      activeDriversCount,
      totalDriversCount: drivers.length,
      totalDistanceKm,
      totalFuelConsumedL,
      avgEcoScore,
      totalStopsCompleted,
      totalStopsTarget: allStops.length,
      totalSalesAmount,
      activeAlertsCount: alerts.length,
    };
  }, [drivers, alerts]);

  // Telemetry real-time tick engine (every 2.5 seconds)
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setDrivers((prevDrivers) =>
        prevDrivers.map((driver) => {
          if (driver.status === 'fuera_servicio' || !driver.backgroundServiceActive) return driver;

          let newSpeed = driver.currentSpeedKmH;
          let newAccel = 0.02;
          let newLat = driver.currentLat;
          let newLng = driver.currentLng;
          let newExcessFuel = driver.excessFuelWastedLiters;

          if (driver.status === 'detenido_ralenti' || driver.status === 'en_cliente') {
            newSpeed = 0;
            newAccel = 0;
            newExcessFuel += 0.0006;
          } else {
            const delta = (Math.random() - 0.48) * 5;
            newSpeed = Math.max(15, Math.min(85, Math.round(driver.currentSpeedKmH + delta)));
            newAccel = Number(((newSpeed - driver.currentSpeedKmH) / 15).toFixed(2));

            const rad = (driver.headingDeg * Math.PI) / 180;
            const step = 0.00012 * (newSpeed / 50);
            newLat += Math.cos(rad) * step;
            newLng += Math.sin(rad) * step;
          }

          const fuelRate = calculateInstantFuelRate(
            newSpeed,
            newAccel,
            driver.nominalConsumptionLPer100Km,
            newSpeed === 0
          );

          const tickHours = 2.5 / 3600;
          const deltaFuel = (fuelRate.litersPerHour * tickHours);
          const newTotalFuel = driver.estimatedFuelConsumedLiters + deltaFuel;
          const deltaDistance = (newSpeed * tickHours);
          const newDistance = driver.totalDistanceKm + deltaDistance;

          return {
            ...driver,
            currentSpeedKmH: newSpeed,
            currentAccelG: newAccel,
            currentLat: newLat,
            currentLng: newLng,
            totalDistanceKm: Number(newDistance.toFixed(2)),
            estimatedFuelConsumedLiters: Number(newTotalFuel.toFixed(2)),
            excessFuelWastedLiters: Number(newExcessFuel.toFixed(2)),
          };
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const handleSelectDriver = (driver: Driver) => {
    setSelectedDriverId(driver.id);
  };

  const handleDismissAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const handleResetSimulation = () => {
    setDrivers(INITIAL_DRIVERS);
    setAlerts(INITIAL_ALERTS);
    setSelectedDriverId(INITIAL_DRIVERS[0].id);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      {/* Executive Clean Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        summary={summary}
        isSimulating={isSimulating}
        onToggleSimulation={() => setIsSimulating(!isSimulating)}
        onResetSimulation={handleResetSimulation}
      />

      {/* Main Clean Canvas */}
      <main className="flex-1">
        {activeTab === 'fleet' && (
          <LiveFleetView
            drivers={drivers}
            selectedDriver={selectedDriver}
            onSelectDriver={handleSelectDriver}
            alerts={alerts}
            onDismissAlert={handleDismissAlert}
          />
        )}

        {activeTab === 'apks' && (
          <ApkManagerView
            onNavigateToQr={() => setActiveTab('qr_enrollment')}
          />
        )}

        {activeTab === 'qr_enrollment' && (
          <QrEnrollmentView
            initialPin={supervisorPin}
          />
        )}

        {activeTab === 'devices' && (
          <DevicesView />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            supervisorPin={supervisorPin}
            onSavePin={(newPin) => setSupervisorPin(newPin)}
          />
        )}
      </main>

      {/* Minimalist Corporate Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 sm:px-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">RutaControl Telematics</span>
            <span>•</span>
            <span>Android Enterprise Device Owner</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-slate-600 font-medium">GPS 1 Hz Foreground Service</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-medium">PIN Supervisor: <b className="font-mono text-slate-900">{supervisorPin}</b></span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 font-semibold">● Servidor Telemetría Conectado</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
