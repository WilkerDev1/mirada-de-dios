import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Search, 
  CloudCheck, 
  CloudOff, 
  RefreshCw, 
  Layers, 
  MapPin, 
  ChevronDown, 
  Eye, 
  X,
  Box,
  Edit3,
  Map as MapIcon,
  Building2,
  FolderTree,
  Sparkles
} from 'lucide-react';
import { Territory, Building, Zone, DrawMode, AppMode } from '../types';

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
  appMode: AppMode;
  onSelectAppMode: (mode: AppMode) => void;
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
  appMode,
  onSelectAppMode,
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
  const desktopSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        searchRef.current && !searchRef.current.contains(target) &&
        desktopSearchRef.current && !desktopSearchRef.current.contains(target)
      ) {
        setShowSearchResults(false);
        setTerritoryDropdownOpen(false);
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
    <header className="fixed top-2.5 sm:top-3 left-0 right-0 z-30 px-2 sm:px-4 max-w-7xl mx-auto pointer-events-none select-none">
      
      {/* ========================================================================= */}
      {/* 1. DESKTOP UNIFIED COMMAND BAR (Visible on >= 768px / md)                 */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-center justify-between gap-2 lg:gap-3 h-14 px-3 lg:px-4 rounded-2xl bg-slate-950/95 backdrop-blur-2xl border border-slate-700/80 shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-auto">
        
        {/* Left: Brand Badge + Sidebar Toggle + Territory Selector + Sync */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2 pr-2.5 border-r border-slate-800">
            <div className="w-7 h-7 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.25)]">
              <MapIcon className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <div className="font-extrabold text-xs tracking-wider text-slate-100 uppercase font-mono-tactical">
                Territory <span className="text-teal-400">Manager</span>
              </div>
            </div>
          </div>

          <button
            onClick={onToggleSidebar}
            aria-label="Alternar panel territorial"
            className={`p-2 rounded-xl text-slate-300 hover:text-white transition-all flex items-center gap-2 ${
              sidebarOpen 
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' 
                : 'hover:bg-slate-800 border border-transparent'
            }`}
            title={sidebarOpen ? "Ocultar panel territorial" : "Mostrar panel territorial"}
          >
            <FolderTree className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-bold uppercase tracking-wider font-mono-tactical hidden xl:inline">
              Territorios
            </span>
          </button>

          {/* Territory Dropdown */}
          <div className="relative">
            <button
              onClick={() => setTerritoryDropdownOpen(!territoryDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-teal-300 transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span className="font-mono-tactical">{activeTerritory ? activeTerritory.code : 'SDQ'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {territoryDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-2xl bg-slate-900/98 backdrop-blur-2xl border border-slate-700 shadow-2xl p-1.5 z-50">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono-tactical border-b border-slate-800 pb-1 mb-1">
                  Territorios Disponibles
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
                      <div className="font-medium text-slate-200">{t.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono-tactical">{t.code} · D.N. Santo Domingo</div>
                    </div>
                    {activeTerritory?.id === t.id && (
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sync Button */}
          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
            title={pendingSyncCount > 0 ? `${pendingSyncCount} cambios pendientes de sincronizar` : 'Base de datos sincronizada'}
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 text-teal-400 animate-spin" />
            ) : pendingSyncCount > 0 ? (
              <CloudOff className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="hidden xl:inline text-[11px] font-mono-tactical">
              {pendingSyncCount > 0 ? `${pendingSyncCount} pend.` : 'Sync'}
            </span>
          </button>
        </div>

        {/* Center: Search Bar with Autocomplete */}
        <div ref={desktopSearchRef} className="relative flex-1 max-w-sm xl:max-w-md mx-2">
          <div className="flex items-center h-9 px-3 rounded-xl bg-slate-900 border border-slate-700/80 focus-within:border-teal-500 transition-colors">
            <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Buscar edificio, calle o zona en Santo Domingo..."
              className="w-full bg-transparent border-none text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Desktop Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl bg-slate-900/98 backdrop-blur-2xl border border-slate-700 shadow-2xl p-1 z-50">
              {searchResults.map(res => (
                <button
                  key={res.id}
                  onClick={() => {
                    onFlyToLocation(res.center, res.zoom, res.title);
                    setShowSearchResults(false);
                    setSearchQuery('');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs flex items-center gap-2.5 transition-colors"
                >
                  <div className={`p-1.5 rounded-lg ${res.type === 'BUILDING' ? 'bg-teal-500/20 text-teal-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    {res.type === 'BUILDING' ? <Building2 className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 truncate">
                    <div className="font-semibold text-slate-200 truncate">{res.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">{res.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Mode Switcher + Action Drawing Tools + Map Tools */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher Segmented Control */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => { onSelectAppMode('BUILDINGS'); onSetDrawMode('NONE'); }}
              className={`py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                appMode === 'BUILDINGS' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Edificios</span>
            </button>

            <button
              onClick={() => { onSelectAppMode('ZONES'); onSetDrawMode('NONE'); }}
              className={`py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                appMode === 'ZONES' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Zonas</span>
            </button>

            <button
              onClick={() => { onSelectAppMode('TERRITORIES'); onSetDrawMode('NONE'); }}
              className={`py-1 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                appMode === 'TERRITORIES' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Territorios</span>
            </button>
          </div>

          {/* Action Drawing Buttons */}
          <div className="flex items-center gap-1.5">
            {appMode === 'BUILDINGS' && (
              <>
                <button
                  onClick={() => onSetDrawMode(currentDrawMode === 'DRAW_BUILDING_BOX' ? 'NONE' : 'DRAW_BUILDING_BOX')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    currentDrawMode === 'DRAW_BUILDING_BOX'
                      ? 'bg-teal-400 text-slate-950 ring-2 ring-teal-200'
                      : 'bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800'
                  }`}
                  title="Dibujar edificio marcando 2 esquinas opuestas"
                >
                  <Box className="w-3.5 h-3.5 text-teal-400" />
                  <span className="hidden xl:inline">+ Cuadro</span>
                </button>

                <button
                  onClick={() => onSetDrawMode(currentDrawMode === 'DRAW_BUILDING_POLYGON' ? 'NONE' : 'DRAW_BUILDING_POLYGON')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    currentDrawMode === 'DRAW_BUILDING_POLYGON'
                      ? 'bg-teal-400 text-slate-950 ring-2 ring-teal-200'
                      : 'bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800'
                  }`}
                  title="Dibujar polígono libre punto a punto"
                >
                  <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                  <span className="hidden xl:inline">+ Forma Libre</span>
                </button>
              </>
            )}

            {appMode === 'ZONES' && (
              <>
                <button
                  onClick={() => onSetDrawMode(currentDrawMode === 'DRAW_ZONE_BOX' ? 'NONE' : 'DRAW_ZONE_BOX')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    currentDrawMode === 'DRAW_ZONE_BOX'
                      ? 'bg-indigo-400 text-slate-950 ring-2 ring-indigo-200'
                      : 'bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <Box className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+ Cuadro</span>
                </button>

                <button
                  onClick={() => onSetDrawMode(currentDrawMode === 'DRAW_ZONE_POLYGON' ? 'NONE' : 'DRAW_ZONE_POLYGON')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    currentDrawMode === 'DRAW_ZONE_POLYGON'
                      ? 'bg-indigo-400 text-slate-950 ring-2 ring-indigo-200'
                      : 'bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+ Polígono</span>
                </button>
              </>
            )}

            {appMode === 'TERRITORIES' && (
              <button
                onClick={() => onSetDrawMode(currentDrawMode === 'DRAW_TERRITORY_POLYGON' ? 'NONE' : 'DRAW_TERRITORY_POLYGON')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  currentDrawMode === 'DRAW_TERRITORY_POLYGON'
                    ? 'bg-sky-400 text-slate-950 ring-2 ring-sky-200'
                    : 'bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-sky-400" />
                <span>+ Trazar Territorio</span>
              </button>
            )}

            {/* Layer Control Trigger */}
            <button
              onClick={onOpenLayerControl}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-all"
              title="Mapas base y capas"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden xl:inline">Capas</span>
            </button>

            {/* God's Eye Recon HUD */}
            <button
              onClick={onToggleGodsEyeMode}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono-tactical font-semibold transition-all ${
                godsEyeMode 
                  ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-200' 
                  : 'bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
              title="Modo Táctico God's Eye"
            >
              <Eye className={`w-3.5 h-3.5 ${godsEyeMode ? 'animate-pulse' : 'text-emerald-400'}`} />
              <span className="hidden xl:inline">HUD</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MOBILE COMPACT FLOATING PILL (Visible only on < 768px / md:hidden)      */}
      {/* ========================================================================= */}
      <div className="md:hidden max-w-xl mx-auto space-y-2">
        {/* Search & Top Action Pill */}
        <div 
          ref={searchRef}
          className="relative z-50 pointer-events-auto flex items-center justify-between h-12 px-3 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-slate-700/90 shadow-2xl text-slate-100 transition-all"
        >
          {/* Hamburger Drawer */}
          <button
            onClick={onToggleSidebar}
            aria-label="Abrir menú"
            className="p-2 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Estructura territorial"
          >
            <Menu className="w-5 h-5 text-teal-400" />
          </button>

          {/* Search Input */}
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
              className="w-full bg-transparent border-none text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-0"
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

          {/* Territory Selector & Sync */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                onClick={() => setTerritoryDropdownOpen(!territoryDropdownOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-teal-300 transition-all max-w-[100px] truncate"
              >
                <MapPin className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                <span className="truncate">{activeTerritory ? activeTerritory.code : 'SDQ'}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
              </button>

              {territoryDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 max-h-72 overflow-y-auto rounded-2xl bg-slate-900/98 backdrop-blur-2xl border border-slate-700 shadow-2xl p-1.5 z-50">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono-tactical">
                    Territorios
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

        {/* Mobile Search Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="relative z-50 pointer-events-auto rounded-2xl bg-slate-900/98 backdrop-blur-2xl border border-slate-700 shadow-2xl p-1 overflow-hidden">
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

        {/* Mobile Mode Switcher Tabs */}
        <div className="relative z-10 pointer-events-auto flex items-center justify-center gap-1 p-1 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 shadow-lg">
          <button
            onClick={() => { onSelectAppMode('BUILDINGS'); onSetDrawMode('NONE'); }}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              appMode === 'BUILDINGS' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Edificios</span>
          </button>

          <button
            onClick={() => { onSelectAppMode('ZONES'); onSetDrawMode('NONE'); }}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              appMode === 'ZONES' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Residenciales</span>
          </button>

          <button
            onClick={() => { onSelectAppMode('TERRITORIES'); onSetDrawMode('NONE'); }}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              appMode === 'TERRITORIES' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Territorios</span>
          </button>
        </div>

        {/* Mobile Horizontal Action Chips */}
        <div className="relative z-10 pointer-events-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
          {appMode === 'BUILDINGS' && (
            <>
              <button
                onClick={() => onSetDrawMode(currentDrawMode === 'DRAW_BUILDING_BOX' ? 'NONE' : 'DRAW_BUILDING_BOX')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-lg backdrop-blur-md transition-all ${
                  currentDrawMode === 'DRAW_BUILDING_BOX'
                    ? 'bg-teal-400 text-slate-950 ring-2 ring-teal-200'
                    : 'bg-slate-900/95 text-slate-200 border border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Box className="w-3.5 h-3.5 text-teal-400" />
                <span>+ Cuadro Edificio</span>
              </button>

              <button
                onClick={() => onSetDrawMode(currentDrawMode === 'DRAW_BUILDING_POLYGON' ? 'NONE' : 'DRAW_BUILDING_POLYGON')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-lg backdrop-blur-md transition-all ${
                  currentDrawMode === 'DRAW_BUILDING_POLYGON'
                    ? 'bg-teal-400 text-slate-950 ring-2 ring-teal-200'
                    : 'bg-slate-900/95 text-slate-200 border border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                <span>+ Forma Libre</span>
              </button>
            </>
          )}

          {appMode === 'ZONES' && (
            <>
              <button
                onClick={() => onSetDrawMode(currentDrawMode === 'DRAW_ZONE_BOX' ? 'NONE' : 'DRAW_ZONE_BOX')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-lg backdrop-blur-md transition-all ${
                  currentDrawMode === 'DRAW_ZONE_BOX'
                    ? 'bg-indigo-400 text-slate-950 ring-2 ring-indigo-200'
                    : 'bg-slate-900/95 text-slate-200 border border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Box className="w-3.5 h-3.5 text-indigo-400" />
                <span>+ Cuadro Residencial</span>
              </button>

              <button
                onClick={() => onSetDrawMode(currentDrawMode === 'DRAW_ZONE_POLYGON' ? 'NONE' : 'DRAW_ZONE_POLYGON')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-lg backdrop-blur-md transition-all ${
                  currentDrawMode === 'DRAW_ZONE_POLYGON'
                    ? 'bg-indigo-400 text-slate-950 ring-2 ring-indigo-200'
                    : 'bg-slate-900/95 text-slate-200 border border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>+ Polígono Residencial</span>
              </button>
            </>
          )}

          {appMode === 'TERRITORIES' && (
            <button
              onClick={() => onSetDrawMode(currentDrawMode === 'DRAW_TERRITORY_POLYGON' ? 'NONE' : 'DRAW_TERRITORY_POLYGON')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shadow-lg backdrop-blur-md transition-all ${
                currentDrawMode === 'DRAW_TERRITORY_POLYGON'
                  ? 'bg-sky-400 text-slate-950 ring-2 ring-sky-200'
                  : 'bg-slate-900/95 text-slate-200 border border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-sky-400" />
              <span>+ Trazar Territorio</span>
            </button>
          )}

          {/* Layer switch button */}
          <button
            onClick={onOpenLayerControl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 border border-slate-700 text-xs font-semibold text-slate-200 whitespace-nowrap shadow-lg hover:bg-slate-800 transition-all"
          >
            <MapIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>Capas</span>
          </button>

          {/* God's Eye Recon HUD */}
          <button
            onClick={onToggleGodsEyeMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono-tactical font-semibold whitespace-nowrap shadow-lg transition-all ${
              godsEyeMode 
                ? 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-200' 
                : 'bg-slate-900/95 border border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Eye className={`w-3.5 h-3.5 ${godsEyeMode ? 'animate-pulse' : 'text-emerald-400'}`} />
            <span>God's Eye</span>
          </button>
        </div>
      </div>
    </header>
  );
};
