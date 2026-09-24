import React from 'react';
import { 
  CheckCircle2, 
  BarChart3, 
  Users, 
  Clock, 
  Plus, 
  Radio, 
  ShieldCheck 
} from 'lucide-react';
import { CoverageMetrics, Territory } from '../types';

interface CoverageStatusBarProps {
  activeTerritory: Territory | null;
  metrics: CoverageMetrics;
  onOpenCreateBuilding: () => void;
  pendingSyncCount: number;
}

export const CoverageStatusBar: React.FC<CoverageStatusBarProps> = ({
  activeTerritory,
  metrics,
  onOpenCreateBuilding,
  pendingSyncCount
}) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-12 z-20 flex items-center justify-between px-3 md:px-5 bg-slate-950/90 backdrop-blur-md border-t border-slate-800/80 text-xs font-mono-tactical text-slate-300 select-none">
      {/* Left: Territory & Coverage Metrics */}
      <div className="flex items-center gap-3 md:gap-5 overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center gap-1.5 text-slate-100 font-bold whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-teal-400" />
          <span>{activeTerritory ? activeTerritory.code : 'SDQ'}</span>
        </div>

        <div className="h-3.5 w-px bg-slate-800 hidden sm:block" />

        {/* Physical Coverage */}
        <div className="flex items-center gap-1.5 whitespace-nowrap" title="Edificios con al menos una visita">
          <span className="text-slate-400">Cob. Física:</span>
          <span className="font-semibold text-teal-300">
            {metrics.physicalCoveragePercent}%
          </span>
          <span className="text-[10px] text-slate-500 hidden lg:inline">
            ({metrics.visitedBuildings}/{metrics.totalBuildings} edif.)
          </span>
        </div>

        {/* Attempted */}
        <div className="flex items-center gap-1.5 whitespace-nowrap" title="Apartamentos donde se intentó contacto">
          <span className="text-slate-400">Intentados:</span>
          <span className="font-semibold text-amber-300">
            {metrics.attemptedPercent}%
          </span>
        </div>

        {/* Contacted */}
        <div className="flex items-center gap-1.5 whitespace-nowrap" title="Apartamentos donde se logró contacto">
          <span className="text-slate-400">Contactados:</span>
          <span className="font-semibold text-emerald-300">
            {metrics.contactedPercent}%
          </span>
        </div>

        {/* Pending */}
        <div className="flex items-center gap-1.5 whitespace-nowrap hidden sm:flex" title="Apartamentos pendientes">
          <span className="text-slate-400">Pendientes:</span>
          <span className="font-semibold text-blue-300">
            {metrics.pendingApartments}
          </span>
        </div>
      </div>

      {/* Right: Sync Status & Quick Add */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className={`w-1.5 h-1.5 rounded-full ${pendingSyncCount > 0 ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
          <span>{pendingSyncCount > 0 ? `${pendingSyncCount} en cola local` : 'Local DB lista'}</span>
        </div>

        <button
          onClick={onOpenCreateBuilding}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 font-bold text-xs text-white shadow-md shadow-teal-900/40 transition-all hover:scale-105"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nuevo Edificio</span>
          <span className="sm:hidden">+</span>
        </button>
      </div>
    </footer>
  );
};
