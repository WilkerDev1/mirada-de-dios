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
  CheckCircle2,
  Clock,
  AlertTriangle
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
  onFlyToZone
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

  // Helper to count pending apartments in a building
  const getBuildingPendingCount = (buildingId: string) => {
    const bApartments = apartments.filter(a => a.buildingId === buildingId);
    return bApartments.filter(a => a.calculatedStatus === 'PENDING' || a.calculatedStatus === 'UNVISITED').length;
  };

  const getBuildingTotalCount = (buildingId: string) => {
    return apartments.filter(a => a.buildingId === buildingId).length;
  };

  return (
    <aside className="fixed top-14 left-0 bottom-12 w-80 max-w-[85vw] z-20 flex flex-col bg-slate-950/90 backdrop-blur-xl border-r border-slate-800/80 shadow-2xl text-slate-200 transition-all select-none">
      {/* Header */}
      <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-teal-400 font-mono-tactical font-semibold">
            Árbol Territorial
          </div>
          <div className="font-semibold text-sm text-slate-100 truncate">
            {activeTerritory ? activeTerritory.name : 'Sin territorio'}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Ocultar panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter search */}
      <div className="p-2 border-b border-slate-800/60">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filtrar por edificio o calle..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 focus:border-teal-500 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {zones.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No hay zonas registradas para este territorio.
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
              <div key={zone.id} className="rounded-xl border border-slate-800/70 bg-slate-900/40 overflow-hidden">
                {/* Zone Item Header */}
                <div className="flex items-center justify-between p-2 hover:bg-slate-800/50 cursor-pointer transition-colors group">
                  <div 
                    className="flex items-center gap-2 flex-1 truncate"
                    onClick={() => toggleZone(zone.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-teal-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-400" />
                    )}
                    <Folder className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                      {zone.code} · {zone.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-[10px] font-mono-tactical px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {zoneBuildings.length} edif.
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFlyToZone(zone);
                      }}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-teal-300"
                      title="Enfocar en mapa"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Buildings List */}
                {isExpanded && (
                  <div className="border-t border-slate-800/50 py-1 pl-4 pr-1 space-y-0.5">
                    {zoneBuildings.length === 0 ? (
                      <div className="text-[11px] text-slate-500 py-1.5 pl-2 italic">
                        Sin edificios coincidentes
                      </div>
                    ) : (
                      zoneBuildings.map(b => {
                        const isSelected = selectedBuildingId === b.id;
                        const pendingCount = getBuildingPendingCount(b.id);
                        const totalCount = getBuildingTotalCount(b.id);

                        return (
                          <div
                            key={b.id}
                            onClick={() => onSelectBuilding(b)}
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

                            {/* Badge */}
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              {pendingCount === 0 && totalCount > 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono-tactical px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Completo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono-tactical px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  <Clock className="w-2.5 h-2.5" /> {pendingCount}/{totalCount} pend.
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

      {/* Footer Info */}
      <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/60 text-[11px] text-slate-400 flex items-center justify-between font-mono-tactical">
        <span>Edificios: {buildings.length}</span>
        <span>Aptos: {apartments.length}</span>
      </div>
    </aside>
  );
};
