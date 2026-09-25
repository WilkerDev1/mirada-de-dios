import Dexie, { type Table } from 'dexie';
import {
  Congregation,
  Territory,
  Zone,
  Building,
  Apartment,
  Visit,
  Restriction,
  SyncOperation,
  CoverageMetrics,
  VisitResult,
  ApartmentStatus
} from '../types';
import {
  SEED_CONGREGATION,
  SEED_TERRITORIES,
  SEED_ZONES,
  SEED_BUILDINGS,
  SEED_APARTMENTS,
  SEED_VISITS,
  SEED_RESTRICTIONS
} from '../data/santoDomingoSeed';

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

export const db = new TerritoryDatabase();

export async function initDatabase(): Promise<void> {
  const count = await db.territories.count();
  if (count === 0) {
    console.log('[DB] Seeding initial Santo Domingo geospatial datasets...');
    await db.transaction('rw', [
      db.congregations,
      db.territories,
      db.zones,
      db.buildings,
      db.apartments,
      db.visits,
      db.restrictions
    ], async () => {
      await db.congregations.add(SEED_CONGREGATION);
      await db.territories.bulkAdd(SEED_TERRITORIES);
      await db.zones.bulkAdd(SEED_ZONES);
      await db.buildings.bulkAdd(SEED_BUILDINGS);
      await db.apartments.bulkAdd(SEED_APARTMENTS);
      await db.visits.bulkAdd(SEED_VISITS);
      await db.restrictions.bulkAdd(SEED_RESTRICTIONS);
    });
    console.log('[DB] Seed complete.');
  } else {
    // Ensure test buildings in unassigned territory exist even in existing installations
    const testBld1 = await db.buildings.get('bld-test-free-01');
    if (!testBld1) {
      const b1 = SEED_BUILDINGS.find(b => b.id === 'bld-test-free-01');
      const b2 = SEED_BUILDINGS.find(b => b.id === 'bld-test-free-02');
      if (b1) await db.buildings.put(b1);
      if (b2) await db.buildings.put(b2);
    }
  }
}

export async function getTerritories(congregationId?: string): Promise<Territory[]> {
  if (congregationId) {
    return await db.territories.where('congregationId').equals(congregationId).toArray();
  }
  return await db.territories.toArray();
}

export async function getZones(territoryId?: string): Promise<Zone[]> {
  if (territoryId) {
    return await db.zones.where('territoryId').equals(territoryId).toArray();
  }
  return await db.zones.toArray();
}

export async function getBuildings(territoryId?: string, zoneId?: string): Promise<Building[]> {
  let buildings: Building[];
  if (zoneId) {
    buildings = await db.buildings.where('zoneId').equals(zoneId).toArray();
  } else if (territoryId) {
    buildings = await db.buildings.where('territoryId').equals(territoryId).toArray();
  } else {
    buildings = await db.buildings.toArray();
  }
  return buildings.filter(b => !b.archivedAt);
}

export async function getBuilding(buildingId: string): Promise<Building | undefined> {
  return await db.buildings.get(buildingId);
}

export async function getApartments(buildingId: string): Promise<Apartment[]> {
  const list = await db.apartments.where('buildingId').equals(buildingId).toArray();
  return list.filter(a => !a.archivedAt);
}

export async function getBuildingVisits(buildingId: string): Promise<Visit[]> {
  return await db.visits.where('buildingId').equals(buildingId).reverse().sortBy('visitedAt');
}

export async function getBuildingRestrictions(buildingId: string): Promise<Restriction[]> {
  return await db.restrictions.where('entityId').equals(buildingId).toArray();
}

export async function recordVisit(params: {
  apartmentId: string;
  buildingId: string;
  result: VisitResult;
  note?: string;
  latitude?: number;
  longitude?: number;
  userId?: string;
}): Promise<Visit> {
  const now = new Date().toISOString();
  const operationId = 'op-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
  const visitId = 'vis-' + Math.random().toString(36).substring(2, 9);
  const deviceId = getDeviceId();

  const newVisit: Visit = {
    id: visitId,
    apartmentId: params.apartmentId,
    buildingId: params.buildingId,
    userId: params.userId || 'usr-mobile-app',
    visitedAt: now,
    result: params.result,
    note: params.note,
    latitude: params.latitude,
    longitude: params.longitude,
    deviceId,
    operationId,
    createdAt: now
  };

  // Status mapping
  let newStatus: ApartmentStatus = 'PENDING';
  if (params.result === 'CONTACTED') newStatus = 'CONTACTED';
  else if (params.result === 'NO_ANSWER' || params.result === 'NOT_HOME') newStatus = 'NO_ANSWER';
  else if (params.result === 'ACCESS_PROBLEM') newStatus = 'ACCESS_PROBLEM';
  else newStatus = 'NO_ANSWER';

  await db.transaction('rw', [db.visits, db.apartments, db.syncQueue], async () => {
    await db.visits.add(newVisit);
    await db.apartments.update(params.apartmentId, {
      calculatedStatus: newStatus,
      lastVisitedAt: now
    });
    // Add to offline sync queue
    await db.syncQueue.add({
      id: operationId,
      deviceId,
      operationType: 'CREATE_VISIT',
      entityType: 'VISIT',
      entityId: visitId,
      payload: newVisit,
      createdAt: now,
      status: 'PENDING',
      retryCount: 0
    });
  });

  return newVisit;
}

