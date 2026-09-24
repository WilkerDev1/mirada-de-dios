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
  DrawMode 
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

export const App: React.FC = () => {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [activeTerritory, setActiveTerritory] = useState<Territory | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedBuildingApartments, setSelectedBuildingApartments] = useState<Apartment[]>([]);
  const [selectedBuildingVisits, setSelectedBuildingVisits] = useState<Visit[]>([]);
  const [selectedBuildingRestrictions, setSelectedBuildingRestrictions] = useState<Restriction[]>([]);

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

  // Map state (Defaults to Google Hybrid for fresh photorealistic aerial + streets)
  const [baseMap, setBaseMap] = useState<BaseMapStyle>('GOOGLE_HYBRID');
  const [drawMode, setDrawMode] = useState<DrawMode>('NONE');
  const [drawnPolygon, setDrawnPolygon] = useState<number[][][] | null>(null);

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
    zoom: 16.2,
    pitch: 40,
    bearing: -10
  });

  const [flyToTarget, setFlyToTarget] = useState<{
    center: [number, number];
    zoom?: number;
    timestamp: number;
  } | null>(null);

  // Initialize data
  useEffect(() => {
    async function loadData() {
      await initDatabase();
      const terrs = await getTerritories();
      setTerritories(terrs);

      if (terrs.length > 0) {
        const initialTerr = terrs[0]; // SD-01 Zona Colonial
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
      zoom: 17.5,
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
  };

  // Handle map drawing completion
  const handleCompleteDrawing = (polygon: number[][][], mode: DrawMode) => {
    setDrawnPolygon(polygon);
    setDrawMode('NONE');

    if (mode === 'DRAW_ZONE') {
      setCreateZoneModalOpen(true);
    } else {
      setCreateBuildingModalOpen(true);
    }
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
  };

  const handleSaveZone = async (data: any) => {
    const newZone = await createZone(data);
    setDrawnPolygon(null);
    if (activeTerritory) {
      await loadTerritoryData(activeTerritory.id);
    }
    const pending = await getPendingSyncCount();
    setPendingSyncCount(pending);
    handleFlyToLocation(newZone.center, 16.5);
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await processSyncQueue();
      const pending = await getPendingSyncCount();
      setPendingSyncCount(pending);
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
      {/* Google Maps Style Floating Search & Action Chips */}
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
          territories={territories}
          activeTerritory={activeTerritory}
          zones={zones}
          buildings={buildings}
          apartments={apartments}
          selectedBuilding={selectedBuilding}
          onSelectBuilding={handleSelectBuilding}
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

      {/* Slide-over Territorial Tree (Folder structure) */}
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

      {/* Responsive Detail Panel (Bottom Sheet on Mobile, Slide-over on Desktop) */}
      <DetailPanel
        building={selectedBuilding}
        apartments={selectedBuildingApartments}
        visits={selectedBuildingVisits}
        restrictions={selectedBuildingRestrictions}
        onClose={() => setSelectedBuilding(null)}
        onRecordVisit={handleRecordVisit}
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

      {/* Compact Bottom Coverage & Telemetry Bar */}
      <CoverageStatusBar
        activeTerritory={activeTerritory}
        metrics={metrics}
        onOpenCreateBuilding={() => {
          setDrawnPolygon(null);
          setCreateBuildingModalOpen(true);
        }}
        pendingSyncCount={pendingSyncCount}
      />

      {/* Modal: Create Building (supports drawn polygon from map) */}
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

      {/* Modal: Create Zone / Residential (with custom color) */}
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
