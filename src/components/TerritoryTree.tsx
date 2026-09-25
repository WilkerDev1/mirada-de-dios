import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Building2, 
  Folder, 
  FolderOpen,
  MapPin, 
  X, 
  Search,
  Layers,
  GripVertical,
  Link2,
  FolderTree,
  ArrowRight,
  Info
} from 'lucide-react';
import { Territory, Zone, Building, Apartment } from '../types';

interface TerritoryTreeProps {
  isOpen: boolean;
  onClose: () => void;
  territories?: Territory[];
  activeTerritory: Territory | null;
  zones: Zone[];
  buildings: Building[];
  apartments: Apartment[];
  selectedBuildingId: string | null;
  onSelectBuilding: (building: Building) => void;
  onSelectTerritory?: (territory: Territory) => void;
  onSelectZone?: (zone: Zone) => void;
  onFlyToTerritory?: (territory: Territory) => void;
  onFlyToZone: (zone: Zone) => void;
  onFlyToBuilding?: (building: Building) => void;
  onOpenCreateZone: () => void;
  onMoveZoneToTerritory?: (zoneId: string, territoryId: string) => Promise<void>;
  onMoveBuildingToZone?: (buildingId: string, zoneId: string) => Promise<void>;
}

export const TerritoryTree: React.FC<TerritoryTreeProps> = ({
  isOpen,
  onClose,
  territories = [],
  activeTerritory,
  zones,
  buildings,
  apartments,
  selectedBuildingId,
  onSelectBuilding,
  onSelectTerritory,
  onSelectZone,
  onFlyToTerritory,
  onFlyToZone,
  onFlyToBuilding,
  onOpenCreateZone,
  onMoveZoneToTerritory,
  onMoveBuildingToZone
}) => {
  const [expandedTerritories, setExpandedTerritories] = useState<Record<string, boolean>>({
    [activeTerritory?.id || 'terr-general']: true
  });
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});
  const [filterQuery, setFilterQuery] = useState('');

  // Drag and Drop state
  const [draggingItem, setDraggingItem] = useState<{
    type: 'ZONE' | 'BUILDING';
    id: string;
    name: string;
  } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    type: 'TERRITORY' | 'ZONE';
    id: string;
  } | null>(null);

  // Quick Move Touch Modal state (for touchscreens where dragging is hard)
  const [quickMoveItem, setQuickMoveItem] = useState<{
    type: 'ZONE' | 'BUILDING';
    id: string;
    name: string;
  } | null>(null);

  if (!isOpen) return null;

  const toggleTerritory = (terrId: string) => {
    setExpandedTerritories(prev => ({
      ...prev,
      [terrId]: !prev[terrId]
    }));
  };

  const toggleZone = (zoneId: string) => {
    setExpandedZones(prev => ({
      ...prev,
      [zoneId]: !prev[zoneId]
    }));
  };

  const getBuildingPendingCount = (buildingId: string) => {
    const bApartments = apartments.filter(a => a.buildingId === buildingId);
    return bApartments.filter(a => a.calculatedStatus === 'PENDING' || a.calculatedStatus === 'UNVISITED').length;
  };

  // Drag events
  const handleDragStart = (e: React.DragEvent, type: 'ZONE' | 'BUILDING', id: string, name: string) => {
    setDraggingItem({ type, id, name });
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingItem(null);
    setDragOverTarget(null);
  };

  const handleDropOnTerritory = async (e: React.DragEvent, territoryId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
    if (!draggingItem || !onMoveZoneToTerritory) return;

    if (draggingItem.type === 'ZONE') {
      await onMoveZoneToTerritory(draggingItem.id, territoryId);
      // Auto expand target territory
      setExpandedTerritories(prev => ({ ...prev, [territoryId]: true }));
    }
    setDraggingItem(null);
  };

  const handleDropOnZone = async (e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
    if (!draggingItem || !onMoveBuildingToZone) return;

    if (draggingItem.type === 'BUILDING') {
      await onMoveBuildingToZone(draggingItem.id, zoneId);
      // Auto expand target zone
      setExpandedZones(prev => ({ ...prev, [zoneId]: true }));
    }
    setDraggingItem(null);
  };

  // List of all territories (or active territory fallback)
  const displayTerritories = territories.length > 0 ? territories : (activeTerritory ? [activeTerritory] : []);

  // Find unassigned / floating zones and buildings
  const unassignedZones = zones.filter(z => !territories.some(t => t.id === z.territoryId));
  const unassignedBuildings = buildings.filter(b => !zones.some(z => z.id === b.zoneId));

  return (
    <>
      {/* Mobile Backdrop Overlay (only on mobile screens) */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-40 md:hidden transition-opacity" 
      />

      <aside className="fixed top-0 bottom-0 left-0 w-84 sm:w-96 max-w-[88vw] z-50 md:z-30 md:top-20 md:bottom-14 md:left-4 md:w-96 md:rounded-2xl md:border md:border-slate-800 md:shadow-2xl flex flex-col bg-slate-950/98 backdrop-blur-2xl border-r border-slate-800 shadow-2xl text-slate-200 select-none animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 pt-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-teal-400 font-mono-tactical font-semibold">
                Territory Manager
              </div>
              <div className="font-bold text-sm text-slate-100 truncate mt-0.5">
                Estructura por Carpetas
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tip / Helper Banner */}
        <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400 leading-tight">
          <Info className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <span>Arrastra o pulsa <strong className="text-teal-300">⇄</strong> para enlazar residenciales a territorios o edificios a zonas.</span>
        </div>

        {/* Filter search & Quick Add Zone */}
        <div className="p-3 border-b border-slate-800/80 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Buscar territorio, residencial o edificio..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-teal-500 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenCreateZone();
            }}
            className="w-full py-1.5 px-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-98"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>+ Nuevo Residencial / Zona</span>
          </button>
        </div>

        {/* Folder Dock Tree Content */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 overscroll-contain">
          {displayTerritories.map(terr => {
            const terrZones = zones.filter(z => z.territoryId === terr.id);
            const isTerrExpanded = expandedTerritories[terr.id] ?? true;
            const isTerrDropTarget = dragOverTarget?.type === 'TERRITORY' && dragOverTarget?.id === terr.id;

            return (
              <div 
                key={terr.id}
                onDragOver={(e) => {
                  if (draggingItem?.type === 'ZONE') {
                    e.preventDefault();
                    setDragOverTarget({ type: 'TERRITORY', id: terr.id });
                  }
                }}
                onDragLeave={() => {
                  if (dragOverTarget?.id === terr.id) setDragOverTarget(null);
                }}
                onDrop={(e) => handleDropOnTerritory(e, terr.id)}
                className={`rounded-2xl border transition-all ${
                  isTerrDropTarget 
                    ? 'border-teal-400 bg-teal-500/20 ring-2 ring-teal-400/50 shadow-lg' 
                    : 'border-slate-800/90 bg-slate-900/60'
                }`}
              >
                {/* Territory Folder Header */}
                <div className="flex items-center justify-between p-2.5 hover:bg-slate-800/50 cursor-pointer transition-colors group rounded-t-2xl">
                  <div 
                    className="flex items-center gap-2 flex-1 truncate"
                    onClick={() => toggleTerritory(terr.id)}
                  >
                    {isTerrExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}

                    {isTerrExpanded ? (
                      <FolderOpen className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    ) : (
                      <Folder className="w-4 h-4 text-teal-400 flex-shrink-0" />
                    )}

                    <div className="truncate">
                      <span className="text-xs font-bold text-slate-100 truncate block">
                        {terr.name}
                      </span>
                      <span className="text-[10px] text-teal-400 font-mono-tactical">
                        {terr.code} · {terrZones.length} residenciales
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-2">
                    {onFlyToTerritory && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFlyToTerritory(terr);
                          onClose();
                        }}
                        className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-teal-300 transition-colors"
                        title="Ver territorio en mapa"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Drop Zone Highlight Hint */}
                {isTerrDropTarget && (
                  <div className="py-1 px-3 text-[10px] font-bold text-teal-300 bg-teal-500/30 border-t border-teal-500/40 text-center animate-pulse">
                    Soltar aquí para enlazar a {terr.name}
                  </div>
                )}

                {/* Sub-Folders: Zones / Residenciales inside Territory */}
                {isTerrExpanded && (
                  <div className="p-1.5 space-y-1.5 border-t border-slate-800/60 bg-slate-950/40">
                    {terrZones.length === 0 ? (
                      <div className="text-[11px] text-slate-500 py-2 pl-6 italic">
                        Sin residenciales. Arrastra uno aquí para enlazarlo.
                      </div>
                    ) : (
                      terrZones.map(zone => {
                        const zoneBuildings = buildings.filter(b => 
                          b.zoneId === zone.id && 
                          (filterQuery === '' || 
                           b.name.toLowerCase().includes(filterQuery.toLowerCase()) || 
                           b.address.toLowerCase().includes(filterQuery.toLowerCase()))
                        );
                        const isZoneExpanded = expandedZones[zone.id] ?? false;
                        const isZoneDropTarget = dragOverTarget?.type === 'ZONE' && dragOverTarget?.id === zone.id;
                        const isBeingDragged = draggingItem?.type === 'ZONE' && draggingItem?.id === zone.id;

                        return (
                          <div 
                            key={zone.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, 'ZONE', zone.id, zone.name)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => {
                              if (draggingItem?.type === 'BUILDING') {
                                e.preventDefault();
                                setDragOverTarget({ type: 'ZONE', id: zone.id });
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverTarget?.id === zone.id) setDragOverTarget(null);
                            }}
                            onDrop={(e) => handleDropOnZone(e, zone.id)}
                            className={`rounded-xl border transition-all ${
                              isBeingDragged ? 'opacity-40 scale-95 border-dashed border-teal-400' : ''
                            } ${
                              isZoneDropTarget 
                                ? 'border-indigo-400 bg-indigo-500/20 ring-2 ring-indigo-400/50 shadow-md' 
                                : 'border-slate-800 bg-slate-900/70'
                            }`}
                          >
                            {/* Zone Header */}
                            <div className="flex items-center justify-between p-2 hover:bg-slate-800/60 cursor-pointer rounded-xl">
                              <div 
                                className="flex items-center gap-1.5 flex-1 truncate"
                                onClick={() => toggleZone(zone.id)}
                              >
                                <GripVertical className="w-3.5 h-3.5 text-slate-600 hover:text-slate-300 cursor-grab active:cursor-grabbing flex-shrink-0" />
                                {isZoneExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                )}
                                <span 
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: zone.color || '#14b8a6' }}
                                />
                                <span className="text-xs font-semibold text-slate-200 truncate">
                                  {zone.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                                <span className="text-[10px] font-mono-tactical px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                  {zoneBuildings.length}
                                </span>

                                {/* Quick Move Touch Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickMoveItem({ type: 'ZONE', id: zone.id, name: zone.name });
                                  }}
                                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-teal-300"
                                  title="Mover a otro territorio"
                                >
                                  <Link2 className="w-3 h-3" />
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onFlyToZone(zone);
                                    onClose();
                                  }}
                                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-teal-300"
                                  title="Ver en mapa"
                                >
                                  <MapPin className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Drop Zone Highlight Hint */}
                            {isZoneDropTarget && (
                              <div className="py-0.5 px-2 text-[10px] font-bold text-indigo-300 bg-indigo-500/30 text-center animate-pulse">
                                Soltar edificio aquí para enlazar a {zone.name}
                              </div>
                            )}

                            {/* Buildings inside Zone */}
                            {isZoneExpanded && (
                              <div className="py-1 pl-4 pr-1.5 space-y-0.5 border-t border-slate-800/40">
                                {zoneBuildings.length === 0 ? (
                                  <div className="text-[10px] text-slate-500 py-1 pl-2 italic">
                                    Sin edificios. Arrastra edificios aquí.
                                  </div>
                                ) : (
                                  zoneBuildings.map(b => {
                                    const isSelected = selectedBuildingId === b.id;
                                    const pendingCount = getBuildingPendingCount(b.id);
                                    const isBuildingDragged = draggingItem?.type === 'BUILDING' && draggingItem?.id === b.id;

                                    return (
                                      <div
                                        key={b.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, 'BUILDING', b.id, b.name)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => {
                                          onSelectBuilding(b);
                                          onClose();
                                        }}
                                        className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer text-xs transition-all ${
                                          isBuildingDragged ? 'opacity-40 scale-95 border-dashed border-teal-400' : ''
                                        } ${
                                          isSelected
                                            ? 'bg-teal-500/20 text-teal-200 border border-teal-500/40 shadow-sm'
                                            : 'hover:bg-slate-800/60 text-slate-300'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5 truncate flex-1">
                                          <GripVertical className="w-3 h-3 text-slate-600 hover:text-slate-300 cursor-grab active:cursor-grabbing flex-shrink-0" />
                                          <Building2 className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-teal-400' : 'text-slate-400'}`} />
                                          <span className="font-medium text-slate-200 truncate">
                                            {b.name}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                                          {pendingCount > 0 ? (
                                            <span className="text-[9px] font-mono-tactical px-1 py-0.2 rounded bg-blue-500/20 text-blue-300">
                                              {pendingCount}p
                                            </span>
                                          ) : (
                                            <span className="text-[9px] font-mono-tactical px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                                              ✓
                                            </span>
                                          )}

                                          {/* Quick Move Touch Button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setQuickMoveItem({ type: 'BUILDING', id: b.id, name: b.name });
                                            }}
                                            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-teal-300"
                                            title="Mover a otro residencial"
                                          >
                                            <Link2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Floating / Unassigned Elements Drawer (Huerfanos) */}
          {(unassignedZones.length > 0 || unassignedBuildings.length > 0) && (
            <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-950/20 p-2 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300 px-1">
                <span>Elementos Sueltos / Sin Asignar</span>
                <span className="text-[10px] font-mono-tactical bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-300">
                  {unassignedZones.length + unassignedBuildings.length}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 px-1">
                Arrastra estos elementos a cualquier carpeta arriba para enlazarlos.
              </p>

              {/* Unassigned Zones */}
              {unassignedZones.map(z => (
                <div
                  key={z.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'ZONE', z.id, z.name)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500 cursor-grab" />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color || '#14b8a6' }} />
                    <span className="text-slate-200 truncate">{z.name}</span>
                  </div>
                  <button
                    onClick={() => setQuickMoveItem({ type: 'ZONE', id: z.id, name: z.name })}
                    className="p-1 rounded text-teal-400 hover:bg-slate-800"
                    title="Enlazar a territorio"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Unassigned Buildings */}
              {unassignedBuildings.map(b => (
                <div
                  key={b.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, 'BUILDING', b.id, b.name)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <GripVertical className="w-3.5 h-3.5 text-slate-500 cursor-grab" />
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-200 truncate">{b.name}</span>
                  </div>
                  <button
                    onClick={() => setQuickMoveItem({ type: 'BUILDING', id: b.id, name: b.name })}
                    className="p-1 rounded text-teal-400 hover:bg-slate-800"
                    title="Enlazar a residencial"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Link Selector Modal (Accessible for Touch Devices) */}
        {quickMoveItem && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-4 flex flex-col justify-center animate-in fade-in zoom-in-95">
            <div className="p-4 rounded-3xl bg-slate-900 border border-teal-500/60 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-teal-400" />
                  <span>Enlazar {quickMoveItem.name}</span>
                </div>
                <button
                  onClick={() => setQuickMoveItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-[11px] text-slate-400">
                Selecciona el destino al que deseas mover este elemento:
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {quickMoveItem.type === 'ZONE' ? (
                  territories.map(t => (
                    <button
                      key={t.id}
                      onClick={async () => {
                        if (onMoveZoneToTerritory) {
                          await onMoveZoneToTerritory(quickMoveItem.id, t.id);
                        }
                        setQuickMoveItem(null);
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center justify-between transition-colors"
                    >
                      <span className="font-semibold">{t.name}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
                    </button>
                  ))
                ) : (
                  zones.map(z => (
                    <button
                      key={z.id}
                      onClick={async () => {
                        if (onMoveBuildingToZone) {
                          await onMoveBuildingToZone(quickMoveItem.id, z.id);
                        }
                        setQuickMoveItem(null);
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: z.color || '#14b8a6' }} />
                        <span className="font-semibold truncate">{z.name}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>

              <button
                onClick={() => setQuickMoveItem(null)}
                className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono-tactical">
          <span>Territorios: {displayTerritories.length}</span>
          <span>Residenciales: {zones.length}</span>
          <span>Edificios: {buildings.length}</span>
        </div>
      </aside>
    </>
  );
};

