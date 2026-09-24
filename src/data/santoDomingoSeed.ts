import { Congregation, Territory, Zone, Building, Apartment, Visit, Restriction } from '../types';

export const SEED_CONGREGATION: Congregation = {
  id: 'cong-sd-01',
  name: 'Santo Domingo Central',
  region: 'Distrito Nacional, República Dominicana',
  createdAt: '2025-01-01T08:00:00Z',
};

export const SEED_TERRITORIES: Territory[] = [
  {
    id: 'terr-sd-01',
    congregationId: 'cong-sd-01',
    name: 'Zona Colonial & Ciudad Nueva',
    code: 'SD-01',
    center: [-69.8860, 18.4740],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.8940, 18.4710],
        [-69.8910, 18.4800],
        [-69.8805, 18.4805],
        [-69.8790, 18.4715],
        [-69.8940, 18.4710],
      ]]
    },
    status: 'ACTIVE',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z'
  },
  {
    id: 'terr-sd-02',
    congregationId: 'cong-sd-01',
    name: 'Piantini & Ensanche Naco',
    code: 'SD-02',
    center: [-69.9340, 18.4720],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.9430, 18.4650],
        [-69.9410, 18.4790],
        [-69.9240, 18.4780],
        [-69.9260, 18.4640],
        [-69.9430, 18.4650]
      ]]
    },
    status: 'ACTIVE',
    createdAt: '2025-01-12T10:00:00Z',
    updatedAt: '2025-01-12T10:00:00Z'
  },
  {
    id: 'terr-sd-03',
    congregationId: 'cong-sd-01',
    name: 'Gazcue & Don Bosco',
    code: 'SD-03',
    center: [-69.9030, 18.4680],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.9120, 18.4620],
        [-69.9110, 18.4750],
        [-69.8950, 18.4740],
        [-69.8970, 18.4610],
        [-69.9120, 18.4620]
      ]]
    },
    status: 'ACTIVE',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 'terr-sd-04',
    congregationId: 'cong-sd-01',
    name: 'Bella Vista & Mirador Sur',
    code: 'SD-04',
    center: [-69.9460, 18.4480],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.9560, 18.4420],
        [-69.9540, 18.4550],
        [-69.9370, 18.4540],
        [-69.9390, 18.4410],
        [-69.9560, 18.4420]
      ]]
    },
    status: 'ACTIVE',
    createdAt: '2025-01-20T10:00:00Z',
    updatedAt: '2025-01-20T10:00:00Z'
  }
];

export const SEED_ZONES: Zone[] = [
  // Zonas SD-01
  {
    id: 'zone-sd-01-z1',
    territoryId: 'terr-sd-01',
    name: 'El Conde & Catedral',
    code: 'SD-01-Z1',
    center: [-69.8855, 18.4735],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.8900, 18.4715],
        [-69.8890, 18.4760],
        [-69.8810, 18.4760],
        [-69.8810, 18.4715],
        [-69.8900, 18.4715]
      ]]
    },
    status: 'ACTIVE'
  },
  {
    id: 'zone-sd-01-z2',
    territoryId: 'terr-sd-01',
    name: 'Santa Bárbara & San Antón',
    code: 'SD-01-Z2',
    center: [-69.8835, 18.4780],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.8890, 18.4760],
        [-69.8880, 18.4800],
        [-69.8805, 18.4800],
        [-69.8810, 18.4760],
        [-69.8890, 18.4760]
      ]]
    },
    status: 'ACTIVE'
  },
  // Zonas SD-02
  {
    id: 'zone-sd-02-z1',
    territoryId: 'terr-sd-02',
    name: 'Churchill & Acrópolis',
    code: 'SD-02-Z1',
    center: [-69.9380, 18.4720],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.9430, 18.4680],
        [-69.9410, 18.4760],
        [-69.9320, 18.4760],
        [-69.9340, 18.4680],
        [-69.9430, 18.4680]
      ]]
    },
    status: 'ACTIVE'
  },
  {
    id: 'zone-sd-02-z2',
    territoryId: 'terr-sd-02',
    name: 'Lincoln & Naco Central',
    code: 'SD-02-Z2',
    center: [-69.9290, 18.4730],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.9320, 18.4680],
        [-69.9320, 18.4760],
        [-69.9250, 18.4760],
        [-69.9260, 18.4680],
        [-69.9320, 18.4680]
      ]]
    },
    status: 'ACTIVE'
  },
  // Zonas SD-03
  {
    id: 'zone-sd-03-z1',
    territoryId: 'terr-sd-03',
    name: 'Gazcue Norte / Bolívar',
    code: 'SD-03-Z1',
    center: [-69.9040, 18.4700],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.9110, 18.4670],
        [-69.9100, 18.4740],
        [-69.8970, 18.4730],
        [-69.8980, 18.4670],
        [-69.9110, 18.4670]
      ]]
    },
    status: 'ACTIVE'
  },
  // Zonas SD-04
  {
    id: 'zone-sd-04-z1',
    territoryId: 'terr-sd-04',
    name: 'Sarasota & Bella Vista',
    code: 'SD-04-Z1',
    center: [-69.9460, 18.4480],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.9530, 18.4440],
        [-69.9520, 18.4520],
        [-69.9400, 18.4520],
        [-69.9410, 18.4440],
        [-69.9530, 18.4440]
      ]]
    },
    status: 'ACTIVE'
  }
];

