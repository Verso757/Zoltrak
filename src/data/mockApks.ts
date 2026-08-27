import { ApkApp } from '../types';

export const INITIAL_APK_APPS: ApkApp[] = [
  {
    id: 'app-telematics',
    name: 'RutaControl Telematics (Core GPS)',
    packageName: 'com.rutacontrol.telematics',
    category: 'telematics_core',
    description: 'Servicio en 2do plano nativo con captura a 1 Hz, auto-arranque en Boot, protección PIN y cálculo de combustible.',
    iconType: 'telematics',
    isMandatoryKiosk: true,
    autoUpdateMode: 'immediate_silent',
    versions: [
      {
        id: 'ver-telematics-240',
        versionName: 'v2.4.0 (Estable Producción)',
        versionCode: 240,
        releaseDate: '2026-08-20',
        fileSizeBytes: 14200000, // 14.2 MB
        downloadUrl: 'https://cdn.rutacontrol.com/apk/telematics/rutacontrol-v2.4.0.apk',
        sha256Checksum: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        changelog: [
          'Soporte completo de Auto-Boot en Android 14 y 15',
          'Algoritmo adaptativo de consumo de batería (<2.7%/hora)',
          'Bloqueo de parada con PIN de Supervisor 2026',
          'Almacenamiento offline de hasta 15,000 puntos en SQLite'
        ],
        isCurrentProduction: true,
        minAndroidSdk: 26,
        targetAndroidSdk: 34
      },
      {
        id: 'ver-telematics-235',
        versionName: 'v2.3.5 (Legacy)',
        versionCode: 235,
        releaseDate: '2026-07-10',
        fileSizeBytes: 13800000, // 13.8 MB
        downloadUrl: 'https://cdn.rutacontrol.com/apk/telematics/rutacontrol-v2.3.5.apk',
        sha256Checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        changelog: [
          'Detección de fuerzas G con acelerómetro IMU',
          'Envío de telemetría por HTTP/2 con GZIP'
        ],
        isCurrentProduction: false,
        minAndroidSdk: 26,
        targetAndroidSdk: 33
      }
    ]
  },
  {
    id: 'app-sales',
    name: 'AutoVenta Mobile Pro (Ventas & Facturación)',
    packageName: 'com.empresa.ventas.movil',
    category: 'sales_billing',
    description: 'Toma de pedidos en punto de venta, catálogo de productos con fotos, control de inventario en camioneta e impresión térmica Bluetooth.',
    iconType: 'sales',
    isMandatoryKiosk: true,
    autoUpdateMode: 'immediate_silent',
    versions: [
      {
        id: 'ver-sales-312',
        versionName: 'v3.1.2 (Nueva Lista de Precios)',
        versionCode: 312,
        releaseDate: '2026-08-24',
        fileSizeBytes: 28500000, // 28.5 MB
        downloadUrl: 'https://cdn.rutacontrol.com/apk/ventas/autoventa-v3.1.2-prod.apk',
        sha256Checksum: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        changelog: [
          'Sincronización instantánea de lista de precios de Agosto',
          'Módulo de cobro con código QR bancario y billeteras digitales',
          'Soporte para impresoras térmicas ESC/POS inalámbricas',
          'Validación de geocerca en cliente antes de autorizar pedido'
        ],
        isCurrentProduction: true,
        minAndroidSdk: 26,
        targetAndroidSdk: 34
      },
      {
        id: 'ver-sales-308',
        versionName: 'v3.0.8 (Anterior)',
        versionCode: 308,
        releaseDate: '2026-06-15',
        fileSizeBytes: 26100000,
        downloadUrl: 'https://cdn.rutacontrol.com/apk/ventas/autoventa-v3.0.8.apk',
        sha256Checksum: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        changelog: [
          'Catálogo offline con caché local de imágenes',
          'Descuentos por volumen autorizados por supervisor'
        ],
        isCurrentProduction: false,
        minAndroidSdk: 26,
        targetAndroidSdk: 33
      }
    ]
  },
  {
    id: 'app-whatsapp',
    name: 'WhatsApp Business / Oficial',
    packageName: 'com.whatsapp',
    category: 'messaging',
    description: 'Comunicación oficial con clientes para confirmación de entrega y despacho de almacén.',
    iconType: 'whatsapp',
    isMandatoryKiosk: false,
    autoUpdateMode: 'on_wifi_only',
    versions: [
      {
        id: 'ver-wa-224',
        versionName: 'v2.24.16 (Oficial Play Store / APK)',
        versionCode: 22416,
        releaseDate: '2026-08-15',
        fileSizeBytes: 42300000, // 42.3 MB
        downloadUrl: 'https://cdn.rutacontrol.com/apk/whatsapp/whatsapp-v2.24.16.apk',
        sha256Checksum: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        changelog: [
          'Versión oficial certificada para enrolamiento corporativo'
        ],
        isCurrentProduction: true,
        minAndroidSdk: 24,
        targetAndroidSdk: 34
      }
    ]
  },
  {
    id: 'app-printer',
    name: 'Servicio Impresora Térmica (ESC/POS)',
    packageName: 'com.empresa.driver.printer',
    category: 'custom_fleet',
    description: 'Driver en segundo plano para enlazar automáticamente con la impresora portátil de boletas del camión.',
    iconType: 'custom',
    isMandatoryKiosk: false,
    autoUpdateMode: 'immediate_silent',
    versions: [
      {
        id: 'ver-printer-104',
        versionName: 'v1.0.4',
        versionCode: 104,
        releaseDate: '2026-07-02',
        fileSizeBytes: 4800000,
        downloadUrl: 'https://cdn.rutacontrol.com/apk/tools/printer-driver-v1.0.4.apk',
        sha256Checksum: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
        changelog: [
          'Auto-reconexión Bluetooth al encender el camión',
          'Soporte de corte de papel y caracteres latinos UTF-8'
        ],
        isCurrentProduction: true,
        minAndroidSdk: 26,
        targetAndroidSdk: 34
      }
    ]
  }
];
