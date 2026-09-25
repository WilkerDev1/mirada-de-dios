# 02 · Modelo de Datos y Persistencia

## 1. Modelo de Dominio Territorial

El núcleo del sistema está formalizado en `src/types/index.ts`. La estructura refleja la realidad geográfica del trabajo territorial de campo:

```
[Congregación]
      │
      └──► [Territorio] (Polígono macro)
                 │
                 └──► [Zona / Residencial] (Polígono o clúster)
                            │
                            └──► [Edificio / Inmueble] (Polígono de huella física)
                                       │
                                       └──► [Apartamento / Unidad]
                                                  │
                                                  └──► [Visitas] (Historial inmutable)
```

---

## 2. Entidades Principales e Interfaces TypeScript

### 2.1 Congregación (`Congregation`)
Representa la unidad organizativa principal:
```typescript
export interface Congregation {
  id: string;
  name: string;
  region: string;
  createdAt: string;
}
```

### 2.2 Territorio (`Territory`)
Polígono geográfico delimitador del área de asignación:
```typescript
export interface Territory {
  id: string;
  congregationId: string;
  name: string;
  code: string;               // Ej: "SD-01"
  geometry: GeoPolygon;       // Polígono GeoJSON estándar [[[lng, lat], ...]]
  center: [number, number];   // Coordenadas del centro [lng, lat]
  color?: string;             // Color representativo del territorio
  status: 'ACTIVE' | 'ARCHIVED' | 'IN_TRANSFER';
  createdAt: string;
  updatedAt: string;
}
```

### 2.3 Zona o Residencial (`Zone`)
Subdivisión interna de un territorio (un residencial cerrado, un barrio, un condominio horizontal o un bloque de manzanas):
```typescript
export interface Zone {
  id: string;
  territoryId: string;
  name: string;
  code: string;               // Ej: "Z-01"
  color?: string;             // Color asignado para visualización en mapa
  geometry: GeoPolygon;       // Polígono de delimitación de la zona
  center: [number, number];
  status: 'ACTIVE' | 'ARCHIVED';
}
```

### 2.4 Edificio / Inmueble (`Building`)
Inmueble con huella geométrica en el mapa:
```typescript
export type BuildingType = 
  | 'RESIDENTIAL_BUILDING' 
  | 'HOUSE' 
  | 'COMMERCIAL' 
  | 'GATED_COMMUNITY' 
  | 'TOWER';

export type AccessType = 
  | 'FREE'              // Acceso libre
  | 'INTERCOM'          // Intercomunicador
  | 'GATE_SECURITY'     // Garita de seguridad
  | 'GUARD'             // Vigilante o conserje
  | 'LOCKED'            // Portón cerrado con llave
  | 'OTHER';

export interface Building {
  id: string;
  zoneId: string;
  territoryId: string;
  name: string;
  address: string;
  geometry: GeoPolygon;
  center: [number, number];
  buildingType: BuildingType;
  floors: number;             // Determina la altura de extrusión 3D
  accessType: AccessType;
  color?: string;             // Color personalizado para el polígono del edificio
  notes?: string;
  archivedAt?: string | null; // Borrado lógico para preservar integridad
  createdAt: string;
  updatedAt: string;
}
```

### 2.5 Apartamento / Unidad (`Apartment`)
Unidad habitacional dentro de un edificio o residencia:
```typescript
export type ApartmentStatus = 
  | 'CONTACTED'       // Contactado en la última visita
  | 'NO_ANSWER'       // No contestó / No estaba
  | 'PENDING'         // Pendiente de visitar
  | 'UNVISITED'       // Jamás visitado
  | 'ACCESS_PROBLEM'  // Problema de acceso o restricción
  | 'ARCHIVED';       // Archivado

export interface Apartment {
  id: string;
  buildingId: string;
  unitNumber: string;         // Ej: "101", "2-A", "Penthouse"
  floor: number;              // Nivel del apartamento
  notes?: string;
  calculatedStatus: ApartmentStatus; // Estado derivado de la última visita
  lastVisitedAt?: string | null;
  archivedAt?: string | null;
}
```

### 2.6 Visita (`Visit`) — Event Ledger Inmutable
Cada interacción de campo es un evento registrado de forma permanente:
```typescript
export type VisitResult = 
  | 'CONTACTED' 
  | 'NO_ANSWER' 
  | 'ACCESS_PROBLEM' 
  | 'REFUSED' 
  | 'NOT_HOME' 
  | 'OTHER';

export interface Visit {
  id: string;
  apartmentId: string;
  buildingId: string;
  userId: string;
  visitedAt: string;          // ISO 8601 UTC
  result: VisitResult;
  note?: string;              // Observación de campo opcional
  latitude?: number;          // Telemetría GPS al momento del registro
  longitude?: number;
  deviceId: string;           // Identificador anónimo del dispositivo
  operationId: string;        // Idempotency key para la sincronización
  createdAt: string;
}
```

### 2.7 Restricciones (`Restriction`)
Alertas que aplican a cualquier nivel de la jerarquía:
```typescript
export type RestrictionType = 
  | 'NO_VISITS' 
  | 'ACCESS_RESTRICTED' 
  | 'INTERCOM_REQUIRED' 
  | 'INTERCOM_BROKEN' 
  | 'SPECIFIC_HOURS' 
  | 'SPECIAL_INSTRUCTIONS';

export interface Restriction {
  id: string;
  entityType: 'TERRITORY' | 'ZONE' | 'BUILDING' | 'APARTMENT';
  entityId: string;
  restrictionType: RestrictionType;
  description: string;
  active: boolean;
  createdAt: string;
}
```