export const SEED_BUILDINGS: Building[] = [
  // --- ZONA COLONIAL: SD-01-Z1 ---
  {
    id: 'bld-zc-01',
    zoneId: 'zone-sd-01-z1',
    territoryId: 'terr-sd-01',
    name: 'Edificio El Conde Real',
    address: 'Calle El Conde #154, Zona Colonial',
    center: [-69.8868, 18.4734],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.8871, 18.4732],
        [-69.8865, 18.4732],
        [-69.8865, 18.4736],
        [-69.8871, 18.4736],
        [-69.8871, 18.4732]
      ]]
    },
    buildingType: 'RESIDENTIAL_BUILDING',
    floors: 4,
    accessType: 'INTERCOM',
    notes: 'Timbre general a la izquierda del portal de madera.',
    createdAt: '2025-02-01T09:00:00Z',
    updatedAt: '2025-02-01T09:00:00Z'
  },
  {
    id: 'bld-zc-02',
    zoneId: 'zone-sd-01-z1',
    territoryId: 'terr-sd-01',
    name: 'Residencial Las Damas',
    address: 'Calle Las Damas #42, Zona Colonial',
    center: [-69.8835, 18.4742],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.8838, 18.4740],
        [-69.8832, 18.4740],
        [-69.8832, 18.4745],
        [-69.8838, 18.4745],
        [-69.8838, 18.4740]
      ]]
    },
    buildingType: 'RESIDENTIAL_BUILDING',
    floors: 3,
    accessType: 'FREE',
    notes: 'Pasillo colonial abierto. Acceso libre hasta patio interior.',
    createdAt: '2025-02-02T10:00:00Z',
    updatedAt: '2025-02-02T10:00:00Z'
  },
  {
    id: 'bld-zc-03',
    zoneId: 'zone-sd-01-z1',
    territoryId: 'terr-sd-01',
    name: 'Condominio Arzobispo Meriño',
    address: 'Calle Arzobispo Meriño #208, esq. Conde',
    center: [-69.8848, 18.4738],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.8851, 18.4736],
        [-69.8845, 18.4736],
        [-69.8845, 18.4741],
        [-69.8851, 18.4741],
        [-69.8851, 18.4736]
      ]]
    },
    buildingType: 'RESIDENTIAL_BUILDING',
    floors: 3,
    accessType: 'INTERCOM',
    notes: 'Intercomunicador operativo en puerta de hierro.',
    createdAt: '2025-02-03T11:00:00Z',
    updatedAt: '2025-02-03T11:00:00Z'
  },
  {
    id: 'bld-zc-04',
    zoneId: 'zone-sd-01-z1',
    territoryId: 'terr-sd-01',
    name: 'Quinta San Antón',
    address: 'Calle Hostos #89, Zona Colonial',
    center: [-69.8856, 18.4752],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.8859, 18.4750],
        [-69.8853, 18.4750],
        [-69.8853, 18.4755],
        [-69.8859, 18.4755],
        [-69.8859, 18.4750]
      ]]
    },
    buildingType: 'HOUSE',
    floors: 2,
    accessType: 'LOCKED',
    notes: 'Timbre en la reja exterior.',
    createdAt: '2025-02-04T12:00:00Z',
    updatedAt: '2025-02-04T12:00:00Z'
  },

  // --- ZONA COLONIAL: SD-01-Z2 Santa Bárbara ---
  {
    id: 'bld-zc-05',
    zoneId: 'zone-sd-01-z2',
    territoryId: 'terr-sd-01',
    name: 'Torre Mirador del Ozama',
    address: 'Calle Gabino Puello #15, Santa Bárbara',
    center: [-69.8830, 18.4788],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.8833, 18.4786],
        [-69.8827, 18.4786],
        [-69.8827, 18.4791],
        [-69.8833, 18.4791],
        [-69.8833, 18.4786]
      ]]
    },
    buildingType: 'TOWER',
    floors: 5,
    accessType: 'GATE_SECURITY',
    notes: 'Seguridad en portón. Anunciarse con conserje.',
    createdAt: '2025-02-05T14:00:00Z',
    updatedAt: '2025-02-05T14:00:00Z'
  },

  // --- PIANTINI: SD-02-Z1 ---
  {
    id: 'bld-pt-01',
    zoneId: 'zone-sd-02-z1',
    territoryId: 'terr-sd-02',
    name: 'Torre Churchill Grand',
    address: 'Av. Winston Churchill #75, Piantini',
    center: [-69.9388, 18.4725],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.9392, 18.4722],
        [-69.9384, 18.4722],
        [-69.9384, 18.4728],
        [-69.9392, 18.4728],
        [-69.9392, 18.4722]
      ]]
    },
    buildingType: 'TOWER',
    floors: 14,
    accessType: 'GUARD',
    notes: 'Lobby con recepción 24/7. Requiere registro en garita.',
    createdAt: '2025-02-10T10:00:00Z',
    updatedAt: '2025-02-10T10:00:00Z'
  },
  {
    id: 'bld-pt-02',
    zoneId: 'zone-sd-02-z1',
    territoryId: 'terr-sd-02',
    name: 'Residencial Piantini Lux',
    address: 'Calle Porfirio Herrera #22, Piantini',
    center: [-69.9360, 18.4718],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.9364, 18.4716],
        [-69.9356, 18.4716],
        [-69.9356, 18.4721],
        [-69.9364, 18.4721],
        [-69.9364, 18.4716]
      ]]
    },
    buildingType: 'RESIDENTIAL_BUILDING',
    floors: 6,
    accessType: 'INTERCOM',
    notes: 'Intercom digital por apartamento.',
    createdAt: '2025-02-11T10:00:00Z',
    updatedAt: '2025-02-11T10:00:00Z'
  },
  {
    id: 'bld-pt-03',
    zoneId: 'zone-sd-02-z2',
    territoryId: 'terr-sd-02',
    name: 'Torre Naco Premier',
    address: 'Calle Frank Félix Miranda #34, Naco',
    center: [-69.9288, 18.4735],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.9292, 18.4732],
        [-69.9284, 18.4732],
        [-69.9284, 18.4738],
        [-69.9292, 18.4738],
        [-69.9292, 18.4732]
      ]]
    },
    buildingType: 'TOWER',
    floors: 10,
    accessType: 'GUARD',
    notes: 'Guardia en la rampa de acceso.',
    createdAt: '2025-02-12T11:00:00Z',
    updatedAt: '2025-02-12T11:00:00Z'
  },

  // --- GAZCUE: SD-03-Z1 ---
  {
    id: 'bld-gz-01',
    zoneId: 'zone-sd-03-z1',
    territoryId: 'terr-sd-03',
    name: 'Condominio Simón Bolívar',
    address: 'Av. Bolívar #302, Gazcue',
    center: [-69.9042, 18.4705],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.9046, 18.4702],
        [-69.9038, 18.4702],
        [-69.9038, 18.4708],
        [-69.9046, 18.4708],
        [-69.9046, 18.4702]
      ]]
    },
    buildingType: 'RESIDENTIAL_BUILDING',
    floors: 5,
    accessType: 'INTERCOM',
    notes: 'Timbres al frente sobre calle Bolívar.',
    createdAt: '2025-02-15T09:00:00Z',
    updatedAt: '2025-02-15T09:00:00Z'
  },

  // --- BELLA VISTA: SD-04-Z1 ---
  {
    id: 'bld-bv-01',
    zoneId: 'zone-sd-04-z1',
    territoryId: 'terr-sd-04',
    name: 'Torre Bella Vista Park',
    address: 'Av. Sarasota #48, Bella Vista',
    center: [-69.9465, 18.4485],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-69.9469, 18.4482],
        [-69.9461, 18.4482],
        [-69.9461, 18.4488],
        [-69.9469, 18.4488],
        [-69.9469, 18.4482]
      ]]
    },
    buildingType: 'TOWER',
    floors: 12,
    accessType: 'GATE_SECURITY',
    notes: 'Portón eléctrico y vigilancia constante.',
    createdAt: '2025-02-18T10:00:00Z',
    updatedAt: '2025-02-18T10:00:00Z'
  }
];