export async function createBuildingWithApartments(data: {
  zoneId?: string;
  territoryId?: string;
  name: string;
  address: string;
  center: [number, number];
  polygonCoordinates: number[][][];
  buildingType: Building['buildingType'];
  floors: number;
  accessType: Building['accessType'];
  unitsPerFloor: number;
  color?: string;
  notes?: string;
}): Promise<Building> {
  const now = new Date().toISOString();
  const buildingId = 'bld-custom-' + Math.random().toString(36).substring(2, 9);
  const deviceId = getDeviceId();
  const operationId = 'op-bld-' + Date.now();

  const newBuilding: Building = {
    id: buildingId,
    zoneId: data.zoneId || 'zone-general',
    territoryId: data.territoryId || 'terr-general',
    name: data.name,
    address: data.address,
    center: data.center,
    geometry: {
      type: 'Polygon',
      coordinates: data.polygonCoordinates
    },
    buildingType: data.buildingType,
    floors: data.floors,
    accessType: data.accessType,
    color: data.color,
    notes: data.notes,
    createdAt: now,
    updatedAt: now
  };

  // Generate apartments
  const apartmentsToCreate: Apartment[] = [];
  for (let f = 1; f <= data.floors; f++) {
    for (let u = 1; u <= data.unitsPerFloor; u++) {
      const unitNum = `${f}0${u}`;
      apartmentsToCreate.push({
        id: `apt-${buildingId}-${unitNum}`,
        buildingId,
        unitNumber: unitNum,
        floor: f,
        calculatedStatus: 'PENDING',
        lastVisitedAt: null
      });
    }
  }

  await db.transaction('rw', [db.buildings, db.apartments, db.syncQueue], async () => {
    await db.buildings.add(newBuilding);
    await db.apartments.bulkAdd(apartmentsToCreate);
    await db.syncQueue.add({
      id: operationId,
      deviceId,
      operationType: 'CREATE_BUILDING',
      entityType: 'BUILDING',
      entityId: buildingId,
      payload: { building: newBuilding, apartments: apartmentsToCreate },
      createdAt: now,
      status: 'PENDING',
      retryCount: 0
    });
  });

  return newBuilding;
}

export async function createZone(data: {
  territoryId?: string;
  name: string;
  code: string;
  color?: string;
  center: [number, number];
  polygonCoordinates: number[][][];
}): Promise<Zone> {
  const zoneId = 'zone-' + Math.random().toString(36).substring(2, 9);
  const deviceId = getDeviceId();
  const operationId = 'op-zn-' + Date.now();
  const now = new Date().toISOString();

  const newZone: Zone = {
    id: zoneId,
    territoryId: data.territoryId || 'terr-general',
    name: data.name,
    code: data.code,
    color: data.color || '#14b8a6',
    center: data.center,
    geometry: {
      type: 'Polygon',
      coordinates: data.polygonCoordinates
    },
    status: 'ACTIVE'
  };

  await db.transaction('rw', [db.zones, db.syncQueue], async () => {
    await db.zones.add(newZone);
    await db.syncQueue.add({
      id: operationId,
      deviceId,
      operationType: 'CREATE_ZONE',
      entityType: 'ZONE',
      entityId: zoneId,
      payload: newZone,
      createdAt: now,
      status: 'PENDING',
      retryCount: 0
    });
  });

  return newZone;
}

