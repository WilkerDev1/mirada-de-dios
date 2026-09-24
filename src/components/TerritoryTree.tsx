import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Building2, 
  Folder, 
  MapPin, 
  X, 
  Search,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';
import { Territory, Zone, Building, Apartment } from '../types';

interface TerritoryTreeProps {
  isOpen: boolean;
  onClose: () => void;
  activeTerritory: Territory | null;
  zones: Zone[];
  buildings: Building[];
  apartments: Apartment[];
  selectedBuildingId: string | null;
  onSelectBuilding: (building: Building) => void;
  onFlyToZone: (zone: Zone) => void;
  onOpenCreateZone: () => void;
}

export const TerritoryTree: React.FC<TerritoryTreeProps> = ({
  isOpen,
  onClose,
  activeTerritory,
  zones,
  buildings,
  apartments,
  selectedBuildingId,
  onSelectBuilding,
  onFlyToZone,
  onOpenCreateZone
}) => {
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({
    'zone-sd-01-z1': true,
    'zone-sd-01-z2': true
  });
  const [filterQuery, setFilterQuery] = useState('');

  if (!isOpen) return null;

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

  const getBuildingTotalCount = (buildingId: string) => {
    return apartments.filter(a => a.buildingId === buildingId).length;
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-40 transition-opacity" 
      />

      <aside className="fixed top-0 bottom-0 left-0 w-80 max-w-[85vw] z-50 flex flex-col bg-slate-950/98 backdrop-blur-2xl border-r border-slate-800 shadow-2xl text-slate-200 select-none animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 pt-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-teal-400 font-mono-tactical font-semibold">
              Estructura Territorial
            </div>
            <div className="font-bold text-sm text-slate-100 truncate mt-0.5">
              {activeTerritory ? activeTerritory.name : 'Sin territorio'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter search & Quick Add Zone */}
        <div className="p-3 border-b border-slate-800/80 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filtrar por edificio o calle..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-teal-500 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenCreateZone();
            }}
            className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>+ Nuevo Residencial / Zona</span>
          </button>
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {zones.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No hay residenciales registrados.
            </div>
          ) : (
            zones.map(zone => {
              const zoneBuildings = buildings.filter(b => 
                b.zoneId === zone.id && 
                (filterQuery === '' || 
                 b.name.toLowerCase().includes(filterQuery.toLowerCase()) || 
                 b.address.toLowerCase().includes(filterQuery.toLowerCase()))
              );
              const isExpanded = expandedZones[zone.id] ?? true;

              return (
                <div key={zone.id} className="rounded-xl border border-slate-800/80 bg-slate-900/50 overflow-hidden">
                  {/* Zone / Residential Item Header */}
                  <div className="flex items-center justify-between p-2.5 hover:bg-slate-800/50 cursor-pointer transition-colors group">
                    <div 
                      className="flex items-center gap-2 flex-1 truncate"
                      onClick={() => toggleZone(zone.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      <span 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: zone.color || '#14b8a6' }}
                      />
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {zone.code} · {zone.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                      <span className="text-[10px] font-mono-tactical px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {zoneBuildings.length}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFlyToZone(zone);
                          onClose();
                        }}
                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-teal-300"
                        title="Ver en mapa"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Buildings */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/50 py-1 pl-3 pr-1 space-y-0.5">
                      {zoneBuildings.length === 0 ? (
                        <div className="text-[11px] text-slate-500 py-1.5 pl-2 italic">
                          Sin edificios en este residencial
                        </div>
                      ) : (
                        zoneBuildings.map(b => {
                          const isSelected = selectedBuildingId === b.id;
                          const pendingCount = getBuildingPendingCount(b.id);
                          const totalCount = getBuildingTotalCount(b.id);

                          return (
                            <div
                              key={b.id}
                              onClick={() => {
                                onSelectBuilding(b);
                                onClose();
                              }}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-all ${
                                isSelected
                                  ? 'bg-teal-500/20 text-teal-200 border border-teal-500/40 shadow-sm'
                                  : 'hover:bg-slate-800/60 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate flex-1">
                                <Building2 className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-teal-400' : 'text-slate-400'}`} />
                                <div className="truncate">
                                  <div className="font-medium text-slate-200 truncate">{b.name}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{b.address}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                {pendingCount === 0 && totalCount > 0 ? (
                                  <span className="text-[10px] font-mono-tactical px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                    ✓
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono-tactical px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                                    {pendingCount}p
                                  </span>
                                )}
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

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono-tactical">
          <span>Residenciales: {zones.length}</span>
          <span>Edificios: {buildings.length}</span>
        </div>
      </aside>
    </>
  );
};
