import React, { useState } from 'react';
import { 
  X, 
  Map as MapIcon, 
  MapPin, 
  Edit2, 
  Save, 
  Trash2, 
  Layers, 
  Plus, 
  Navigation,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';
import { Territory, Zone, Building, CoverageMetrics } from '../types';
import { ColorPickerBar } from './ColorPickerBar';

interface TerritorySheetProps {
  territory: Territory | null;
  zonesInTerritory: Zone[];
  buildingsInTerritory: Building[];
  metrics: CoverageMetrics;
  onClose: () => void;
  onUpdateTerritory: (territoryId: string, updates: Partial<Territory>) => Promise<void>;
  onDeleteTerritory: (territoryId: string) => Promise<void>;
  onFlyToTerritory: (territory: Territory) => void;
  onStartDrawZone: () => void;
  onSelectZone: (zone: Zone) => void;
}

export const TerritorySheet: React.FC<TerritorySheetProps> = ({
  territory,
  zonesInTerritory,
  buildingsInTerritory,
  metrics,
  onClose,
  onUpdateTerritory,
  onDeleteTerritory,
  onFlyToTerritory,
  onStartDrawZone,
  onSelectZone
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(territory?.name || '');
  const [editCode, setEditCode] = useState(territory?.code || '');
  const [isExpandedMobile, setIsExpandedMobile] = useState(true);

  React.useEffect(() => {
    if (territory) {
      setEditName(territory.name);
      setEditCode(territory.code);
      setIsEditing(false);
    }
  }, [territory]);

  if (!territory) return null;

  const handleSaveEdits = async () => {
    await onUpdateTerritory(territory.id, {
      name: editName.trim() || territory.name,
      code: editCode.trim() || territory.code
    });
    setIsEditing(false);
  };

  const handleColorChange = async (color: string) => {
    await onUpdateTerritory(territory.id, { color });
  };

  const handleDelete = async () => {
    if (confirm(`¿Estás seguro de eliminar el territorio "${territory.name}"?`)) {
      await onDeleteTerritory(territory.id);
      onClose();
    }
  };

  return (
    <aside
      className={`fixed z-40 transition-all duration-300 select-none
        /* Mobile: Bottom Sheet docked at bottom */
        bottom-0 left-0 right-0 max-h-[75vh] bg-slate-950/98 backdrop-blur-2xl border-t border-slate-700/80 shadow-[0_-12px_45px_rgba(0,0,0,0.7)] rounded-t-3xl flex flex-col
        /* Desktop: Floating Google Maps card */
        md:top-20 md:bottom-14 md:right-4 md:left-auto md:w-96 lg:w-[420px] md:rounded-2xl md:border md:max-h-[calc(100vh-140px)]
      `}
    >
      {/* Mobile Handle */}
      <div 
        onClick={() => setIsExpandedMobile(!isExpandedMobile)}
        className="md:hidden w-full pt-3 pb-1 flex flex-col items-center justify-center cursor-pointer"
      >
        <div className="w-12 h-1.5 rounded-full bg-slate-600" />
      </div>

      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-start justify-between">
        <div className="flex-1 pr-2 truncate">
          {!isEditing ? (
            <>
              <div className="flex items-center gap-1.5 text-xs text-sky-400 font-mono-tactical font-medium">
                <MapIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">Capa Superior Territorio · {territory.code}</span>
              </div>
              <h2 className="text-base font-bold text-slate-100 truncate mt-0.5">{territory.name}</h2>
              <div className="text-xs text-slate-400 mt-0.5 truncate">
                Distrito Nacional · Santo Domingo
              </div>
            </>
          ) : (
            <div className="space-y-1.5 py-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre del territorio"
                className="w-full p-1.5 rounded-lg bg-slate-900 border border-sky-500 text-xs text-white"
              />
              <input
                type="text"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                placeholder="Código (ej. SD-01)"
                className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono-tactical"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (isEditing) handleSaveEdits();
              else setIsEditing(true);
            }}
            className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title={isEditing ? 'Guardar' : 'Editar'}
          >
            {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsExpandedMobile(!isExpandedMobile)}
            className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            {isExpandedMobile ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isExpandedMobile && (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
          {/* Color Customization */}
          <ColorPickerBar
            currentColor={territory.color || '#0284c7'}
            onSelectColor={handleColorChange}
            onResetColor={() => handleColorChange('#0284c7')}
            label="Color del Territorio"
          />

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center font-mono-tactical">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Zonas</div>
              <div className="text-sm font-bold text-sky-400">{zonesInTerritory.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Edificios</div>
              <div className="text-sm font-bold text-teal-400">{buildingsInTerritory.length}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Cobertura</div>
              <div className="text-sm font-bold text-emerald-400">{metrics.physicalCoveragePercent}%</div>
            </div>
          </div>

          {/* Quick Action Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => onFlyToTerritory(territory)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium whitespace-nowrap border border-slate-700 transition-all"
            >
              <Navigation className="w-3.5 h-3.5 text-sky-400" />
              <span>Centrar</span>
            </button>

            <button
              onClick={onStartDrawZone}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-medium whitespace-nowrap shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Trazar Residencial</span>
            </button>

            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-300 font-medium whitespace-nowrap border border-red-500/30 transition-all ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar</span>
            </button>
          </div>

          {/* Zones list in this Territory */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-mono-tactical text-slate-400">
              <span>Residenciales en este territorio</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                {zonesInTerritory.length}
              </span>
            </div>

            {zonesInTerritory.length === 0 ? (
              <div className="text-center py-4 text-slate-500 italic bg-slate-900/40 rounded-xl border border-slate-800/60">
                No hay residenciales creados en este territorio.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {zonesInTerritory.map(z => (
                  <button
                    key={z.id}
                    onClick={() => onSelectZone(z)}
                    className="w-full text-left p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: z.color || '#0d9488' }}
                      />
                      <span className="font-medium text-slate-200 truncate">{z.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono-tactical flex-shrink-0">
                      {z.code}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
