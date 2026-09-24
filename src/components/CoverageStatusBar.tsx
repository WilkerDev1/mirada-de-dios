import React from 'react';
import { Plus } from 'lucide-react';
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
    <footer className="fixed bottom-0 left-0 right-0 h-11 z-20 flex items-center justify-between px-3 md:px-5 bg-slate-950/92 backdrop-blur-md border-t border-slate-800 text-[11px] font-mono-tactical text-slate-300 select-none">
      {/* Metrics Row */}
      <div className="flex items-center gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar py-0.5">
        <div className="flex items-center gap-1 font-bold text-slate-100 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          <span>{activeTerritory ? activeTerritory.code : 'SDQ'}</span>
        </div>

        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-slate-400">Cob:</span>
          <span className="font-semibold text-teal-300">
            {metrics.physicalCoveragePercent}%
          </span>
        </div>

        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-slate-400">Int:</span>
          <span className="font-semibold text-amber-300">
            {metrics.attemptedPercent}%
          </span>
        </div>

        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-slate-400">Cont:</span>
          <span className="font-semibold text-emerald-300">
            {metrics.contactedPercent}%
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1 whitespace-nowrap">
          <span className="text-slate-400">Pend:</span>
          <span className="font-semibold text-blue-300">
            {metrics.pendingApartments}
          </span>
        </div>
      </div>

      {/* Right Action */}
      <button
        onClick={onOpenCreateBuilding}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 font-bold text-xs text-white shadow-md shadow-teal-900/40 transition-all flex-shrink-0 ml-2"
        title="Crear edificio manualmente"
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Nuevo Edificio</span>
        <span className="sm:hidden">Edificio</span>
      </button>
    </footer>
  );
};
