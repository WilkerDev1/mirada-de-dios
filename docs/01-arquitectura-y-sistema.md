# 01 · Arquitectura del Sistema

## 1. Visión General y Propósito

**Mirada de Dios** es una plataforma de inteligencia territorial y cartografía táctica diseñada para el mapeo estructurado de zonas residenciales, condominios, torres, casas y apartamentos, así como para el registro inmutable de la actividad de predicación y visitas de campo.

La aplicación opera bajo un paradigma **Offline-First**, permitiendo a los publicadores y administradores trabajar sin cobertura de red en el campo, registrar visitas, crear polígonos territoriales, dar de alta edificios y sincronizar oportunamente cuando se restablece la conectividad.

Inspirada visual y operativamente en herramientas tácticas de inteligencia geoespacial (como *God's Eye View*), prioriza una visualización 100% centrada en el mapa con interfaces semitransparentes (*glassmorphism*), telemetría en tiempo real y extrusiones volumétricas 3D.

---

## 2. Stack Tecnológico

El proyecto está construido combinando estándares web modernos de alto rendimiento con un contenedor nativo multiplataforma:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIRADA DE DIOS (APP)                         │
├─────────────────────────────────────────────────────────────────┤
│  Capa de Presentación: React 19 + TypeScript + Tailwind CSS v4  │
│  Íconos & Estilos:     Lucide React + Glassmorphism UI          │
├─────────────────────────────────────────────────────────────────┤
│  Motor Cartográfico:   MapLibre GL JS (WebGL / Vector / Raster) │
│  Capas de Datos:       Proyección Híbrida WebGL + Capa SVG      │
├─────────────────────────────────────────────────────────────────┤
│  Almacenamiento Local: Dexie.js (Wrapper reactivo de IndexedDB) │
│  Sincronización:       SyncQueue transaccional offline-first    │
├─────────────────────────────────────────────────────────────────┤
│  Runtime Móvil:        Capacitor 8 (Plugins: Geolocation,       │
│                        Haptics, StatusBar)                      │
│  Contenedor Nativo:    Android (Java/Kotlin + Gradle 8.14)      │
└─────────────────────────────────────────────────────────────────┘
```

| Componente | Tecnología | Versión | Rol en el Sistema |
|---|---|---|---|
| **Core UI** | React | ^19.3.0 | Renderizado reactivo de la interfaz de usuario |
| **Tipado** | TypeScript | ^7.0.2 | Integridad de tipos y modelado estricto del dominio |
| **Bundler / Dev** | Vite | ^8.3.1 | Compilación ultrarrápida y Hot Module Replacement (HMR) |
| **Estilos** | Tailwind CSS | ^4.3.3 | Sistema de diseño de alta densidad y temas tácticos |
| **Cartografía** | MapLibre GL JS | ^6.11.2 | Renderizado de teselas vectoriales/ráster y cámara 3D |
| **Base de Datos** | Dexie.js | ^4.4.6 | Base de datos local transaccional IndexedDB |
| **Contenedor Móvil** | Capacitor | ^8.5.2 | Empaquetado APK nativo y acceso a sensores/hardware |
| **Build Android** | Gradle / AGP | 8.14.3 | Compilación nativa Android ejecutada sobre JDK 21 |

---

## 3. Principios Fundamentales de Diseño

La arquitectura de *Mirada de Dios* implementa seis principios rectores:

### P1 — Territory-First (El Territorio es el Núcleo)
A diferencia de los sistemas centrados en usuarios o listas de contactos, el modelo de datos gravita alrededor de la entidad física:
```text
Congregación → Territorio → Zona (Residencial) → Edificio/Inmueble → Apartamento/Unidad → Visitas/Eventos
```
Los publicadores y coordinadores interactúan con la jerarquía física de objetos espaciales. La propiedad y asignación de un territorio pueden cambiar con el tiempo sin alterar la estructura física ni el historial histórico.

### P2 — Offline-First por Diseño
- La aplicación **nunca asume conectividad activa**.
- Todas las operaciones de lectura y escritura se realizan primero sobre la base de datos local **IndexedDB** a través de **Dexie.js**.
- Cada mutación (`CREATE_VISIT`, `CREATE_BUILDING`, `UPDATE_ZONE`, etc.) genera un registro transaccional en `SyncQueue` con un identificador de operación único (`operation_id`), marca temporal y atributos de dispositivo.
- El reintento y reconciliación con el servidor central se delega a un proceso de sincronización asíncrono.

### P3 — El Historial es Inmutable (Event Ledger)
- **Las visitas jamás se sobrescriben ni se eliminan físicamente.**
- Cada visita es un registro inmutable con `id`, `apartmentId`, `visitedAt`, `result`, `note`, `userId`, `deviceId` y coordenadas GPS opcionales.
- El estado actual de un apartamento (`calculatedStatus`) es un estado proyectado calculado a partir del último evento registrado en su historial.

### P4 — Separación Estricta: Cobertura Física ≠ Intento ≠ Contacto
El sistema no confunde recorrer una zona con haber hablado con sus habitantes:
1. **Cobertura física:** Porcentaje de edificios del territorio que han recibido al menos una visita.
2. **Intentos de contacto:** Porcentaje de apartamentos donde se ha tocado o llamado (incluyendo "Sin respuesta" o "No en casa").
3. **Contactos efectivos:** Porcentaje de apartamentos donde efectivamente se logró interacción con el residente.

### P5 — Datos Estructurados antes que Texto Libre
Los datos operativos críticos (tipo de acceso, restricciones, código de piso, resultado de visita) son enumeraciones tipadas y estructuradas. Las notas libres existen solo como información complementaria contextual, evitando ambigüedades en auditorías y filtros.

### P6 — Privacidad por Diseño (Data Minimization)
No se almacenan nombres personales, teléfonos ni datos personales de los residentes de los apartamentos. Solo se guarda información estrictamente operativa ("No contestó", "Acceso con intercomunicador", "Restricción de horario", etc.), protegiendo la privacidad de los vecinos según normativas de protección de datos.

---

## 4. Alcance Multi-Congregación

El sistema contempla desde su raíz un modelo multi-congregación:
- Cada territorio (`Territory`) está vinculado a un `congregation_id`.
- Las congregaciones pueden coexistir en la misma base de datos sin colisión de identificadores.
- Se contempla la transferencia territorial: cuando un territorio se transfiere a otra congregación por reestructuración de circuito, se conserva el historial previo de visitas como auditoría inmutable, vinculando la vigencia territorial a la nueva congregación.

---

## 5. Capas de la Aplicación

```
┌────────────────────────────────────────────────────────┐
│                   CAPA DE USUARIO                      │
│ Navbar, TerritoryTree, DetailPanel, Sheets, HUD, Layer │
└───────────────────────────▲────────────────────────────┘
                            │ Estados y callbacks
┌───────────────────────────┴────────────────────────────┐
│                  ORQUESTADOR (App.tsx)                 │
│   Gestión de estado global, viewport, selecciones,     │
│   modos de dibujo y cálculo reactivo de métricas       │
└─────────────▲─────────────────────────────▲────────────┘
              │                             │
┌─────────────▼─────────────┐ ┌─────────────▼────────────┐
│    MOTOR CARTOGRÁFICO     │ │   PERSISTENCIA Y SYNC    │
│  - MapLibre GL JS Map     │ │  - Dexie (IndexedDB)     │
│  - Proyección SVG overlay │ │  - Seed Santo Domingo    │
│  - Drafting AutoCAD tool  │ │  - Cola SyncQueue        │
│  - 3D Extrusion Engine    │ │  - Métricas de Cobertura │
└─────────────▲─────────────┘ └─────────────▲────────────┘
              │                             │
┌─────────────┴─────────────────────────────┴────────────┐
│                    CAPA NATIVA (Capacitor)             │
│   GPS Geolocation, Haptic Feedback, Status Bar Theme   │
└────────────────────────────────────────────────────────┘
```
