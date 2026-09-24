import React, { useState, useEffect, useCallback } from 'react';
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
  VisitResult 
} from './types';
import { Navbar } from './components/Navbar';
import { MapView } from './components/MapView';
import { TerritoryTree } from './components/TerritoryTree';
import { DetailPanel } from './components/DetailPanel';
import { LayerControl } from './components/LayerControl';
import { CoverageStatusBar } from './components/CoverageStatusBar';
import { GodsEyeHUD } from './components/GodsEyeHUD';
import { BuildingCreationModal } from './components/BuildingCreationModal';

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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [godsEyeMode, setGodsEyeMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Map state
  const [baseMap, setBaseMap] = useState<BaseMapStyle>('STREETS');
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
    pitch: 45,
    bearing: -15
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
        const initialTerr = terrs[0]; // SD-01
        setActiveTerritory(initialTerr);
        await loadTerritoryData(initialTerr.id);
      }

      const pending = await getPendingSyncCount();
      setPendingSyncCount(pending);
    }
    loadData();
  }, []);

  // Load zones, buildings, and metrics for a territory
  const loadTerritoryData = async (territoryId: string) => {
    const tZones = await getZones(territoryId);
    setZones(tZones);

    const tBuildings = await getBuildings(territoryId);
    setBuildings(tBuildings);

    // Load all apartments for these buildings
    const bIds = tBuildings.map(b => b.id);
    const allApts: Apartment[] = [];
    for (const b of tBuildings) {
      const apts = await getApartments(b.id);
      allApts.push(...apts);
    }
    setApartments(allApts);

    // Calculate coverage
    const cov = await calculateCoverage(territoryId);
    setMetrics(cov);
  };

  // Handle Territory selection
  const handleSelectTerritory = async (t: Territory) => {
    setActiveTerritory(t);
    setSelectedBuilding(null);
    await loadTerritoryData(t.id);
    setFlyToTarget({
      center: t.center,
      zoom: 15.8,
      timestamp: Date.now()
    });
  };

  // Handle Building selection
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

  // Handle Recording a Visit
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

    // Refresh apartments and visits
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

  // Handle Creating a new Building
  const handleSaveBuilding = async (data: any) => {
    const newBld = await createBuildingWithApartments(data);
    if (activeTerritory) {
      await loadTerritoryData(activeTerritory.id);
    }
    const pending = await getPendingSyncCount();
    setPendingSyncCount(pending);
    handleSelectBuilding(newBld);
  };

  // Handle Sync
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await processSyncQueue();
      const pending = await getPendingSyncCount();
      setPendingSyncCount(pending);
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  // Toggle specific layers
  const handleToggleLayer = (key: keyof LayerToggles) => {
    setLayers(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleFlyToLocation = (center: [number, number], zoom = 16.5) => {
    setFlyToTarget({
      center,
      zoom,
      timestamp: Date.now()
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* Top Fixed Navbar */}
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
        onOpenCreateBuilding={() => setCreateModalOpen(true)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* 100% Fullscreen Map Container */}
      <main className="absolute inset-0 pt-14 pb-12 w-full h-full">
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

      {/* Left Collapsible Territorial Tree */}
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
      />

      {/* Right Slide-over Building Detail Panel */}
      <DetailPanel
        building={selectedBuilding}
        apartments={selectedBuildingApartments}
        visits={selectedBuildingVisits}
        restrictions={selectedBuildingRestrictions}
        onClose={() => setSelectedBuilding(null)}
        onRecordVisit={handleRecordVisit}
      />

      {/* Bottom-left Floating Layer Control */}
      <LayerControl
        baseMap={baseMap}
        onChangeBaseMap={setBaseMap}
        layers={layers}
        onToggleLayer={handleToggleLayer}
      />

      {/* Bottom Fixed Status & Coverage Telemetry Bar */}
      <CoverageStatusBar
        activeTerritory={activeTerritory}
        metrics={metrics}
        onOpenCreateBuilding={() => setCreateModalOpen(true)}
        pendingSyncCount={pendingSyncCount}
      />

      {/* New Building Creation Modal */}
      <BuildingCreationModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        activeTerritory={activeTerritory}
        zones={zones}
        mapCenter={mapViewport.center}
        onSaveBuilding={handleSaveBuilding}
      />
    </div>
  );
};

export default App;