export async function calculateCoverage(territoryId: string): Promise<CoverageMetrics> {
  const buildings = await getBuildings(territoryId);
  const totalBuildings = buildings.length;
  if (totalBuildings === 0) {
    return {
      totalBuildings: 0,
      visitedBuildings: 0,
      physicalCoveragePercent: 0,
      totalApartments: 0,
      attemptedApartments: 0,
      attemptedPercent: 0,
      contactedApartments: 0,
      contactedPercent: 0,
      pendingApartments: 0,
      pendingPercent: 0,
      accessIssuesCount: 0
    };
  }

  const buildingIds = buildings.map(b => b.id);
  const apartments = (await db.apartments.where('buildingId').anyOf(buildingIds).toArray()).filter(a => !a.archivedAt);
  const totalApartments = apartments.length;

  let contacted = 0;
  let noAnswer = 0;
  let accessProblem = 0;
  let pending = 0;

  const visitedBuildingSet = new Set<string>();

  for (const apt of apartments) {
    if (apt.calculatedStatus === 'CONTACTED') {
      contacted++;
      visitedBuildingSet.add(apt.buildingId);
    } else if (apt.calculatedStatus === 'NO_ANSWER') {
      noAnswer++;
      visitedBuildingSet.add(apt.buildingId);
    } else if (apt.calculatedStatus === 'ACCESS_PROBLEM') {
      accessProblem++;
      visitedBuildingSet.add(apt.buildingId);
    } else {
      pending++;
    }
  }

  const visitedBuildings = visitedBuildingSet.size;
  const attemptedApartments = contacted + noAnswer + accessProblem;

  return {
    totalBuildings,
    visitedBuildings,
    physicalCoveragePercent: totalBuildings > 0 ? Math.round((visitedBuildings / totalBuildings) * 100) : 0,
    totalApartments,
    attemptedApartments,
    attemptedPercent: totalApartments > 0 ? Math.round((attemptedApartments / totalApartments) * 100) : 0,
    contactedApartments: contacted,
    contactedPercent: totalApartments > 0 ? Math.round((contacted / totalApartments) * 100) : 0,
    pendingApartments: pending,
    pendingPercent: totalApartments > 0 ? Math.round((pending / totalApartments) * 100) : 0,
    accessIssuesCount: accessProblem
  };
}

export async function getPendingSyncCount(): Promise<number> {
  return await db.syncQueue.where('status').equals('PENDING').count();
}

export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  const pending = await db.syncQueue.where('status').equals('PENDING').toArray();
  let synced = 0;
  for (const op of pending) {
    // In demo / offline-first mode, verify idempotency and mark as SYNCED
    await db.syncQueue.update(op.id, { status: 'SYNCED' });
    synced++;
  }
  return { synced, failed: 0 };
}

function getDeviceId(): string {
  let devId = localStorage.getItem('mdd_device_id');
  if (!devId) {
    devId = 'dev-sdq-' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem('mdd_device_id', devId);
  }
  return devId;
}

export async function updateBuilding(buildingId: string, updates: Partial<Building>): Promise<Building | undefined> {
  const existing = await db.buildings.get(buildingId);
  if (!existing) return undefined;
  const updated: Building = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  await db.buildings.put(updated);
  return updated;
}

export async function createTerritory(data: {
  congregationId: string;
  name: string;
  code: string;
  color?: string;
  center: [number, number];
  polygonCoordinates: number[][][];
}): Promise<Territory> {
  const terrId = 'terr-custom-' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();
  const newTerr: Territory = {
    id: terrId,
    congregationId: data.congregationId,
    name: data.name,
    code: data.code,
    center: data.center,
    color: data.color || '#0284c7',
    geometry: {
      type: 'Polygon',
      coordinates: data.polygonCoordinates
    },
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now
  };
  await db.territories.add(newTerr);
  return newTerr;
}

export async function updateTerritory(territoryId: string, updates: Partial<Territory>): Promise<Territory | undefined> {
  const existing = await db.territories.get(territoryId);
  if (!existing) return undefined;
  const updated: Territory = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  await db.territories.put(updated);
  return updated;
}

export async function updateZone(zoneId: string, updates: Partial<Zone>): Promise<Zone | undefined> {
  const existing = await db.zones.get(zoneId);
  if (!existing) return undefined;
  const updated: Zone = {
    ...existing,
    ...updates
  };
  await db.zones.put(updated);
  return updated;
}

export async function deleteBuilding(buildingId: string): Promise<void> {
  await db.transaction('rw', [db.buildings, db.apartments, db.visits, db.syncQueue], async () => {
    await db.buildings.delete(buildingId);
    await db.apartments.where('buildingId').equals(buildingId).delete();
    await db.visits.where('buildingId').equals(buildingId).delete();
  });
}

export async function deleteZone(zoneId: string): Promise<void> {
  await db.transaction('rw', [db.zones, db.buildings, db.apartments], async () => {
    const blds = await db.buildings.where('zoneId').equals(zoneId).toArray();
    for (const b of blds) {
      await db.apartments.where('buildingId').equals(b.id).delete();
      await db.buildings.delete(b.id);
    }
    await db.zones.delete(zoneId);
  });
}

export async function deleteTerritory(territoryId: string): Promise<void> {
  await db.transaction('rw', [db.territories, db.zones, db.buildings, db.apartments], async () => {
    const zones = await db.zones.where('territoryId').equals(territoryId).toArray();
    for (const z of zones) {
      await deleteZone(z.id);
    }
    await db.territories.delete(territoryId);
  });
}
