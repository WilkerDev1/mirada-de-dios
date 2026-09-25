# 05 · Guía de Compilación y Configuración del Entorno

Esta guía detalla los requisitos, configuración de dependencias y procedimientos para compilar y ejecutar tanto la versión Web como la versión nativa Android en este equipo.

---

## 1. Diagnóstico del Entorno Local

Este equipo cuenta con la siguiente configuración verificada:

| Herramienta / SDK | Ruta o Versión | Estado |
|---|---|---|
| **Sistema Operativo** | Linux 7.2.4-3-cachyos (Arch Linux amd64) | Listo |
| **Node.js** | v26.8.2 | Listo |
| **npm** | 12.0.2 | Listo |
| **Android SDK** | `/home/ishiro/Android/Sdk` | Listo (API 35 y 36 instaladas) |
| **Android Build Tools** | 35.0.0, 36.0.0, 36.1.0, 37.0.0 | Listo |
| **ADB (Platform Tools)**| `/home/ishiro/Android/Sdk/platform-tools/adb` | Listo |
| **Emulador AVD** | `Pixel_8` | Listo |
| **Gradle Wrapper** | 8.14.3 (`android/gradlew`) | Listo |
| **JDK para Gradle** | OpenJDK 21.0.11 (`/home/ishiro/.gradle/jdks/jetbrains_s_r_o_-21-amd64-linux.2`) | Configurado y verificado |

---

## 2. Configuración Crítica del JDK para Android

### ⚠️ Diagnóstico del Problema Original
La distribución de Linux del equipo tiene instalado Java 26 como runtime por defecto del sistema (`/usr/lib/jvm/java-26-openjdk`). Debido a que Java 26 es una versión experimental muy reciente, el Android Gradle Plugin (AGP) fallaba al ejecutar la tarea `JdkImageTransform` con `jlink` al procesar `core-for-system-modules.jar`:
```
Execution failed for JdkImageTransform: .../android-36/core-for-system-modules.jar
Error while executing process /usr/lib/jvm/java-26-openjdk/bin/jlink
```

### ✅ Solución Definitiva Implementada
Se configuró explícitamente en el archivo `android/gradle.properties` la directiva `org.gradle.java.home` apuntando a la instalación de **JDK 21 LTS** ubicada en la caché local de Gradle:

```properties
# android/gradle.properties
org.gradle.java.home=/home/ishiro/.gradle/jdks/jetbrains_s_r_o_-21-amd64-linux.2
```

Esta configuración aísla el proyecto para que **Gradle siempre utilice JDK 21 de forma transparente y determinista**, permitiendo que cualquier desarrollador compile el APK sin necesidad de alterar variables globales ni reconfigurar el gestor de versiones de Java del sistema operativo.

---

## 3. Flujo de Compilación y Comandos

Todos los flujos de compilación y prueba están configurados en `package.json`:

### 3.1 Desarrollo Web (Hot-Reload)
Para probar la aplicación en el navegador con recarga instantánea:
```bash
npm run dev
```
La aplicación estará disponible de inmediato en `http://localhost:5173`.

### 3.2 Compilación Web de Producción
Ejecuta la validación estricta de tipos de TypeScript y el empaquetado optimizado con Vite:
```bash
npm run build
```
Los artefactos compilados y minificados se generan en la carpeta `dist/`.

### 3.3 Sincronización con Android
Copia el contenido web de `dist/` a los assets nativos de Android y actualiza las declaraciones de los plugins de Capacitor:
```bash
npm run cap:sync
```

### 3.4 Compilación del APK de Android (Debug)
Compila el proyecto Android usando Gradle con el JDK 21 configurado:
```bash
npm run android:build:debug
```
El archivo APK generado se ubica en:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 3.5 Pipeline Completo en un Solo Comando
Para realizar todo el ciclo (Web Build ➔ Capacitor Sync ➔ Android Debug APK):
```bash
npm run android:build
```

---

## 4. Pruebas en Emulador o Dispositivo Físico

### 4.1 Iniciar el Emulador Android
Este equipo tiene configurado el emulador `Pixel_8`. Para iniciarlo desde la terminal en segundo plano:
```bash
$ANDROID_HOME/emulator/emulator -avd Pixel_8 &
```
*(Nota: `$ANDROID_HOME` está exportado en tu `~/.bashrc` como `/home/ishiro/Android/Sdk`).*

### 4.2 Desplegar e Instalar el APK
Una vez iniciado el emulador o conectado tu teléfono con Depuración USB habilitada:
```bash
# 1. Verificar que el dispositivo sea reconocido
adb devices

# 2. Instalar el APK directamente
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# 3. O usar el comando directo de Capacitor
npm run cap:run
```

### 4.3 Monitoreo de Registros en Tiempo Real
Para ver la salida de la consola de la aplicación (incluyendo logs de IndexedDB, MapLibre y eventos de visitas):
```bash
adb logcat | grep -E "Capacitor|MiradaDeDios|Chromium"
```

---

## 5. Solución de Problemas Frecuentes (Troubleshooting)

### Error: `jlink failed` o incompatibilidad de versión de Java
- **Causa:** Gradle intentó ejecutarse con Java 26 en lugar de Java 21.
- **Solución:** Verifica que `android/gradle.properties` contenga la línea:
  `org.gradle.java.home=/home/ishiro/.gradle/jdks/jetbrains_s_r_o_-21-amd64-linux.2`.

### Error: `sdk.dir not found`
- **Causa:** Archivo `android/local.properties` ausente o desconfigurado.
- **Solución:** Asegúrate de que `android/local.properties` contenga:
  `sdk.dir=/home/ishiro/Android/Sdk`.

### Los cambios en el código TypeScript/React no se ven en la app de Android
- **Causa:** No se ejecutó `npm run cap:sync` después de compilar el frontend.
- **Solución:** Usa siempre `npm run android:build`, el cual se asegura de compilar la app web con `npm run build` y sincronizarla con `cap sync` antes de generar el nuevo APK.
