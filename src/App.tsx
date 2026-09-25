import React, { useState, useEffect } from 'react';
import { 
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
import { LayerControl } from './components/LayerControl';
import { CoverageStatusBar } from './components/CoverageStatusBar';
import { GodsEyeHUD } from './components/GodsEyeHUD';
import { BuildingCreationModal } from './components/BuildingCreationModal';
import { ZoneCreationModal } from './components/ZoneCreationModal';
import { CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [activeTerritory, setActiveTerritory] = useState<Territory | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedBuildingApartments, setSelectedBuildingApartments] = useState<Apartment[]>([]);
  const [selectedBuildingVisits, setSelectedBuildingVisits] = useState<Visit[]>([]);
  const [selectedBuildingRestrictions, setSelectedBuildingRestrictions] = useState<Restriction[]>([]);

  // Mode and drawing state
  const [appMode, setAppMode] = useState<AppMode>('BUILDINGS');
  const [drawMode, setDrawMode] = useState<DrawMode>('NONE');
  const [drawnPolygon, setDrawnPolygon] = useState<number[][][] | null>(null);

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
  const [createBuildingModalOpen, setCreateBuildingModalOpen] = useState(false);
  const [createZoneModalOpen, setCreateZoneModalOpen] = useState(false);
  const [layerControlOpen, setLayerControlOpen] = useState(false);
  const [godsEyeMode, setGodsEyeMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Map state
  const [baseMap, setBaseMap] = useState<BaseMapStyle>('GOOGLE_HYBRID');

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
    pitch: 35,
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

  useEffect(() => {
    async function loadData() {
      await initDatabase();
      const terrs = await getTerritories();
      setTerritories(terrs);

      if (terrs.length > 0) {
        const initialTerr = terrs[0]; // SD-01
        setActiveTerritory(initialTerr);
        await loadTerritoryData(initialTerr.id);
      }

      const pending = await getPendingSyncCount();
      setPendingSyncCount(pending);
    }
    loadData();
  }, []);

  const loadTerritoryData = async (territoryId: string) => {
    const tZones = await getZones(territoryId);
    setZones(tZones);

    const tBuildings = await getBuildings(territoryId);
    setBuildings(tBuildings);

    const allApts: Apartment[] = [];
    for (const b of tBuildings) {
      const apts = await getApartments(b.id);
      allApts.push(...apts);
    }
    setApartments(allApts);

    const cov = await calculateCoverage(territoryId);
    setMetrics(cov);
  };

  const handleSelectTerritory = async (t: Territory) => {
    setActiveTerritory(t);
    setSelectedBuilding(null);
    setSelectedZone(null);
    await loadTerritoryData(t.id);
    setFlyToTarget({
      center: t.center,
      zoom: 15.5,
      timestamp: Date.now()
    });
  };

  const handleSelectBuilding = async (building: Building) => {
    setSelectedBuilding(building);
    const apts = await getApartments(building.id);
    setSelectedBuildingApartments(apts);
    const vists = await getBuildingVisits(building.id);
    setSelectedBuildingVisits(vists);
    const rests = await getBuildingRestrictions(building.id);
    setSelectedBuildingRestrictions(rests);

    setFlyToTarget({
      center: building.center,
      zoom: 18,
      timestamp: Date.now()
    });
  };

  const handleSelectZone = (zone: Zone) => {
    setSelectedZone(zone);
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

    if (activeTerritory) {
      await loadTerritoryData(activeTerritory.id);
    }

    const pending = await getPendingSyncCount();
    setPendingSyncCount(pending);
    showToast('✓ Visita registrada en historial inmutable');
  };

  // Instant Quick-Create when drawing finishes!
  const handleCompleteDrawing = async (polygon: number[][][], mode: DrawMode) => {
    setDrawnPolygon(polygon);
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
      // Instant Quick-Create Building directly on the map!
      if (!activeTerritory) return;
      const defaultZone = selectedZone || zones[0];
      if (!defaultZone) {
        showToast('Debes crear primero un residencial o zona');
        setCreateBuildingModalOpen(true);
        return;
      }

      const newBuildingNumber = buildings.length + 1;
      const newBuilding = await createBuildingWithApartments({
        zoneId: defaultZone.id,
        territoryId: activeTerritory.id,
        name: `Edificio #${newBuildingNumber}`,
        address: `Sector ${defaultZone.name}`,
        center,
        polygonCoordinates: polygon,
        buildingType: 'RESIDENTIAL_BUILDING',
        floors: 3,
        accessType: 'INTERCOM',
        unitsPerFloor: 2
      });

      await loadTerritoryData(activeTerritory.id);
      const pending = await getPendingSyncCount();
      setPendingSyncCount(pending);

      // Instantly select the newly created building so the user can inspect or edit it
      handleSelectBuilding(newBuilding);
      showToast('✓ ¡Edificio creado en el mapa! Toca para editar detalles o registrar visitas.');

    } else if (mode === 'DRAW_ZONE_BOX' || mode === 'DRAW_ZONE_POLYGON') {
      // Open quick Residential modal with coordinates already locked in
      setCreateZoneModalOpen(true);
    } else if (mode === 'DRAW_TERRITORY_POLYGON') {
      // Quick create territory
      const terrCode = `SD-0${territories.length + 1}`;
      const newTerr = await createTerritory({
        congregationId: 'cong-sd-01',
        name: `Territorio ${terrCode}`,
        code: terrCode,
        center,
        polygonCoordinates: polygon
      });
      const terrs = await getTerritories();
      setTerritories(terrs);
      setActiveTerritory(newTerr);
      await loadTerritoryData(newTerr.id);
      showToast(`✓ Territorio ${terrCode} creado con éxito`);
    }
  };

  const handleUpdateBuilding = async (buildingId: string, updates: Partial<Building>) => {
    await updateBuilding(buildingId, updates);
    if (activeTerritory) {
      await loadTerritoryData(activeTerritory.id);
    }
    if (selectedBuilding && selectedBuilding.id === buildingId) {
      setSelectedBuilding(prev => prev ? { ...prev, ...updates } : null);
    }
    showToast('✓ Datos del edificio actualizados');
  };

  const handleSaveBuilding = async (data: any) => {
    const newBld = await createBuildingWithApartments(data);
    setDrawnPolygon(null);
    if (activeTerritory) {
      await loadTerritoryData(activeTerritory.id);
    }
    const pending = await getPendingSyncCount();
    setPendingSyncCount(pending);
    handleSelectBuilding(newBld);
    showToast('✓ Edificio guardado');
  };

  const handleSaveZone = async (data: any) => {
    const newZone = await createZone(data);
    setDrawnPolygon(null);
    if (activeTerritory) {
      await loadTerritoryData(activeTerritory.id);
    }
    const pending = await getPendingSyncCount();
    setPendingSyncCount(pending);
    handleSelectZone(newZone);
    showToast(`✓ Residencial ${newZone.name} registrado`);
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await processSyncQueue();
      const pending = await getPendingSyncCount();
      setPendingSyncCount(pending);
      showToast('✓ Base de datos sincronizada localmente');
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
        onSelectAppMode={setAppMode}
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
        onOpenCreateZone={() => setCreateZoneModalOpen(true)}
      />

      {/* Bottom Sheet Building Details & Editing */}
      <DetailPanel
        building={selectedBuilding}
        apartments={selectedBuildingApartments}
        visits={selectedBuildingVisits}
        restrictions={selectedBuildingRestrictions}
        onClose={() => setSelectedBuilding(null)}
        onRecordVisit={handleRecordVisit}
        onUpdateBuilding={handleUpdateBuilding}
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
          setDrawnPolygon(null);
          setCreateBuildingModalOpen(true);
        }}
        pendingSyncCount={pendingSyncCount}
      />

      {/* Modal: Create Building Manually */}
      <BuildingCreationModal
        isOpen={createBuildingModalOpen}
        onClose={() => {
          setCreateBuildingModalOpen(false);
          setDrawnPolygon(null);
        }}
        activeTerritory={activeTerritory}
        zones={zones}
        mapCenter={mapViewport.center}
        initialPolygon={drawnPolygon}
        onSaveBuilding={handleSaveBuilding}
      />

      {/* Modal: Create Zone / Residential */}
      <ZoneCreationModal
        isOpen={createZoneModalOpen}
        onClose={() => {
          setCreateZoneModalOpen(false);
          setDrawnPolygon(null);
        }}
        activeTerritory={activeTerritory}
        polygonCoordinates={drawnPolygon || [[
          [-69.8880, 18.4730],
          [-69.8840, 18.4730],
          [-69.8840, 18.4760],
          [-69.8880, 18.4760],
          [-69.8880, 18.4730]
        ]]}
        onSaveZone={handleSaveZone}
      />
    </div>
  );
};

export default App;
