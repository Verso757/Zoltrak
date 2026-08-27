# RutaControl Telematics - Hostinger Backend & Web Portal (PHP 8 + MySQL)

Este directorio contiene todo el paquete listo para desplegar en tu servidor Hostinger (`public_html/`) para el subdominio **`https://zoltrak.websolutionsgarcia.com/`**.

---

## 📁 Estructura del Paquete

```text
hostinger_deploy/
├── index.php                -> Portal Web / Dashboard con Mapa Leaflet en Vivo (1Hz) y métricas de flota
├── config/
│   └── db.php               -> Conexión PDO a MySQL (u752784733_zoltrak)
├── api/
│   ├── telemetry.php        -> Ingestión de telemetría GPS 1Hz (POST) y Feed para el Mapa (GET)
│   └── apks.php             -> Gestión de versiones y descargas OTA para APKs Kiosk
├── schema.sql               -> Script DDL completo con las 6 tablas y datos de prueba
└── .htaccess                -> Configuración de seguridad y encabezados CORS para Hostinger
