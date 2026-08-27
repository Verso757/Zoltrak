import React, { useState } from 'react';
import { FleetDevice } from '../types';
import { 
  Smartphone, 
  Battery, 
  Zap, 
  Radio, 
  Lock, 
  ShieldCheck, 
  RefreshCw, 
  Search, 
  Wifi, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowUpRight
} from 'lucide-react';

export const INITIAL_DEVICES: FleetDevice[] = [
  {
    id: 'dev-001',
    driverId: 'drv-1',
    driverName: 'Carlos Mendoza',
    vehiclePlate: 'NZY-8492',
    deviceModel: 'Samsung Galaxy A15 Enterprise',
    imei: '864209048192837',
    androidVersion: 'Android 14 (OneUI 6.0)',
    batteryLevel: 84,
    isCharging: true,
    gpsStatus: 'online_1hz',
    installedAppVersion: 'v2.4.1',
    isKioskActive: true,
    lastPingTime: 'Hace 3 segundos',
    dataUsageMbThisMonth: 18.4
  },
  {
    id: 'dev-002',
    driverId: 'drv-2',
    driverName: 'Alejandro Rivera',
    vehiclePlate: 'KLD-1934',
    deviceModel: 'Motorola Moto G24 Power',
    imei: '869102938475610',
    androidVersion: 'Android 14 (MyUX)',
    batteryLevel: 62,
    isCharging: false,
    gpsStatus: 'online_1hz',
    installedAppVersion: 'v2.4.1',
    isKioskActive: true,
    lastPingTime: 'Hace 8 segundos',
    dataUsageMbThisMonth: 22.1
  },
  {
    id: 'dev-003',
    driverId: 'drv-3',
    driverName: 'Roberto Garza',
    vehiclePlate: 'PXR-7721',
    deviceModel: 'Xiaomi Redmi 13C Rugged',
    imei: '862910394857281',
    androidVersion: 'Android 13 (HyperOS)',
    batteryLevel: 95,
    isCharging: true,
    gpsStatus: 'online_1hz',
    installedAppVersion: 'v2.4.0', // Update available
    isKioskActive: true,
    lastPingTime: 'Hace 2 segundos',
    dataUsageMbThisMonth: 15.8
  },
  {
    id: 'dev-004',
    driverId: 'drv-4',
    driverName: 'Eduardo Morales',
    vehiclePlate: 'TMB-5509',
    deviceModel: 'Samsung Galaxy A14 LTE',
    imei: '865910293847562',
    androidVersion: 'Android 13',
    batteryLevel: 41,
    isCharging: false,
    gpsStatus: 'online_1hz',
    installedAppVersion: 'v2.4.1',
    isKioskActive: true,
    lastPingTime: 'Hace 12 segundos',
    dataUsageMbThisMonth: 19.3
  }
];

export const DevicesView: React.FC = () => {
  const [devices, setDevices] = useState<FleetDevice[]>(INITIAL_DEVICES);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<FleetDevice | null>(null);

  const filteredDevices = devices.filter(d => 
    d.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.deviceModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.imei.includes(searchTerm)
  );

  const handleTriggerSilentUpdate = (deviceId: string) => {
    setDevices(prev => prev.map(d => {
      if (d.id !== deviceId) return d;
      return {
        ...d,
        installedAppVersion: 'v2.4.1 (Actualizando...)'
      };
    }));

    setTimeout(() => {
      setDevices(prev => prev.map(d => {
        if (d.id !== deviceId) return d;
        return {
          ...d,
          installedAppVersion: 'v2.4.1'
        };
      }));
    }, 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Inventario de Terminales Móviles</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoreo del estado físico y lógico de los celulares de la flota: nivel de batería, versión de Android, consumo de datos y versión de APK instalada.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por chofer, modelo o IMEI..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-800 w-64"
            />
          </div>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Terminales Registradas</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{devices.length}</div>
          <span className="text-[11px] text-emerald-600 font-medium">100% en línea</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Batería Promedio</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {Math.round(devices.reduce((acc, d) => acc + d.batteryLevel, 0) / devices.length)}%
          </div>
          <span className="text-[11px] text-slate-500">2 conectadas a 12V</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Consumo Datos Promedio</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {(devices.reduce((acc, d) => acc + d.dataUsageMbThisMonth, 0) / devices.length).toFixed(1)} MB
          </div>
          <span className="text-[11px] text-slate-500">Mes corriente (&lt; 25 MB/mes)</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Modo Kiosco / PIN</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {devices.filter(d => d.isKioskActive).length}/{devices.length}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Bloqueo activo</span>
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900">Listado de Teléfonos Activos</h3>
          <span className="text-xs text-slate-500">{filteredDevices.length} unidades</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Dispositivo & Modelo</th>
                <th className="px-4 py-3">Chofer & Placa</th>
                <th className="px-4 py-3">Batería</th>
                <th className="px-4 py-3">GPS & Telemetría</th>
                <th className="px-4 py-3">Versión APK</th>
                <th className="px-4 py-3">Datos Celulares</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDevices.map((device) => {
                const isUpdatePending = device.installedAppVersion !== 'v2.4.1';

                return (
                  <tr key={device.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{device.deviceModel}</span>
                          <span className="text-[11px] text-slate-500 font-mono">IMEI: {device.imei}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-900 block">{device.driverName}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{device.vehiclePlate}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Battery className={`w-4 h-4 ${device.batteryLevel > 50 ? 'text-emerald-600' : 'text-amber-600'}`} />
                        <span className="font-mono font-bold text-slate-800">{device.batteryLevel}%</span>
                        {device.isCharging && (
                          <span className="text-[10px] text-emerald-600 font-semibold">(Cargando 12V)</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-semibold text-slate-800">1 Hz Continuo</span>
                      </div>
                      <span className="text-[11px] text-slate-400 block">{device.lastPingTime}</span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {device.installedAppVersion}
                        </span>
                        {isUpdatePending && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold">
                            v2.4.1 disp.
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-mono font-medium text-slate-800">{device.dataUsageMbThisMonth} MB</span>
                      <span className="text-[10px] text-slate-400 block">de 500 MB plan</span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      {isUpdatePending ? (
                        <button
                          onClick={() => handleTriggerSilentUpdate(device.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
                        >
                          Actualizar Silencioso
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Al día
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
