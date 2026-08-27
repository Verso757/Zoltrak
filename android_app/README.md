# Guía Rápida para Generar el APK en Android Studio

El proyecto Android completo ya está creado en esta carpeta `/android_app`.

## 🚀 Pasos para compilar el APK en 1 Minuto:

1. **Abrir Android Studio**:
   - Selecciona **File > Open...** y elige la carpeta `android_app`.
2. **Generar APK**:
   - En la barra superior ve a: **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. **Obtener el archivo `.apk`**:
   - En segundos Android Studio te mostrará un aviso: *"APK(s) generated successfully: locate"*.
   - El archivo generado estará en:  
     `android_app/app/build/outputs/apk/debug/app-debug.apk` (o `app-release.apk`).
4. **Subir a tu Hostinger**:
   - Sube ese archivo `.apk` a tu Hostinger en: `public_html/apks/rutacontrol.apk`
   - Tu URL de descarga directa será: `https://zoltrak.websolutionsgarcia.com/apks/rutacontrol.apk`
5. **Listo para Enrolar**:
   - Abre la pestaña **4. Enrolamiento QR** en el portal web y escanea el código con tu celular.