---

## 3. Persistencia Local con Dexie.js (IndexedDB)

La persistencia local reside en `src/db/index.ts` y utiliza **Dexie.js** como motor transaccional sobre IndexedDB:

### 3.1 Esquema e Índices
```typescript
export class TerritoryDatabase extends Dexie {
  congregations!: Table<Congregation, string>;
  territories!: Table<Territory, string>;
  zones!: Table<Zone, string>;
  buildings!: Table<Building, string>;
  apartments!: Table<Apartment, string>;
  visits!: Table<Visit, string>;
  restrictions!: Table<Restriction, string>;
  syncQueue!: Table<SyncOperation, string>;

  constructor() {
    super('MiradaDeDiosDB');
    this.version(1).stores({
      congregations: 'id, name',
      territories: 'id, congregationId, code, status',
      zones: 'id, territoryId, code, status',
      buildings: 'id, zoneId, territoryId, name, archivedAt',
      apartments: 'id, buildingId, calculatedStatus, archivedAt',
      visits: 'id, apartmentId, buildingId, visitedAt, operationId',
      restrictions: 'id, entityId, entityType, active',
      syncQueue: 'id, status, createdAt'
    });
  }
}
```

### 3.2 Transacciones Atómicas y Registro Idempotente
Cuando se registra una visita mediante `recordVisit()`:
1. Se genera un `operationId` único (`op-[random]-[timestamp]`).
2. Se ejecuta una transacción atómica `db.transaction('rw', [db.visits, db.apartments, db.syncQueue])`.
3. Se agrega el registro a la tabla `visits`.
4. Se actualiza el `calculatedStatus` y `lastVisitedAt` en la tabla `apartments`.
5. Se inserta la operación en `syncQueue` con estado `PENDING`.
6. Si ocurre un fallo a mitad de camino, IndexedDB revierte todos los cambios, impidiendo discrepancias de estado.

```typescript
// Ejemplo de atomicidad en creación de edificio y autogeneración de unidades:
await db.transaction('rw', [db.buildings, db.apartments, db.syncQueue], async () => {
  await db.buildings.add(newBuilding);
  await db.apartments.bulkAdd(apartmentsToCreate);
  await db.syncQueue.add({
    id: operationId,
    deviceId,
    operationType: 'CREATE_BUILDING',
    entityType: 'BUILDING',
    entityId: buildingId,
    payload: { building: newBuilding, apartmentsCount: apartmentsToCreate.length },
    createdAt: now,
    status: 'PENDING',
    retryCount: 0
  });
});
```

---

## 4. Cola de Sincronización Offline (`SyncQueue`)

Para soportar operaciones en zonas sin conectividad:
1. **Encolado local:** Cualquier alta, edición o visita genera una operación en `syncQueue`:
   - `id`: Identificador único de operación (Idempotency Key).
   - `operationType`: `CREATE_VISIT`, `UPDATE_BUILDING`, `CREATE_BUILDING`, `CREATE_ZONE`, `CREATE_TERRITORY`, etc.
   - `status`: `PENDING` | `SYNCED` | `FAILED`.
   - `retryCount`: Número de reintentos.
2. **Procesamiento de la cola:** `processSyncQueue()` recorre los registros `PENDING`, los procesa y marca como `SYNCED` tras confirmar la recepción.
3. **Idempotencia:** Si un paquete se transmite dos veces debido a una pérdida de conexión durante la respuesta, el servidor o la reconciliación local utiliza el `operationId` para ignorar duplicados.

---

## 5. Cálculo Dinámico de Cobertura Territorial

La función `calculateCoverage(territoryId)` recorre en tiempo de ejecución las entidades para proveer métricas exactas:

```typescript
export async function calculateCoverage(territoryId?: string): Promise<CoverageMetrics> {
  const buildings = await getBuildings(territoryId);
  const buildingIds = new Set(buildings.map(b => b.id));
  const allApartments = await db.apartments.toArray();
  const apartments = allApartments.filter(a => buildingIds.has(a.buildingId) && !a.archivedAt);
  const visits = await db.visits.toArray();
  const visitedBuildingIds = new Set(visits.filter(v => buildingIds.has(v.buildingId)).map(v => v.buildingId));

  const totalBuildings = buildings.length;
  const visitedBuildings = visitedBuildingIds.size;
  const physicalCoveragePercent = totalBuildings > 0 
    ? Math.round((visitedBuildings / totalBuildings) * 100) 
    : 0;

  const totalApartments = apartments.length;
  const contactedApartments = apartments.filter(a => a.calculatedStatus === 'CONTACTED').length;
  const attemptedApartments = apartments.filter(a => 
    a.calculatedStatus === 'CONTACTED' || a.calculatedStatus === 'NO_ANSWER'
  ).length;
  const pendingApartments = apartments.filter(a => 
    a.calculatedStatus === 'PENDING' || a.calculatedStatus === 'UNVISITED'
  ).length;
  const accessIssuesCount = apartments.filter(a => a.calculatedStatus === 'ACCESS_PROBLEM').length;

  return {
    totalBuildings,
    visitedBuildings,
    physicalCoveragePercent,
    totalApartments,
    attemptedApartments,
    attemptedPercent: totalApartments > 0 ? Math.round((attemptedApartments / totalApartments) * 100) : 0,
    contactedApartments,
    contactedPercent: totalApartments > 0 ? Math.round((contactedApartments / totalApartments) * 100) : 0,
    pendingApartments,
    pendingPercent: totalApartments > 0 ? Math.round((pendingApartments / totalApartments) * 100) : 0,
    accessIssuesCount
  };
}
```
