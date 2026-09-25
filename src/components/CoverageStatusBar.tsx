import React from 'react';
import { Plus, ShieldAlert, CheckCircle, Navigation } from 'lucide-react';
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
    <footer className="fixed bottom-0 left-0 right-0 h-11 z-20 flex items-center justify-between px-3 md:px-6 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 text-[11px] font-mono-tactical text-slate-300 select-none">
      {/* Metrics Row */}
      <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto no-scrollbar py-0.5">
        {/* Territory Identity */}
        <div className="flex items-center gap-1.5 font-bold text-slate-100 whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-teal-300">{activeTerritory ? activeTerritory.code : 'SDQ'}</span>
          {activeTerritory && (
            <span className="hidden xl:inline text-slate-400 font-sans font-normal text-xs">
              · {activeTerritory.name}
            </span>
          )}
        </div>

        {/* Physical Coverage */}
        <div className="flex items-center gap-1.5 whitespace-nowrap bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800">
          <span className="text-slate-400 hidden sm:inline">Cobertura:</span>
          <span className="text-slate-400 sm:hidden">Cob:</span>
          <span className="font-bold text-teal-300">
            {metrics.physicalCoveragePercent}%
          </span>
          <span className="hidden xl:inline text-[10px] text-slate-500">
            ({metrics.visitedBuildings}/{metrics.totalBuildings} edif.)
          </span>
        </div>

        {/* Attempted */}
        <div className="flex items-center gap-1.5 whitespace-nowrap bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800">
          <span className="text-slate-400 hidden sm:inline">Intentos:</span>
          <span className="text-slate-400 sm:hidden">Int:</span>
          <span className="font-bold text-amber-300">
            {metrics.attemptedPercent}%
          </span>
        </div>

        {/* Contacted */}
        <div className="flex items-center gap-1.5 whitespace-nowrap bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800">
          <span className="text-slate-400 hidden sm:inline">Contactados:</span>
          <span className="text-slate-400 sm:hidden">Cont:</span>
          <span className="font-bold text-emerald-400">
            {metrics.contactedPercent}%
          </span>
          <span className="hidden xl:inline text-[10px] text-slate-500">
            ({metrics.contactedApartments}/{metrics.totalApartments} apts.)
          </span>
        </div>

        {/* Pending */}
        <div className="flex items-center gap-1.5 whitespace-nowrap bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800">
          <span className="text-slate-400 hidden sm:inline">Pendientes:</span>
          <span className="text-slate-400 sm:hidden">Pend:</span>
          <span className="font-bold text-blue-400">
            {metrics.pendingApartments}
          </span>
        </div>

        {/* Access Issues (Desktop badge) */}
        {metrics.accessIssuesCount > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 whitespace-nowrap bg-rose-950/40 text-rose-300 px-2 py-0.5 rounded-lg border border-rose-900/60">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            <span>Restricciones: <strong>{metrics.accessIssuesCount}</strong></span>
          </div>
        )}
      </div>

      {/* Right Action */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <button
          onClick={onOpenCreateBuilding}
          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-xs text-white shadow-md shadow-teal-900/40 transition-all active:scale-95"
          title="Crear edificio con asistente"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Nuevo Edificio</span>
          <span className="sm:hidden">Edificio</span>
        </button>
      </div>
    </footer>
  );
};
