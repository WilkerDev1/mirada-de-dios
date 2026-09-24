import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Search, 
  CloudCheck, 
  CloudOff, 
  RefreshCw, 
  Layers, 
  Plus, 
  MapPin, 
  ChevronDown, 
  Eye, 
  X,
  Box,
  Edit3,
  Map as MapIcon
} from 'lucide-react';
import { Territory, Building, Zone, DrawMode } from '../types';

interface NavbarProps {
  territories: Territory[];
  activeTerritory: Territory | null;
  onSelectTerritory: (territory: Territory) => void;
  zones: Zone[];
  buildings: Building[];
  onFlyToLocation: (center: [number, number], zoom?: number, name?: string) => void;
  pendingSyncCount: number;
  isSyncing: boolean;
  onTriggerSync: () => void;
  godsEyeMode: boolean;
  onToggleGodsEyeMode: () => void;
  onSetDrawMode: (mode: DrawMode) => void;
  currentDrawMode: DrawMode;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenLayerControl: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  territories,
  activeTerritory,
  onSelectTerritory,
  zones,
  buildings,
  onFlyToLocation,
  pendingSyncCount,
  isSyncing,
  onTriggerSync,
  godsEyeMode,
  onToggleGodsEyeMode,
  onSetDrawMode,
  currentDrawMode,
  sidebarOpen,
  onToggleSidebar,
  onOpenLayerControl
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [territoryDropdownOpen, setTerritoryDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = searchQuery.trim().length > 1
    ? [
        ...buildings.filter(b => 
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          b.address.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(b => ({
          type: 'BUILDING' as const,
          id: b.id,
          title: b.name,
          subtitle: b.address,
          center: b.center,
          zoom: 18.5
        })),
        ...zones.filter(z => 
          z.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          z.code.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(z => ({
          type: 'ZONE' as const,
          id: z.id,
          title: `${z.code} - ${z.name}`,
          subtitle: 'Residencial / Zona',
          center: z.center,
          zoom: 16.5
        }))
      ].slice(0, 6)
    : [];

  return (
    <header className="fixed top-2 left-0 right-0 z-30 px-3 max-w-xl mx-auto pointer-events-none select-none">
      {/* Google Maps Style Floating Search Pill */}
      <div 
        ref={searchRef}
        className="pointer-events-auto flex items-center justify-between h-12 px-3 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl text-slate-100 transition-all"
      >
        {/* Left: Drawer Hamburger Menu */}
        <button
          onClick={onToggleSidebar}
          aria-label="Abrir menú"
          className="p-2 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Menú territorial"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Center: Search Input */}
        <div className="flex-1 relative mx-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Buscar en Santo Domingo..."
            className="w-full bg-transparent border-none text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-0"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right: Territory Pill & Sync Indicator */}
        <div className="flex items-center gap-1.5">
          {/* Territory Quick Selector */}
          <div className="relative">
            <button
              onClick={() => setTerritoryDropdownOpen(!territoryDropdownOpen)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-teal-300 transition-all max-w-[110px] sm:max-w-none truncate"
            >
              <MapPin className="w-3 h-3 text-teal-400 flex-shrink-0" />
              <span className="truncate">{activeTerritory ? activeTerritory.code : 'SDQ'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
            </button>

            {territoryDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 rounded-2xl bg-slate-900/98 backdrop-blur-2xl border border-slate-700 shadow-2xl p-1.5 z-50">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono-tactical">
                  Territorios Santo Domingo
                </div>
                {territories.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTerritory(t);
                      setTerritoryDropdownOpen(false);
                      onFlyToLocation(t.center, 15.5, t.name);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      activeTerritory?.id === t.id 
                        ? 'bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-[10px] text-slate-400">{t.code} · D.N.</div>
                    </div>
                    {activeTerritory?.id === t.id && (
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sync status */}
          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={pendingSyncCount > 0 ? `${pendingSyncCount} cambios pendientes` : 'Sincronizado'}
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 text-teal-400 animate-spin" />
            ) : pendingSyncCount > 0 ? (
              <CloudOff className="w-4 h-4 text-amber-400" />
            ) : (
              <CloudCheck className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </div>

      {/* Auto-suggest Search Dropdown */}
      {showSearchResults && searchResults.length > 0 && (
        <div className="pointer-events-auto mt-1.5 rounded-2xl bg-slate-900/98 backdrop-blur-2xl border border-slate-700 shadow-2xl p-1 z-50 overflow-hidden">
          {searchResults.map(res => (
            <button
              key={res.id}
              onClick={() => {
                onFlyToLocation(res.center, res.zoom, res.title);
                setShowSearchResults(false);
                setSearchQuery('');
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800 text-xs flex items-center gap-2.5 transition-colors"
            >
              <div className={`p-1.5 rounded-lg ${res.type === 'BUILDING' ? 'bg-teal-500/20 text-teal-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                {res.type === 'BUILDING' ? <MapPin className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
              </div>
              <div className="flex-1 truncate">
                <div className="font-semibold text-slate-200 truncate">{res.title}</div>
                <div className="text-[10px] text-slate-400 truncate">{res.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Horizontal Action Chips (Google Maps Style) */}
      <div className="pointer-events-auto flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        {/* Draw Building Box */}
        <button
          onClick={() => onSetDrawMode(currentDrawMode === 'DRAW_BUILDING_BOX' ? 'NONE' : 'DRAW_BUILDING_BOX')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-lg backdrop-blur-md transition-all ${
            currentDrawMode === 'DRAW_BUILDING_BOX'
              ? 'bg-teal-500 text-slate-950 ring-2 ring-teal-300'
              : 'bg-slate-900/90 text-slate-200 border border-slate-700/80 hover:bg-slate-800'
          }`}
        >
          <Box className="w-3.5 h-3.5 text-teal-400" />
          <span>+ Cuadro Edif.</span>
        </button>

        {/* Draw Building Polygon */}
        <button
          onClick={() => onSetDrawMode(currentDrawMode === 'DRAW_BUILDING_POLYGON' ? 'NONE' : 'DRAW_BUILDING_POLYGON')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-lg backdrop-blur-md transition-all ${
            currentDrawMode === 'DRAW_BUILDING_POLYGON'
              ? 'bg-teal-500 text-slate-950 ring-2 ring-teal-300'
              : 'bg-slate-900/90 text-slate-200 border border-slate-700/80 hover:bg-slate-800'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5 text-teal-400" />
          <span>+ Polígono Edif.</span>
        </button>

        {/* Draw Zone / Residential */}
        <button
          onClick={() => onSetDrawMode(currentDrawMode === 'DRAW_ZONE' ? 'NONE' : 'DRAW_ZONE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-lg backdrop-blur-md transition-all ${
            currentDrawMode === 'DRAW_ZONE'
              ? 'bg-indigo-500 text-slate-950 ring-2 ring-indigo-300'
              : 'bg-slate-900/90 text-slate-200 border border-slate-700/80 hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>+ Residencial</span>
        </button>

        {/* Open Layers */}
        <button
          onClick={onOpenLayerControl}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-semibold text-slate-200 whitespace-nowrap shadow-lg hover:bg-slate-800 transition-all"
        >
          <MapIcon className="w-3.5 h-3.5 text-blue-400" />
          <span>Capas</span>
        </button>

        {/* God's Eye Recon HUD */}
        <button
          onClick={onToggleGodsEyeMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono-tactical font-semibold whitespace-nowrap shadow-lg transition-all ${
            godsEyeMode 
              ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300' 
              : 'bg-slate-900/90 border border-slate-700/80 text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Eye className={`w-3.5 h-3.5 ${godsEyeMode ? 'animate-pulse' : 'text-emerald-400'}`} />
          <span>God's Eye</span>
        </button>
      </div>
    </header>
  );
};
