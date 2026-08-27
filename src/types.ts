export type DriverStatus = 'en_ruta' | 'en_cliente' | 'detenido_ralenti' | 'fuera_servicio' | 'exceso_velocidad';

export interface RouteStop {
  id: string;
  clientName: string;
  businessName: string;
  address: string;
  lat: number;
  lng: number;
  scheduledTime: string;
  status: 'pendiente' | 'en_atencion' | 'completado' | 'no_entregado';
  orderValue: number;
  arrivalTime?: string;
  departureTime?: string;
  durationMinutes?: number;
  notes?: string;
  paymentType?: 'Efectivo' | 'Transferencia' | 'Crédito';
}

export interface TelemetryPoint {
  lat: number;
  lng: number;
  speedKmH: number;
  timestamp: number;
  accelG: number; // Positive = acceleration, Negative = braking
  fuelInstantRateLPer100Km: number;
  isIdling: boolean;
}

export interface DriverAlert {
  id: string;
  driverId: string;
  driverName: string;
  routeCode: string;
  type: 'frenado_brusco' | 'exceso_velocidad' | 'ralenti_prolongado' | 'desvio_ruta' | 'parada_no_autorizada';
  message: string;
  severity: 'baja' | 'media' | 'alta' | 'critica';
  timestamp: string;
  speed?: number;
  durationSec?: number;
  location?: string;
  lat?: number;
  lng?: number;
}

export interface Driver {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  deviceModel: string;
  androidVersion: string;
  batteryLevel: number;
  isCharging: boolean;
  backgroundServiceActive: boolean;
  gpsSignal: 'excelente' | 'buena' | 'debil' | 'sin_senal';
  routeCode: string;
  routeName: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleType: 'camioneta_1ton' | 'furgon_diesel' | 'camion_3ton' | 'moto_preventa';
  nominalConsumptionLPer100Km: number; // e.g. 9.5 L/100km
  fuelType: 'Gasolina' | 'Diésel';
  
  // Current live status
  status: DriverStatus;
  currentLat: number;
  currentLng: number;
  currentSpeedKmH: number;
  currentAccelG: number;
  headingDeg: number;
  
  // Daily metrics
  totalDistanceKm: number;
  totalTimeMinutes: number;
  idleTimeMinutes: number;
  estimatedFuelConsumedLiters: number;
  excessFuelWastedLiters: number;
  ecoScore: number; // 0 to 100
  suddenBrakingCount: number;
  suddenAccelCount: number;
  speedingEventsCount: number;
  
  // Route Sales Progress
  stops: RouteStop[];
  totalSalesAmount: number;
  collectedAmount: number;
  
  // Telemetry trail for maps
  trail: TelemetryPoint[];
}

export interface FleetSummary {
  activeDriversCount: number;
  totalDriversCount: number;
  totalDistanceKm: number;
  totalFuelConsumedL: number;
  avgEcoScore: number;
  totalStopsCompleted: number;
  totalStopsTarget: number;
  totalSalesAmount: number;
  activeAlertsCount: number;
}

export interface ApkVersion {
  id: string;
  versionName: string; // e.g. "v2.4.1"
  versionCode: number; // e.g. 241
  releaseDate: string;
  fileSizeBytes: number; // e.g. 15400000 (14.7 MB)
  downloadUrl: string;
  sha256Checksum: string;
  changelog: string[];
  isCurrentProduction: boolean;
  minAndroidSdk: number; // e.g. 26 (Android 8.0)
  targetAndroidSdk: number; // e.g. 34 (Android 14)
}

export interface ApkApp {
  id: string;
  name: string; // e.g. "RutaControl Telematics"
  packageName: string; // e.g. "com.rutacontrol.telematics"
  category: 'telematics_core' | 'sales_billing' | 'messaging' | 'custom_fleet';
  description: string;
  iconType: 'telematics' | 'sales' | 'whatsapp' | 'custom';
  isMandatoryKiosk: boolean;
  autoUpdateMode: 'immediate_silent' | 'prompt_driver' | 'on_wifi_only';
  versions: ApkVersion[];
}

export interface FleetDevice {
  id: string;
  driverId: string;
  driverName: string;
  vehiclePlate: string;
  deviceModel: string;
  imei: string;
  androidVersion: string;
  batteryLevel: number;
  isCharging: boolean;
  gpsStatus: 'online_1hz' | 'online_battery_save' | 'offline';
  installedAppVersion: string;
  isKioskActive: boolean;
  lastPingTime: string;
  dataUsageMbThisMonth: number;
}

export interface SystemSettings {
  supervisorPin: string;
  telemetryIntervalSec: number;
  speedLimitKmH: number;
  maxIdleMinutesAllowed: number;
  requireWifiForApkUpdates: boolean;
}
