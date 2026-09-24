import React, { useState, useRef, useEffect } from 'react';
import { 
  Compass, 
  Search, 
  CloudCheck, 
  CloudOff, 
  RefreshCw, 
  Layers, 
  PlusCircle, 
  MapPin, 
  ChevronDown, 
  Crosshair,
  User,
  Shield,
  Eye
} from 'lucide-react';
import { Territory, Building, Zone } from '../types';

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
  onOpenCreateBuilding: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
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
  onOpenCreateBuilding,
  sidebarOpen,
  onToggleSidebar
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [territoryDropdownOpen, setTerritoryDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter buildings, zones, and landmarks in Santo Domingo
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
          subtitle: 'Zona Territorial',
          center: z.center,
          zoom: 16.5
        }))
      ].slice(0, 6)
    : [];

  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-30 flex items-center justify-between px-3 md:px-5 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 text-slate-100 select-none">
      {/* Left: Brand & Sidebar toggle & Territory Selector */}
      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle territorial tree"
          className={`p-2 rounded-lg transition-colors border ${
            sidebarOpen 
              ? 'bg-teal-950/70 border-teal-500/50 text-teal-300' 
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Árbol Territorial"
        >
          <Compass className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent hidden sm:inline">
              MIRADA DE DIOS
            </span>
            <span className="text-[10px] font-mono-tactical ml-1 px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 hidden lg:inline">
              SDQ v2.0
            </span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Territory Dropdown */}
          <div className="relative">
            <button
              onClick={() => setTerritoryDropdownOpen(!territoryDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 transition-all max-w-[190px] sm:max-w-none truncate"
            >
              <MapPin className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span className="truncate">
                {activeTerritory ? `${activeTerritory.code} · ${activeTerritory.name}` : 'Seleccionar Territorio'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0 ml-0.5" />
            </button>

            {territoryDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl p-1.5 z-50">
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Territorios Santo Domingo
                </div>
                {territories.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTerritory(t);
                      setTerritoryDropdownOpen(false);
                      onFlyToLocation(t.center, 15, t.name);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      activeTerritory?.id === t.id 
                        ? 'bg-teal-600/20 text-teal-300 font-semibold border border-teal-500/30' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-[10px] text-slate-400">{t.code} · Distrito Nacional</div>
                    </div>
                    {activeTerritory?.id === t.id && (
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Quick Search */}
      <div ref={searchRef} className="relative flex-1 max-w-md mx-2 md:mx-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Buscar edificio, calle o zona en Santo Domingo..."
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 focus:border-teal-500 focus:bg-slate-900 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all shadow-inner"
          />
        </div>

        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl p-1 z-50 overflow-hidden">
            {searchResults.map(res => (
              <button
                key={res.id}
                onClick={() => {
                  onFlyToLocation(res.center, res.zoom, res.title);
                  setShowSearchResults(false);
                  setSearchQuery('');
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-xs flex items-center gap-2.5 transition-colors"
              >
                <div className={`p-1.5 rounded-md ${res.type === 'BUILDING' ? 'bg-teal-500/20 text-teal-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {res.type === 'BUILDING' ? <MapPin className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 truncate">
                  <div className="font-medium text-slate-200 truncate">{res.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{res.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Actions, Sync, God's Eye HUD & User */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* New Building Button */}
        <button
          onClick={onOpenCreateBuilding}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-medium transition-all"
          title="Dibujar o registrar nuevo edificio"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>+ Edificio</span>
        </button>

        {/* God's Eye Telemetry Toggle */}
        <button
          onClick={onToggleGodsEyeMode}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-mono-tactical transition-all ${
            godsEyeMode 
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]' 
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
          title="Alternar HUD Táctico God's Eye"
        >
          <Eye className={`w-3.5 h-3.5 ${godsEyeMode ? 'animate-pulse text-emerald-400' : ''}`} />
          <span className="hidden md:inline font-bold">GOD'S EYE</span>
        </button>

        {/* Sync Status Button */}
        <button
          onClick={onTriggerSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 transition-all"
          title={pendingSyncCount > 0 ? `${pendingSyncCount} cambios pendientes de sincronizar` : 'Todo sincronizado'}
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 text-teal-400 animate-spin" />
          ) : pendingSyncCount > 0 ? (
            <CloudOff className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="hidden lg:inline text-[11px] font-mono-tactical">
            {isSyncing ? 'Sync...' : pendingSyncCount > 0 ? `${pendingSyncCount} pend.` : 'Sync OK'}
          </span>
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <div className="w-5 h-5 rounded-full bg-teal-600/30 border border-teal-500/50 flex items-center justify-center text-[10px] font-bold text-teal-300">
            W
          </div>
          <span className="hidden xl:inline text-slate-300 font-medium text-[11px]">WilkerDev</span>
        </div>
      </div>
    </header>
  );
};
