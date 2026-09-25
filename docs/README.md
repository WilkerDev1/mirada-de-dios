# Documentación Técnica — Mirada de Dios 🛰️🗺️

Bienvenido a la documentación técnica, arquitectónica y operativa del proyecto **Mirada de Dios** (Sistema de Gestión Territorial Geoespacial).

---

## 📚 Índice de Contenidos

| Documento | Descripción |
|---|---|
| [01. Arquitectura y Sistema](./01-arquitectura-y-sistema.md) | Visión global, stack tecnológico, principios fundamentales (Territory-first, Offline-first, Inmutabilidad), arquitectura multi-congregación y flujo de datos. |
| [02. Modelo de Datos y Persistencia](./02-modelo-de-datos-y-persistencia.md) | Entidades de dominio, esquemas IndexedDB (Dexie), cola de sincronización transaccional (`SyncQueue`), idempotencia y métricas de cobertura territorial. |
| [03. Motor Cartográfico y HUD Táctico](./03-motor-cartografico-y-hud.md) | Implementación de MapLibre GL JS, capas base (Google/OSM/God's Eye), proyección SVG/WebGL, herramientas de dibujo vectorial interactivas tipo AutoCAD, extrusión 3D y telemetría HUD. |
| [04. Componentes UI y Flujos de Usuario](./04-componentes-ui-y-flujos.md) | Arquitectura de componentes React, árbol territorial jerárquico con Drag & Drop, paneles laterales, bottom sheets adaptativos, gestión de unidades y registro de visitas. |
| [05. Guía de Compilación y Configuración de Entorno](./05-guia-compilacion-y-entorno.md) | Guía paso a paso para compilar y ejecutar tanto la aplicación Web (Vite) como la versión nativa Android (Capacitor + Gradle + JDK 21), solución a problemas de JDK y uso de emulador/dispositivo. |
| [06. Revisión de Organización y Mejoras](./06-revision-organizacion-y-mejoras.md) | Análisis crítico de la estructura actual del código y documentos, deuda técnica identificada y recomendaciones concretas de refactorización y escalabilidad. |

---

## ⚡ Inicio Rápido (Comandos Esenciales)

```bash
# 1. Instalar dependencias
npm install

# 2. Servidor de desarrollo Web (Hot-reload)
npm run dev

# 3. Compilación Web de Producción (Typecheck + Vite)
npm run build

# 4. Sincronizar assets hacia el contenedor Android
npm run cap:sync

# 5. Compilar APK de depuración Android (Usa JDK 21 configurado en gradle.properties)
npm run android:build:debug

# 6. Pipeline completo en un solo comando (Build Web + Sync + Build APK)
npm run android:build

# 7. Desplegar actualización Web a Vercel
npm run deploy
```

---

## 🌐 Versión Web en Vivo (Producción)

La versión web está desplegada y disponible públicamente en Vercel:
- **URL de Producción:** [https://territorymanager.vercel.app](https://territorymanager.vercel.app)
- **Repositorio Conectado:** [WilkerDev1/territorymanager](https://github.com/WilkerDev1/territorymanager)


## 🎯 Dataset Base Precargado
El sistema incluye datos semilla reales del Distrito Nacional de Santo Domingo, República Dominicana (`src/data/santoDomingoSeed.ts`):
- **SD-01**: Zona Colonial & Ciudad Nueva
- **SD-02**: Piantini & Ensanche Naco
- **SD-03**: Gazcue & Don Bosco
- **SD-04**: Bella Vista & Mirador Sur
