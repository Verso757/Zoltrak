# RutaControl Telematics - Paquete Hostinger

Archivos listos para copiar y pegar en `public_html/` de **`zoltrak.websolutionsgarcia.com`**.

## Archivos incluidos:
- `index.php`: Portal web completo con 3 pestañas:
  - **🗺️ 1. Mapa en Vivo (1Hz)**: Monitoreo con Leaflet y sondeo automático.
  - **📦 2. Subir & Gestionar APKs**: Formulario para arrastrar tu APK y cálculo automático de SHA-256.
  - **📲 3. Generador QR Enrolamiento**: Generador visual de QR para Android Enterprise / Device Owner Kiosk.
- `config/db.php`: Conexión MySQL preconfigurada con tus credenciales.
- `api/telemetry.php`: Receptor de GPS (POST) y consulta de flota (GET).
- `api/upload_apk.php`: Receptor de subida de archivos `.apk` y cálculo de hash SHA-256.
- `api/apks.php`: Control de versiones y distribución OTA de APKs.
- `schema.sql`: Script DDL para phpMyAdmin.
- `.htaccess`: Reglas de seguridad y CORS para Hostinger.
