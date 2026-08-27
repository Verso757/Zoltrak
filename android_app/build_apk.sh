#!/bin/bash
# Script de compilación e inicialización del entorno Android Gradle
set -e

# Descargar wrapper de Gradle si no existe gradlew
if [ ! -f "gradlew" ]; then
    echo "Instalando Gradle Wrapper 8.4..."
    gradle wrapper --gradle-version 8.4 --distribution-type bin
    chmod +x gradlew
fi

echo "Compilando APK Debug..."
./gradlew assembleDebug --no-daemon --stacktrace
