import React, { useState } from 'react';
import { 
  Layers, 
  Map as MapIcon, 
  Satellite, 
  Moon, 
  Mountain,
  Sparkles, 
  X, 
  ChevronUp
} from 'lucide-react';
import { BaseMapStyle, LayerToggles } from '../types';

interface LayerControlProps {
  baseMap: BaseMapStyle;
  onChangeBaseMap: (style: BaseMapStyle) => void;
  layers: LayerToggles;
  onToggleLayer: (layerKey: keyof LayerToggles) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  baseMap,
  onChangeBaseMap,
  layers,
  onToggleLayer,
  isOpen,
  onToggleOpen
}) => {
  return (
    <div className="fixed bottom-14 left-3 z-30 select-none">
      {!isOpen ? (
        <button
          onClick={onToggleOpen}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/95 hover:bg-slate-800 backdrop-blur-xl border border-slate-700/80 shadow-2xl text-xs font-semibold text-slate-200 transition-all active:scale-95"
        >
          <Layers className="w-4 h-4 text-teal-400" />
          <span>Capas</span>
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ) : (
        <div className="w-80 max-w-[92vw] rounded-3xl bg-slate-950/98 backdrop-blur-2xl border border-slate-700 shadow-2xl p-4 text-slate-200 space-y-3.5 animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
              <Layers className="w-4 h-4 text-teal-400" />
              <span>MAPAS Y CAPAS</span>
            </div>
            <button
              onClick={onToggleOpen}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Base Map Selector (Now Featuring Google Maps!) */}
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono-tactical mb-2">
              Proveedor de Mapa Base
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => onChangeBaseMap('GOOGLE_HYBRID')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                  baseMap === 'GOOGLE_HYBRID'
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-semibold ring-1 ring-teal-400'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="truncate">Google Híbrido</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeBaseMap('GOOGLE_STREETS')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                  baseMap === 'GOOGLE_STREETS'
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-semibold ring-1 ring-teal-400'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <MapIcon className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span className="truncate">Google Calles</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeBaseMap('GOOGLE_SATELLITE')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                  baseMap === 'GOOGLE_SATELLITE'
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-semibold ring-1 ring-teal-400'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Satellite className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="truncate">Google Satélite</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeBaseMap('GOOGLE_TERRAIN')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                  baseMap === 'GOOGLE_TERRAIN'
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-semibold ring-1 ring-teal-400'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Mountain className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="truncate">Google Relieve</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeBaseMap('GODS_EYE_DARK')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                  baseMap === 'GODS_EYE_DARK'
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-semibold ring-1 ring-teal-400'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Moon className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="truncate">God's Eye</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeBaseMap('OSM_STREETS')}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                  baseMap === 'OSM_STREETS'
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-semibold ring-1 ring-teal-400'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <MapIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">OSM Estándar</span>
              </button>
            </div>
          </div>

          {/* Thematic Layers */}
          <div className="border-t border-slate-800 pt-2.5 space-y-2">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono-tactical">
              Capas Operativas Superpuestas
            </div>

            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 cursor-pointer text-xs">
              <span className="font-medium text-slate-300">Territorial (Zonas y Residenciales)</span>
              <input
                type="checkbox"
                checked={layers.territorial}
                onChange={() => onToggleLayer('territorial')}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 cursor-pointer text-xs">
              <span className="font-medium text-slate-300">Edificios (Contornos e inmuebles)</span>
              <input
                type="checkbox"
                checked={layers.buildings}
                onChange={() => onToggleLayer('buildings')}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 cursor-pointer text-xs">
              <span className="font-medium text-slate-300">Predicación (Estado semáforo)</span>
              <input
                type="checkbox"
                checked={layers.preachingStatus}
                onChange={() => onToggleLayer('preachingStatus')}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 cursor-pointer text-xs">
              <span className="font-medium text-slate-300">Extrusión 3D de Edificios</span>
              <input
                type="checkbox"
                checked={layers.threeDBuildings}
                onChange={() => onToggleLayer('threeDBuildings')}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
