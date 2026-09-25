# 06 · Revisión de Organización y Recomendaciones de Mejora

Este documento presenta una auditoría técnica sobre la organización del código fuente, la estructura documental del repositorio y recomendaciones concretas para optimizar la mantenibilidad, escalabilidad y robustez del proyecto.

---

## 1. Evaluación de la Organización Documental

### Diagnóstico Previo
- El repositorio contaba en la raíz con el archivo `documentacion-de-aplicacion.md` (41 KB, 812 líneas) y `README.md`.
- Aunque `documentacion-de-aplicacion.md` constituye una especificación conceptual sólida y rigurosa de la arquitectura v2.0, su formato monolítico dificultaba la consulta ágil de aspectos específicos durante las fases de desarrollo activo (ej. resolver problemas de compilación, consultar endpoints de bases de datos o entender la lógica del motor cartográfico).

### Estructura Implementada en `docs/`
Se organizó la documentación técnica en módulos especializados de fácil navegación:

```
docs/
├── README.md                           # Índice general y comandos esenciales
├── 01-arquitectura-y-sistema.md        # Visión global, stack y principios
├── 02-modelo-de-datos-y-persistencia.md# Tipos TypeScript, Dexie, SyncQueue y métricas
├── 03-motor-cartografico-y-hud.md      # MapLibre GL, capas, dibujo AutoCAD y 3D
├── 04-componentes-ui-y-flujos.md       # Catálogo de componentes y flujos de usuario
├── 05-guia-compilacion-y-entorno.md    # Guía práctica de compilación Web y APK
└── 06-revision-organizacion-y-mejoras.md# Análisis crítico y plan de evolución
```

---

## 2. Evaluación de la Organización del Código (`src/`)

### Fortalezas Detectadas
1. **Modelado Estricto de Dominio (`src/types/index.ts`):** Excelente definición de tipos para todas las entidades geográficas y de gestión (`Territory`, `Zone`, `Building`, `Apartment`, `Visit`, `Restriction`).
2. **Abstracción de Persistencia Local (`src/db/index.ts`):** Uso de Dexie.js con transacciones atómicas, soporte de borrado lógico (`archivedAt`), cola offline (`SyncQueue`) y generación automática de unidades habitacionales.
3. **Calidad Visual y Adaptabilidad:** Interfaz táctica con *glassmorphism*, temas oscuros de alta fidelidad, compatibilidad móvil con láminas inferiores (*Bottom Sheets*) y soporte de vibración háptica nativa.
4. **Validación de Tipos Limpia:** Cero errores de TypeScript en compilación (`tsc --noEmit`).

---

## 3. Puntos de Mejora y Deuda Técnica Identificada

A pesar de la alta calidad funcional del proyecto, se identifican las siguientes áreas de oportunidad:

### A. Desacoplamiento de Componentes Monolíticos

| Archivo | Tamaño Actual | Oportunidad de Refactorización |
|---|---|---|
| `src/components/MapView.tsx` | 1,124 líneas | Contiene simultáneamente el ciclo de vida del mapa MapLibre, la proyección SVG de polígonos, el motor de dibujo asistido (cálculo de distancias, snapping, rubber-banding) y los escuchadores táctiles. |
| `src/components/DetailPanel.tsx` | 1,025 líneas | Alberga la grilla de apartamentos, el formulario de registro de visitas, el generador por lotes de unidades, el formulario de edición del inmueble, el historial y el selector de color. |
| `src/App.tsx` | 726 líneas | Orquesta más de 20 estados independientes y maneja directamente toda la lógica de dibujo, selección y recálculo de métricas. |

#### Recomendaciones Concretas:
1. **Modularizar `MapView.tsx`:**
   - Extraer la lógica de trazado vectorial a un hook personalizado: `useMapDrawing.ts`.
   - Separar el renderizado de polígonos en subcomponentes: `<BuildingLayer />`, `<ZoneLayer />`, `<TerritoryLayer />`.
2. **Modularizar `DetailPanel.tsx`:**
   - Crear subcomponentes independientes en una subcarpeta `src/components/detail/`:
     - `UnitsTab.tsx` (Grilla de apartamentos y formulario de visita).
     - `HistoryTab.tsx` (Línea de tiempo de visitas).
     - `BuildingInfoTab.tsx` (Formulario de edición de propiedades del inmueble).
     - `BatchUnitModal.tsx` (Generador automático por pisos).

---

### B. Gestión de Estado Global (Mitigación de *Prop Drilling*)

Actualmente, `App.tsx` pasa múltiples propiedades y funciones de callback a través de 2 y 3 niveles de componentes (ej. de `App` a `TerritoryTree` o a `MapView`).

#### Recomendación:
Implementar un contexto React ligero (`TerritoryContext`) o un store reactivo con [Zustand](https://github.com/pmndrs/zustand):
- `useTerritoryStore`: Almacena territorios, zonas, edificios y selecciones activas.
- Permite que componentes como `CoverageStatusBar` o `Navbar` lean directamente las métricas o disparen selecciones sin sobrecargar las props de `App.tsx`.

---

### C. Incorporación de Suite de Pruebas Automatizadas

El proyecto no cuenta con tests automatizados para validar la lógica crítica de negocio:
- Idempotencia en la cola de sincronización (`SyncQueue`).
- Integridad transaccional al crear edificios y autogenerar unidades.
- Cálculo de métricas de cobertura física y porcentajes de contacto en `calculateCoverage()`.

#### Recomendación:
Configurar **Vitest** con **fake-indexeddb** para pruebas unitarias de `src/db/index.ts`:
```bash
npm install -D vitest fake-indexeddb
```
Ejemplo de prueba sugerida:
```typescript
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, initDatabase, calculateCoverage } from './src/db';

describe('Territory Logic & Coverage', () => {
  beforeEach(async () => {
    await db.delete();
    await initDatabase();
  });

  it('calculates physical coverage correctly', async () => {
    const metrics = await calculateCoverage();
    expect(metrics.totalBuildings).toBeGreaterThan(0);
  });
});
```

---

## 4. Ajustes Menores en la Configuración del Sistema Operativo

En el archivo `~/.bashrc` de este equipo se detectó una pequeña errata de sintaxis:
```bash
# Línea actual en ~/.bashrc:
export export CAPACITOR_ANDROID_STUDIO_PATH="/opt/android-studio/bin/studio"

# Línea recomendada:
export CAPACITOR_ANDROID_STUDIO_PATH="/opt/android-studio/bin/studio"
```
Corregir esta línea elimina la duplicación de la palabra reservada `export`.
