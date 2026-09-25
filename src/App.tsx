import React, { useState, useEffect } from 'react';
import { 
  db,
  initDatabase, 
  getTerritories, 
  getZones, 
  getBuildings, 
  getApartments, 
  getBuildingVisits, 
  getBuildingRestrictions, 
  recordVisit, 
  createBuildingWithApartments, 
  createZone, 
  createTerritory, 
  updateBuilding, 
  updateZone, 
  updateTerritory, 
  deleteBuilding, 
  deleteZone, 
  deleteTerritory, 
  createApartment,
  deleteApartment,
  updateApartment,
  calculateCoverage, 
  getPendingSyncCount, 
  processSyncQueue 
} from './db';
import { 
  Territory, 
  Zone, 
  Building, 
  Apartment, 
  Visit, 
  Restriction, 
  CoverageMetrics, 
  BaseMapStyle, 
  LayerToggles, 
  VisitResult, 
  DrawMode, 
  AppMode 
} from './types';
import { Navbar } from './components/Navbar';
import { MapView } from './components/MapView';
import { TerritoryTree } from './components/TerritoryTree';
import { DetailPanel } from './components/DetailPanel';
import { ZoneSheet } from './components/ZoneSheet';
import { TerritorySheet } from './components/TerritorySheet';
import { LayerControl } from './components/LayerControl';
import { CoverageStatusBar } from './components/CoverageStatusBar';
import { GodsEyeHUD } from './components/GodsEyeHUD';
import { CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [activeTerritory, setActiveTerritory] = useState<Territory | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);

  // Selected Entities
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);

  const [selectedBuildingApartments, setSelectedBuildingApartments] = useState<Apartment[]>([]);
  const [selectedBuildingVisits, setSelectedBuildingVisits] = useState<Visit[]>([]);
  const [selectedBuildingRestrictions, setSelectedBuildingRestrictions] = useState<Restriction[]>([]);

  // Mode and drawing state
  const [appMode, setAppMode] = useState<AppMode>('BUILDINGS');
  const [drawMode, setDrawMode] = useState<DrawMode>('NONE');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Coverage metrics
  const [metrics, setMetrics] = useState<CoverageMetrics>({
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
  });

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [layerControlOpen, setLayerControlOpen] = useState(false);
  const [godsEyeMode, setGodsEyeMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Map state (Flat 2D by default: pitch 0 on Google Streets)
  const [baseMap, setBaseMap] = useState<BaseMapStyle>('GOOGLE_STREETS');

  const [layers, setLayers] = useState<LayerToggles>({
    territorial: true,
    buildings: true,
    preachingStatus: true,
    restrictions: true,
    infrastructure: false,
    godsEyeTelemetry: true,
    threeDBuildings: true
  });

  const [mapViewport, setMapViewport] = useState<{
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
  }>({
    center: [-69.8860, 18.4740],
    zoom: 16.5,
    pitch: 0, // Flat 2D by default
    bearing: 0
  });

  const [flyToTarget, setFlyToTarget] = useState<{
    center: [number, number];
    zoom?: number;
    timestamp: number;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllData = async (targetTerritoryId?: string) => {
    // 1. Load all territories
    const allTerrs = await getTerritories();
    setTerritories(allTerrs);

    // 2. Load ALL zones across the entire map
    const allZones = await getZones();
    setZones(allZones);

    // 3. Load ALL buildings across the entire map so everything drawn is immediately visible!
    const allBuildings = await getBuildings();
    setBuildings(allBuildings);

    // 4. Load all apartments
    const allApts = await db.apartments.toArray();
    setApartments(allApts.filter((a: Apartment) => !a.archivedAt));

    // 5. Calculate coverage metrics
    const terrId = targetTerritoryId || activeTerritory?.id || allTerrs[0]?.id;
    if (terrId) {
      const cov = await calculateCoverage(terrId);
      setMetrics(cov);
    }
  };

  useEffect(() => {
    async function loadData() {
      await initDatabase();
      const terrs = await getTerritories();
      setTerritories(terrs);

      if (terrs.length > 0) {
        const initialTerr = terrs[0];
        setActiveTerritory(initialTerr);
        await loadAllData(initialTerr.id);
      } else {
        await loadAllData();
      }

      const pending = await getPendingSyncCount();
      setPendingSyncCount(pending);
    }
    loadData();
  }, []);

  const handleSelectTerritory = async (t: Territory) => {
    setActiveTerritory(t);
    setSelectedTerritory(t);
    setSelectedBuilding(null);
    setSelectedZone(null);
    await loadAllData(t.id);
    setFlyToTarget({
      center: t.center,
      zoom: 15.5,
      timestamp: Date.now()
    });
  };

  const handleSelectBuilding = async (building: Building) => {
    setSelectedBuilding(building);
    setSelectedZone(null);
    setSelectedTerritory(null);
    const apts = await getApartments(building.id);
    setSelectedBuildingApartments(apts);
    const vists = await getBuildingVisits(building.id);
    setSelectedBuildingVisits(vists);
    const rests = await getBuildingRestrictions(building.id);
    setSelectedBuildingRestrictions(rests);

    setFlyToTarget({
      center: building.center,
      zoom: 18.5,
      timestamp: Date.now()
    });
  };

  const handleSelectZone = (zone: Zone) => {
    setSelectedZone(zone);
    setSelectedBuilding(null);
    setSelectedTerritory(null);
    showToast(`Residencial seleccionado: ${zone.name}`);
    setFlyToTarget({
      center: zone.center,
      zoom: 16.5,
      timestamp: Date.now()
    });
  };

  const handleRecordVisit = async (data: {
    apartmentId: string;
    buildingId: string;
    result: VisitResult;
    note?: string;
  }) => {
    await recordVisit({
      ...data,
      latitude: selectedBuilding?.center[1],
      longitude: selectedBuilding?.center[0],
      userId: 'usr-wilker'
    });

    if (selectedBuilding) {
      const apts = await getApartments(selectedBuilding.id);
      setSelectedBuildingApartments(apts);
      const vists = await getBuildingVisits(selectedBuilding.id);
      setSelectedBuildingVisits(vists);
    }

    await loadAllData();

    const pending = await getPendingSyncCount();
    setPendingSyncCount(pending);
    showToast('✓ Visita registrada');
  };

  // Google Maps Style Fast Drawing Creation: instant save without opening modals!
  const handleCompleteDrawing = async (polygon: number[][][], mode: DrawMode) => {
    setDrawMode('NONE');

    // Calculate center
    const ring = polygon[0];
    let sumLon = 0;
    let sumLat = 0;
    ring.forEach(pt => {
      sumLon += pt[0];
      sumLat += pt[1];
    });
    const center: [number, number] = [sumLon / ring.length, sumLat / ring.length];

    if (mode === 'DRAW_BUILDING_BOX' || mode === 'DRAW_BUILDING_POLYGON') {
      const newBuildingNumber = buildings.length + 1;
      const assignedZoneId = selectedZone?.id || zones[0]?.id || 'zone-general';
      const assignedTerritoryId = activeTerritory?.id || 'terr-general';
      const zoneName = selectedZone?.name || zones[0]?.name || 'Área Libre';

      const newBuilding = await createBuildingWithApartments({
        zoneId: assignedZoneId,
        territoryId: assignedTerritoryId,
        name: `Edificio #${newBuildingNumber}`,
        address: `Sector ${zoneName}`,
        center,
        polygonCoordinates: polygon,
        buildingType: 'RESIDENTIAL_BUILDING',
        floors: 3,
        accessType: 'INTERCOM',
        unitsPerFloor: 2,
        color: '#0d9488'
      });

      await loadAllData();
      const pending = await getPendingSyncCount();
      setPendingSyncCount(pending);

      // Do NOT open any modal or sheet automatically - keep screen clear for rapid creation!
      setSelectedBuilding(null);
      setSelectedZone(null);
      setSelectedTerritory(null);
      showToast(`✓ Edificio #${newBuildingNumber} creado. Tócalo para editar.`);

    } else if (mode === 'DRAW_ZONE_BOX' || mode === 'DRAW_ZONE_POLYGON') {
      const zoneNum = zones.length + 1;
      const assignedTerritoryId = activeTerritory?.id || 'terr-general';

      const newZone = await createZone({
        territoryId: assignedTerritoryId,
        name: `Residencial #${zoneNum}`,
        code: `RES-0${zoneNum}`,
        color: '#6366f1',
        center,
        polygonCoordinates: polygon
      });

      await loadAllData();
      // Do NOT open any modal or sheet automatically!
      setSelectedBuilding(null);
      setSelectedZone(null);
      setSelectedTerritory(null);
      showToast(`✓ Residencial #${zoneNum} creado. Tócalo para editar.`);

    } else if (mode === 'DRAW_TERRITORY_POLYGON') {
      const terrCode = `SD-0${territories.length + 1}`;
      const newTerr = await createTerritory({
        congregationId: 'cong-sd-01',
        name: `Territorio ${terrCode}`,
        code: terrCode,
        color: '#0284c7',
        center,
        polygonCoordinates: polygon
      });

      await loadAllData();
      // Do NOT open any modal or sheet automatically!
      setSelectedBuilding(null);
      setSelectedZone(null);
      setSelectedTerritory(null);
      showToast(`✓ Territorio ${terrCode} creado. Tócalo para editar.`);
    }
  };

  const handleUpdateBuilding = async (buildingId: string, updates: Partial<Building>) => {
    await updateBuilding(buildingId, updates);
    await loadAllData();
    if (selectedBuilding && selectedBuilding.id === buildingId) {
      setSelectedBuilding(prev => prev ? { ...prev, ...updates } : null);
    }
    showToast('✓ Edificio actualizado');
  };

  const handleDeleteBuilding = async (buildingId: string) => {
    await deleteBuilding(buildingId);
    await loadAllData();
    setSelectedBuilding(null);
    showToast('✓ Edificio eliminado');
  };

  const handleUpdateZone = async (zoneId: string, updates: Partial<Zone>) => {
    await updateZone(zoneId, updates);
    await loadAllData();
    if (selectedZone && selectedZone.id === zoneId) {
      setSelectedZone(prev => prev ? { ...prev, ...updates } : null);
    }
    showToast('✓ Residencial actualizado');
  };

  const handleDeleteZone = async (zoneId: string) => {
    await deleteZone(zoneId);
    await loadAllData();
    setSelectedZone(null);
    showToast('✓ Residencial eliminado');
  };

  const handleUpdateTerritory = async (territoryId: string, updates: Partial<Territory>) => {
    await updateTerritory(territoryId, updates);
    await loadAllData();
    if (selectedTerritory && selectedTerritory.id === territoryId) {
      setSelectedTerritory(prev => prev ? { ...prev, ...updates } : null);
    }
    showToast('✓ Territorio actualizado');
  };

  const handleDeleteTerritory = async (territoryId: string) => {
    await deleteTerritory(territoryId);
    const terrs = await getTerritories();
    setTerritories(terrs);
    if (activeTerritory && activeTerritory.id === territoryId) {
      if (terrs.length > 0) {
        setActiveTerritory(terrs[0]);
      } else {
        setActiveTerritory(null);
      }
    }
    await loadAllData();
    setSelectedTerritory(null);
    showToast('✓ Territorio eliminado');
  };

  const handleCreateApartment = async (data: { buildingId: string; unitNumber: string; floor: number; notes?: string }) => {
    try {
      await createApartment(data);
      const apts = await getApartments(data.buildingId);
      setSelectedBuildingApartments(apts);
      await loadAllData();
      showToast(`✓ Apto ${data.unitNumber} agregado`);
    } catch (e) {
      console.error('Error creating apartment:', e);
      showToast('Error al crear apartamento');
    }
  };

  const handleDeleteApartment = async (apartmentId: string, buildingId: string) => {
    try {
      await deleteApartment(apartmentId);
      const apts = await getApartments(buildingId);
      setSelectedBuildingApartments(apts);
      await loadAllData();
      showToast('✓ Apartamento eliminado');
    } catch (e) {
      console.error('Error deleting apartment:', e);
      showToast('Error al eliminar apartamento');
    }
  };

  const handleUpdateApartment = async (apartmentId: string, buildingId: string, updates: Partial<Apartment>) => {
    try {
      await updateApartment(apartmentId, updates);
      const apts = await getApartments(buildingId);
      setSelectedBuildingApartments(apts);
      await loadAllData();
      showToast('✓ Apartamento actualizado');
    } catch (e) {
      console.error('Error updating apartment:', e);
      showToast('Error al actualizar apartamento');
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await processSyncQueue();
      const pending = await getPendingSyncCount();
      setPendingSyncCount(pending);
      showToast('✓ Sincronizado');
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const handleToggleLayer = (key: keyof LayerToggles) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFlyToLocation = (center: [number, number], zoom = 16.5) => {
    setFlyToTarget({
      center,
      zoom,
      timestamp: Date.now()
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 sm:top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-2xl bg-teal-600/95 backdrop-blur-xl border border-teal-400 text-white font-semibold text-xs shadow-2xl animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Google Maps Style Header with Safe Area Top Margin */}
      <Navbar
        territories={territories}
        activeTerritory={activeTerritory}
        onSelectTerritory={handleSelectTerritory}
        zones={zones}
        buildings={buildings}
        onFlyToLocation={handleFlyToLocation}
        pendingSyncCount={pendingSyncCount}
        isSyncing={isSyncing}
        onTriggerSync={handleTriggerSync}
        godsEyeMode={godsEyeMode}
        onToggleGodsEyeMode={() => setGodsEyeMode(!godsEyeMode)}
        appMode={appMode}
        onSelectAppMode={(mode) => {
          setAppMode(mode);
          setDrawMode('NONE');
          if (mode === 'TERRITORIES' && activeTerritory) {
            setSelectedTerritory(activeTerritory);
            setSelectedZone(null);
            setSelectedBuilding(null);
          }
        }}
        onSetDrawMode={setDrawMode}
        currentDrawMode={drawMode}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onOpenLayerControl={() => setLayerControlOpen(!layerControlOpen)}
      />

      {/* 100% Fullscreen Map Container */}
      <main className="absolute inset-0 w-full h-full pb-11">
        <MapView
          baseMap={godsEyeMode ? 'GODS_EYE_DARK' : baseMap}
          layers={layers}
          appMode={appMode}
          territories={territories}
          activeTerritory={activeTerritory}
          zones={zones}
          buildings={buildings}
          apartments={apartments}
          selectedBuilding={selectedBuilding}
          selectedZone={selectedZone}
          onSelectBuilding={handleSelectBuilding}
          onSelectZone={handleSelectZone}
          onSelectTerritory={(t) => {
            setSelectedTerritory(t);
            setSelectedZone(null);
            setSelectedBuilding(null);
          }}
          onViewportChange={setMapViewport}
          flyToLocation={flyToTarget}
          drawMode={drawMode}
          onCompleteDrawing={handleCompleteDrawing}
          onCancelDrawing={() => setDrawMode('NONE')}
        />
      </main>

      {/* God's Eye Recon HUD Overlay */}
      <GodsEyeHUD
        active={godsEyeMode}
        mapCenter={mapViewport.center}
        zoom={mapViewport.zoom}
        pitch={mapViewport.pitch}
        bearing={mapViewport.bearing}
        territoryCode={activeTerritory ? activeTerritory.code : 'SD-01'}
      />

      {/* Territorial Structure Drawer */}
      <TerritoryTree
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTerritory={activeTerritory}
        zones={zones}
        buildings={buildings}
        apartments={apartments}
        selectedBuildingId={selectedBuilding?.id || null}
        onSelectBuilding={handleSelectBuilding}
        onFlyToZone={(z) => handleFlyToLocation(z.center, 16.5)}
        onOpenCreateZone={() => {
          setAppMode('ZONES');
          setDrawMode('DRAW_ZONE_BOX');
          showToast('Dibuja un cuadro en el mapa para el nuevo residencial');
        }}
      />

      {/* Google Maps Bottom Sheet: Building Details, Visits & Color Customization */}
      <DetailPanel
        building={selectedBuilding}
        apartments={selectedBuildingApartments}
        visits={selectedBuildingVisits}
        restrictions={selectedBuildingRestrictions}
        zones={zones}
        onClose={() => setSelectedBuilding(null)}
        onRecordVisit={handleRecordVisit}
        onUpdateBuilding={handleUpdateBuilding}
        onDeleteBuilding={handleDeleteBuilding}
        onFlyToBuilding={(b) => handleFlyToLocation(b.center, 18.5)}
        onCreateApartment={handleCreateApartment}
        onDeleteApartment={handleDeleteApartment}
        onUpdateApartment={handleUpdateApartment}
      />

      {/* Google Maps Bottom Sheet: Zone / Residential Details & Color Customization */}
      <ZoneSheet
        zone={selectedZone}
        territory={activeTerritory}
        buildingsInZone={buildings.filter(b => b.zoneId === selectedZone?.id)}
        onClose={() => setSelectedZone(null)}
        onUpdateZone={handleUpdateZone}
        onDeleteZone={handleDeleteZone}
        onFlyToZone={(z) => handleFlyToLocation(z.center, 16.5)}
        onStartDrawBuildingInZone={(z) => {
          setSelectedZone(z);
          setAppMode('BUILDINGS');
          setDrawMode('DRAW_BUILDING_BOX');
          showToast(`Dibuja un edificio en ${z.name}`);
        }}
        onSelectBuilding={handleSelectBuilding}
      />

      {/* Google Maps Bottom Sheet: Territory Details & Color Customization */}
      <TerritorySheet
        territory={selectedTerritory}
        zonesInTerritory={zones.filter(z => z.territoryId === selectedTerritory?.id)}
        buildingsInTerritory={buildings.filter(b => b.territoryId === selectedTerritory?.id)}
        metrics={metrics}
        onClose={() => setSelectedTerritory(null)}
        onUpdateTerritory={handleUpdateTerritory}
        onDeleteTerritory={handleDeleteTerritory}
        onFlyToTerritory={(t) => handleFlyToLocation(t.center, 15.5)}
        onStartDrawZone={() => {
          setAppMode('ZONES');
          setDrawMode('DRAW_ZONE_BOX');
          showToast('Dibuja un cuadro en el mapa para el nuevo residencial');
        }}
        onSelectZone={handleSelectZone}
      />

      {/* Floating Layer Control with Google Maps Styles */}
      <LayerControl
        baseMap={baseMap}
        onChangeBaseMap={setBaseMap}
        layers={layers}
        onToggleLayer={handleToggleLayer}
        isOpen={layerControlOpen}
        onToggleOpen={() => setLayerControlOpen(!layerControlOpen)}
      />

      {/* Bottom Status & Coverage Telemetry Bar */}
      <CoverageStatusBar
        activeTerritory={activeTerritory}
        metrics={metrics}
        onOpenCreateBuilding={() => {
          setAppMode('BUILDINGS');
          setDrawMode('DRAW_BUILDING_BOX');
          showToast('Toca 2 esquinas en el mapa para crear el edificio');
        }}
        pendingSyncCount={pendingSyncCount}
      />
    </div>
  );
};

export default App;