export const SEED_APARTMENTS: Apartment[] = [
  // Edificio El Conde Real (bld-zc-01) - 8 unidades
  { id: 'apt-zc-01-101', buildingId: 'bld-zc-01', unitNumber: '101', floor: 1, calculatedStatus: 'CONTACTED', lastVisitedAt: '2025-03-01T15:30:00Z' },
  { id: 'apt-zc-01-102', buildingId: 'bld-zc-01', unitNumber: '102', floor: 1, calculatedStatus: 'NO_ANSWER', lastVisitedAt: '2025-03-01T15:35:00Z' },
  { id: 'apt-zc-01-201', buildingId: 'bld-zc-01', unitNumber: '201', floor: 2, calculatedStatus: 'CONTACTED', lastVisitedAt: '2025-03-01T15:40:00Z' },
  { id: 'apt-zc-01-202', buildingId: 'bld-zc-01', unitNumber: '202', floor: 2, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-zc-01-301', buildingId: 'bld-zc-01', unitNumber: '301', floor: 3, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-zc-01-302', buildingId: 'bld-zc-01', unitNumber: '302', floor: 3, calculatedStatus: 'ACCESS_PROBLEM', lastVisitedAt: '2025-03-01T15:45:00Z' },
  { id: 'apt-zc-01-401', buildingId: 'bld-zc-01', unitNumber: '401', floor: 4, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-zc-01-402', buildingId: 'bld-zc-01', unitNumber: '402', floor: 4, calculatedStatus: 'CONTACTED', lastVisitedAt: '2025-03-01T15:50:00Z' },

  // Residencial Las Damas (bld-zc-02) - 6 unidades
  { id: 'apt-zc-02-1', buildingId: 'bld-zc-02', unitNumber: 'Apt 1-A', floor: 1, calculatedStatus: 'CONTACTED', lastVisitedAt: '2025-03-02T10:00:00Z' },
  { id: 'apt-zc-02-2', buildingId: 'bld-zc-02', unitNumber: 'Apt 1-B', floor: 1, calculatedStatus: 'CONTACTED', lastVisitedAt: '2025-03-02T10:05:00Z' },
  { id: 'apt-zc-02-3', buildingId: 'bld-zc-02', unitNumber: 'Apt 2-A', floor: 2, calculatedStatus: 'NO_ANSWER', lastVisitedAt: '2025-03-02T10:10:00Z' },
  { id: 'apt-zc-02-4', buildingId: 'bld-zc-02', unitNumber: 'Apt 2-B', floor: 2, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-zc-02-5', buildingId: 'bld-zc-02', unitNumber: 'Apt 3-A', floor: 3, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-zc-02-6', buildingId: 'bld-zc-02', unitNumber: 'Apt 3-B', floor: 3, calculatedStatus: 'NO_ANSWER', lastVisitedAt: '2025-03-02T10:15:00Z' },

  // Condominio Arzobispo Meriño (bld-zc-03) - 6 unidades
  { id: 'apt-zc-03-1', buildingId: 'bld-zc-03', unitNumber: 'Unidad 1', floor: 1, calculatedStatus: 'CONTACTED', lastVisitedAt: '2025-03-03T11:00:00Z' },
  { id: 'apt-zc-03-2', buildingId: 'bld-zc-03', unitNumber: 'Unidad 2', floor: 1, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-zc-03-3', buildingId: 'bld-zc-03', unitNumber: 'Unidad 3', floor: 2, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-zc-03-4', buildingId: 'bld-zc-03', unitNumber: 'Unidad 4', floor: 2, calculatedStatus: 'NO_ANSWER', lastVisitedAt: '2025-03-03T11:10:00Z' },
  { id: 'apt-zc-03-5', buildingId: 'bld-zc-03', unitNumber: 'Unidad 5', floor: 3, calculatedStatus: 'CONTACTED', lastVisitedAt: '2025-03-03T11:15:00Z' },
  { id: 'apt-zc-03-6', buildingId: 'bld-zc-03', unitNumber: 'Unidad 6', floor: 3, calculatedStatus: 'PENDING', lastVisitedAt: null },

  // Quinta San Antón (bld-zc-04) - 2 unidades
  { id: 'apt-zc-04-1', buildingId: 'bld-zc-04', unitNumber: 'Planta Baja', floor: 1, calculatedStatus: 'NO_ANSWER', lastVisitedAt: '2025-03-04T12:00:00Z' },
  { id: 'apt-zc-04-2', buildingId: 'bld-zc-04', unitNumber: 'Planta Alta', floor: 2, calculatedStatus: 'PENDING', lastVisitedAt: null },

  // Torre Mirador del Ozama (bld-zc-05) - 10 unidades
  { id: 'apt-zc-05-101', buildingId: 'bld-zc-05', unitNumber: '101', floor: 1, calculatedStatus: 'CONTACTED', lastVisitedAt: '2025-03-05T14:00:00Z' },
  { id: 'apt-zc-05-102', buildingId: 'bld-zc-05', unitNumber: '102', floor: 1, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-zc-05-201', buildingId: 'bld-zc-05', unitNumber: '201', floor: 2, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-zc-05-202', buildingId: 'bld-zc-05', unitNumber: '202', floor: 2, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-zc-05-301', buildingId: 'bld-zc-05', unitNumber: '301', floor: 3, calculatedStatus: 'NO_ANSWER', lastVisitedAt: '2025-03-05T14:10:00Z' },
  { id: 'apt-zc-05-302', buildingId: 'bld-zc-05', unitNumber: '302', floor: 3, calculatedStatus: 'CONTACTED', lastVisitedAt: '2025-03-05T14:15:00Z' },

  // Torre Churchill Grand (bld-pt-01) - 8 unidades representativas
  { id: 'apt-pt-01-2a', buildingId: 'bld-pt-01', unitNumber: 'Apt 2-A', floor: 2, calculatedStatus: 'CONTACTED', lastVisitedAt: '2025-03-10T16:00:00Z' },
  { id: 'apt-pt-01-2b', buildingId: 'bld-pt-01', unitNumber: 'Apt 2-B', floor: 2, calculatedStatus: 'ACCESS_PROBLEM', lastVisitedAt: '2025-03-10T16:05:00Z' },
  { id: 'apt-pt-01-3a', buildingId: 'bld-pt-01', unitNumber: 'Apt 3-A', floor: 3, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-pt-01-3b', buildingId: 'bld-pt-01', unitNumber: 'Apt 3-B', floor: 3, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-pt-01-4a', buildingId: 'bld-pt-01', unitNumber: 'Apt 4-A', floor: 4, calculatedStatus: 'NO_ANSWER', lastVisitedAt: '2025-03-10T16:15:00Z' },
  { id: 'apt-pt-01-4b', buildingId: 'bld-pt-01', unitNumber: 'Apt 4-B', floor: 4, calculatedStatus: 'PENDING', lastVisitedAt: null },

  // Residencial Piantini Lux (bld-pt-02)
  { id: 'apt-pt-02-101', buildingId: 'bld-pt-02', unitNumber: '101', floor: 1, calculatedStatus: 'CONTACTED', lastVisitedAt: '2025-03-11T10:00:00Z' },
  { id: 'apt-pt-02-102', buildingId: 'bld-pt-02', unitNumber: '102', floor: 1, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-pt-02-201', buildingId: 'bld-pt-02', unitNumber: '201', floor: 2, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-pt-02-202', buildingId: 'bld-pt-02', unitNumber: '202', floor: 2, calculatedStatus: 'NO_ANSWER', lastVisitedAt: '2025-03-11T10:10:00Z' },

  // Condominio Simón Bolívar (bld-gz-01)
  { id: 'apt-gz-01-1', buildingId: 'bld-gz-01', unitNumber: 'Apt 1-A', floor: 1, calculatedStatus: 'CONTACTED', lastVisitedAt: '2025-03-15T09:30:00Z' },
  { id: 'apt-gz-01-2', buildingId: 'bld-gz-01', unitNumber: 'Apt 1-B', floor: 1, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-gz-01-3', buildingId: 'bld-gz-01', unitNumber: 'Apt 2-A', floor: 2, calculatedStatus: 'NO_ANSWER', lastVisitedAt: '2025-03-15T09:40:00Z' },
  { id: 'apt-gz-01-4', buildingId: 'bld-gz-01', unitNumber: 'Apt 2-B', floor: 2, calculatedStatus: 'PENDING', lastVisitedAt: null },

  // Torre Bella Vista Park (bld-bv-01)
  { id: 'apt-bv-01-1', buildingId: 'bld-bv-01', unitNumber: 'Apt 101', floor: 1, calculatedStatus: 'CONTACTED', lastVisitedAt: '2025-03-18T11:00:00Z' },
  { id: 'apt-bv-01-2', buildingId: 'bld-bv-01', unitNumber: 'Apt 102', floor: 1, calculatedStatus: 'PENDING', lastVisitedAt: null },
  { id: 'apt-bv-01-3', buildingId: 'bld-bv-01', unitNumber: 'Apt 201', floor: 2, calculatedStatus: 'NO_ANSWER', lastVisitedAt: '2025-03-18T11:15:00Z' },
  { id: 'apt-bv-01-4', buildingId: 'bld-bv-01', unitNumber: 'Apt 202', floor: 2, calculatedStatus: 'PENDING', lastVisitedAt: null }
];

export const SEED_VISITS: Visit[] = [
  {
    id: 'vis-01',
    apartmentId: 'apt-zc-01-101',
    buildingId: 'bld-zc-01',
    userId: 'usr-wilker',
    visitedAt: '2025-03-01T15:30:00Z',
    result: 'CONTACTED',
    note: 'Conversación amigable. Solicitó volver en horario de tarde.',
    latitude: 18.4734,
    longitude: -69.8868,
    deviceId: 'dev-android-01',
    operationId: 'op-vis-001',
    createdAt: '2025-03-01T15:30:00Z'
  },
  {
    id: 'vis-02',
    apartmentId: 'apt-zc-01-102',
    buildingId: 'bld-zc-01',
    userId: 'usr-wilker',
    visitedAt: '2025-03-01T15:35:00Z',
    result: 'NO_ANSWER',
    note: 'Timbre sonó pero nadie atendió.',
    latitude: 18.4734,
    longitude: -69.8868,
    deviceId: 'dev-android-01',
    operationId: 'op-vis-002',
    createdAt: '2025-03-01T15:35:00Z'
  },
  {
    id: 'vis-03',
    apartmentId: 'apt-zc-01-201',
    buildingId: 'bld-zc-01',
    userId: 'usr-wilker',
    visitedAt: '2025-03-01T15:40:00Z',
    result: 'CONTACTED',
    note: 'Interesado en lecturas bíblicas los sábados.',
    latitude: 18.4734,
    longitude: -69.8868,
    deviceId: 'dev-android-01',
    operationId: 'op-vis-003',
    createdAt: '2025-03-01T15:40:00Z'
  },
  {
    id: 'vis-04',
    apartmentId: 'apt-zc-01-302',
    buildingId: 'bld-zc-01',
    userId: 'usr-wilker',
    visitedAt: '2025-03-01T15:45:00Z',
    result: 'ACCESS_PROBLEM',
    note: 'Intercomunicador con zumbido no permite comunicación clara.',
    latitude: 18.4734,
    longitude: -69.8868,
    deviceId: 'dev-android-01',
    operationId: 'op-vis-004',
    createdAt: '2025-03-01T15:45:00Z'
  },
  {
    id: 'vis-05',
    apartmentId: 'apt-zc-01-402',
    buildingId: 'bld-zc-01',
    userId: 'usr-wilker',
    visitedAt: '2025-03-01T15:50:00Z',
    result: 'CONTACTED',
    note: 'Breve contacto cordial.',
    latitude: 18.4734,
    longitude: -69.8868,
    deviceId: 'dev-android-01',
    operationId: 'op-vis-005',
    createdAt: '2025-03-01T15:50:00Z'
  }
];

export const SEED_RESTRICTIONS: Restriction[] = [
  {
    id: 'rest-01',
    entityType: 'BUILDING',
    entityId: 'bld-pt-01',
    restrictionType: 'ACCESS_RESTRICTED',
    description: 'Acceso regulado por administración de la torre. Solo visitas previa autorización.',
    active: true,
    createdAt: '2025-02-10T10:00:00Z'
  },
  {
    id: 'rest-02',
    entityType: 'BUILDING',
    entityId: 'bld-zc-01',
    restrictionType: 'INTERCOM_BROKEN',
    description: 'Intercomunicador del piso 3 presenta falla técnica.',
    active: true,
    createdAt: '2025-03-01T16:00:00Z'
  },
  {
    id: 'rest-03',
    entityType: 'BUILDING',
    entityId: 'bld-bv-01',
    restrictionType: 'SPECIFIC_HOURS',
    description: 'Horario recomendado para tocar timbres: 10:00 AM a 12:30 PM.',
    active: true,
    createdAt: '2025-02-18T10:30:00Z'
  }
];
