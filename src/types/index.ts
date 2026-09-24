export type VisitResult = 
  | 'CONTACTED' 
  | 'NO_ANSWER' 
  | 'ACCESS_PROBLEM' 
  | 'REFUSED' 
  | 'NOT_HOME' 
  | 'OTHER';

export type ApartmentStatus = 
  | 'CONTACTED' 
  | 'NO_ANSWER' 
  | 'PENDING' 
  | 'UNVISITED' 
  | 'ACCESS_PROBLEM' 
  | 'ARCHIVED';

export type AccessType = 
  | 'FREE' 
  | 'INTERCOM' 
  | 'GATE_SECURITY' 
  | 'GUARD' 
  | 'LOCKED' 
  | 'OTHER';

export type BuildingType = 
  | 'RESIDENTIAL_BUILDING' 
  | 'HOUSE' 
  | 'COMMERCIAL' 
  | 'GATED_COMMUNITY' 
  | 'TOWER';

export type RestrictionType = 
  | 'NO_VISITS' 
  | 'ACCESS_RESTRICTED' 
  | 'INTERCOM_REQUIRED' 
  | 'INTERCOM_BROKEN' 
  | 'SPECIFIC_HOURS' 
  | 'SPECIAL_INSTRUCTIONS';

export interface Congregation {
  id: string;
  name: string;
  region: string;
  createdAt: string;
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // [ [ [lon, lat], ... ] ]
}

export interface Territory {
  id: string;
  congregationId: string;
  name: string;
  code: string;
  geometry: GeoPolygon;
  center: [number, number]; // [lon, lat]
  status: 'ACTIVE' | 'ARCHIVED' | 'IN_TRANSFER';
  createdAt: string;
  updatedAt: string;
}

export interface Zone {
  id: string;
  territoryId: string;
  name: string;
  code: string;
  geometry: GeoPolygon;
  center: [number, number];
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface Building {
  id: string;
  zoneId: string;
  territoryId: string;
  name: string;
  address: string;
  geometry: GeoPolygon;
  center: [number, number];
  buildingType: BuildingType;
  floors: number;
  accessType: AccessType;
  notes?: string;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Apartment {
  id: string;
  buildingId: string;
  unitNumber: string;
  floor: number;
  notes?: string;
  calculatedStatus: ApartmentStatus;
  lastVisitedAt?: string | null;
  archivedAt?: string | null;
}

export interface Visit {
  id: string;
  apartmentId: string;
  buildingId: string;
  userId: string;
  visitedAt: string;
  result: VisitResult;
  note?: string;
  latitude?: number;
  longitude?: number;
  deviceId: string;
  operationId: string;
  createdAt: string;
}

export interface Restriction {
  id: string;
  entityType: 'TERRITORY' | 'ZONE' | 'BUILDING' | 'APARTMENT';
  entityId: string;
  restrictionType: RestrictionType;
  description: string;
  active: boolean;
  createdAt: string;
}

export interface SyncOperation {
  id: string;
  deviceId: string;
  operationType: 'CREATE_VISIT' | 'UPDATE_BUILDING' | 'CREATE_BUILDING' | 'ADD_RESTRICTION';
  entityType: string;
  entityId: string;
  payload: any;
  createdAt: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  retryCount: number;
}

export interface CoverageMetrics {
  totalBuildings: number;
  visitedBuildings: number;
  physicalCoveragePercent: number;
  totalApartments: number;
  attemptedApartments: number;
  attemptedPercent: number;
  contactedApartments: number;
  contactedPercent: number;
  pendingApartments: number;
  pendingPercent: number;
  accessIssuesCount: number;
}

export type BaseMapStyle = 'STREETS' | 'SATELLITE' | 'HYBRID' | 'GODS_EYE_DARK';

export interface LayerToggles {
  territorial: boolean;
  buildings: boolean;
  preachingStatus: boolean;
  restrictions: boolean;
  infrastructure: boolean;
  godsEyeTelemetry: boolean;
  threeDBuildings: boolean;
}
