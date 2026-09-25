# Mirada de Dios — Sistema de Gestión Territorial Geoespacial 🛰️🗺️

> **"Simple para el usuario. Estructurado para el sistema. Geográfico en su representación. Histórico en sus datos. Offline por diseño."**

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live%20Web%20App-black?logo=vercel)](https://miradadedios.vercel.app)
[![Android Build](https://img.shields.io/badge/Android-APK%20Ready-brightgreen?logo=android)](https://github.com/WilkerDev1/mirada-de-dios/releases)
[![MapLibre GL](https://img.shields.io/badge/Engine-MapLibre%20GL%20JS-blue?logo=webgl)](https://maplibre.org/)
[![Capacitor](https://img.shields.io/badge/Mobile-Capacitor%208-1199EE?logo=capacitor)](https://capacitorjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Mirada de Dios** es una plataforma de gestión territorial y cartográfica offline-first diseñada para el mapeo estructurado de territorios residenciales, edificios, apartamentos, visitas e historial inmutable de predicación. 

🌐 **Demo Web en Vivo:** [https://miradadedios.vercel.app](https://miradadedios.vercel.app)


Inspirada tácticamente en la consola de inteligencia geoespacial [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view) de Bilawal Sidhu y diseñada estrictamente bajo las especificaciones de arquitectura territorial v2.0 (`documentacion-de-aplicacion.md`).

---

## 📍 Territorio Base Inicial: Santo Domingo, República Dominicana

El sistema cuenta con datasets geoespaciales pre-cargados y optimizados para el Distrito Nacional de Santo Domingo:

1. **SD-01 · Zona Colonial & Ciudad Nueva**
   - Centro: `18.4740° N, 69.8860° W`
   - Hitos: Calle El Conde, Calle Las Damas, Parque Colón, Alcázar de Colón, Santa Bárbara, San Antón.
   - Edificios modelados con polígonos GeoJSON y apartamentos: Edificio El Conde Real, Residencial Las Damas, Condominio Arzobispo Meriño, Quinta San Antón, Torre Mirador del Ozama.
2. **SD-02 · Piantini & Ensanche Naco**
   - Centro: `18.4720° N, 69.9340° W`
   - Hitos: Av. Winston Churchill, Av. Abraham Lincoln, Torre Churchill Grand, Residencial Piantini Lux, Torre Naco Premier.
3. **SD-03 · Gazcue & Don Bosco**
   - Centro: `18.4680° N, 69.9030° W`
   - Hitos: Av. Bolívar, Condominio Simón Bolívar, Palacio Nacional, Independencia.
4. **SD-04 · Bella Vista & Mirador Sur**
   - Centro: `18.4480° N, 69.9460° W`
   - Hitos: Av. Sarasota, Av. Rómulo Betancourt, Torre Bella Vista Park.

---

## 🚀 Características Principales

### 1. Interfaz 100% Centrada en el Mapa
- El mapa ocupa el **100% del espacio visual**, con paneles flotantes semitransparentes (glassmorphism táctico).
- Motor de renderizado vectorial WebGL mediante **MapLibre GL JS**.
- Soporte para vista 2D y extrusión tridimensional (**3D Buildings**) de edificios según número de plantas.
- Modos de mapa base intercambiables:
  - **Calles (OSM Vectorial)**: Ligero y legible para trabajo de campo.
  - **Satelital (Esri World Imagery)**: Imágenes de satélite de alta resolución.
  - **Híbrido**: Satélite con nomenclatura y etiquetas viales.
  - **God's Eye Dark**: Modo táctico oscuro de alta concentración.

### 2. Modo Táctico "God's Eye" (HUD Telemetría)
Inspirado directamente en *gods-eye-view*:
- Telemetría en tiempo real: Latitud, Longitud, Zoom, Pitch (inclinación) y Rumbo (bearing).
- Retícula central de apuntamiento / reconocimiento táctico.
- Indicador de sector territorial activo (`DOM-SDQ-ZONE-01`) y estado de enlace satelital.

### 3. Modelo de Dominio y Gestión Territorial (Territory-First)
- **Congregación** (`Santo Domingo Central`) → **Territorio** → **Zona** → **Edificio** → **Apartamento** → **Visita**.
- **Panel de Árbol Territorial (Izquierda)**: Navegación jerárquica con badges de pendientes y botón de teletransporte suave (`flyTo`) con animación de cámara.
- **Panel de Detalle de Edificio (Derecha)**:
  - Resumen estructural (pisos, accesos: intercomunicador, portón, conserje, libre).
  - Alertas y restricciones activas (horarios específicos, intercomunicador dañado).
  - Cuadrícula de apartamentos con código de colores según estado de predicación:
    - 🟢 **Contactado** (`#22c55e`)
    - 🟠 **Sin respuesta** (`#f59e0b`)
    - 🔵 **Pendiente** (`#3b82f6`)
    - 🔴 **Problema de acceso** (`#ef4444`)
  - Registro inmediato de visitas con idempotencia (`operation_id`).
  - Historial inmutable de visitas.

### 4. Creación y Dibujo de Nuevos Edificios
- Herramienta integrada para registrar nuevos inmuebles mediante:
  - Posición central del visor del mapa.
  - Geolocalización GPS del dispositivo en tiempo real.
  - Generación automática de unidades/apartamentos según pisos y unidades por nivel.

### 5. Arquitectura Offline-First con IndexedDB (Dexie)
- Todos los datos, visitas y edificios se almacenan localmente en IndexedDB.
- Cola de sincronización (`SyncQueue`) que registra cada operación con UUID único.
- Barra inferior con métricas dinámicas de cobertura en tiempo real:
  - Cobertura física (%)
  - Intentados (%)
  - Contactados (%)
  - Pendientes (unidades restantes)

---

## 📱 Compilación para Android (Capacitor)

El proyecto utiliza **Capacitor 8** sobre Gradle 8.14 y JDK 21 para compilar una aplicación Android nativa de alto rendimiento con aceleración WebGL.

### Requisitos de Desarrollo
- Node.js >= 20
- JDK 17 o 21 (OpenJDK / Eclipse Temurin)
- Android SDK (API 34 o 36)

### Comandos de Construcción

```bash
# Instalar dependencias
npm install

# Construir aplicación web Vite
npm run build

# Sincronizar con el proyecto Android nativo
npx cap sync android

# Compilar APK Debug con Gradle
npm run android:build:debug

# O compilar todo el ciclo en un solo paso (Web + Sync + APK):
npm run android:build
```

El archivo APK resultante se genera en:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📚 Documentación Técnica Detallada

Para consultar la documentación modular completa por componentes y subsistemas, visita la carpeta [`docs/`](./docs/README.md):
- [01. Arquitectura y Sistema](./docs/01-arquitectura-y-sistema.md)
- [02. Modelo de Datos y Persistencia](./docs/02-modelo-de-datos-y-persistencia.md)
- [03. Motor Cartográfico y HUD Táctico](./docs/03-motor-cartografico-y-hud.md)
- [04. Componentes UI y Flujos](./docs/04-componentes-ui-y-flujos.md)
- [05. Guía de Compilación y Configuración](./docs/05-guia-compilacion-y-entorno.md)
- [06. Revisión de Organización y Recomendaciones](./docs/06-revision-organizacion-y-mejoras.md)


---

## 📄 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.
