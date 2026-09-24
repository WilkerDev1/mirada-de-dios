import React, { useState } from 'react';
import { 
  Layers, 
  Map as MapIcon, 
  Satellite, 
  Moon, 
  Box, 
  ShieldAlert, 
  X, 
  ChevronUp, 
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { BaseMapStyle, LayerToggles } from '../types';

interface LayerControlProps {
  baseMap: BaseMapStyle;
  onChangeBaseMap: (style: BaseMapStyle) => void;
  layers: LayerToggles;
  onToggleLayer: (layerKey: keyof LayerToggles) => void;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  baseMap,
  onChangeBaseMap,
  layers,
  onToggleLayer
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-14 left-3 z-20 select-none">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 shadow-2xl text-xs font-semibold text-slate-200 transition-all hover:scale-105"
        >
          <Layers className="w-4 h-4 text-teal-400" />
          <span>Capas</span>
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ) : (
        <div className="w-72 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-slate-700/90 shadow-2xl p-3 text-slate-200 space-y-3 animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
              <Layers className="w-4 h-4 text-teal-400" />
              <span>SISTEMA DE CAPAS</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Base Map Selector (Radio) */}
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono-tactical mb-1.5">
              Mapa Base
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => onChangeBaseMap('STREETS')}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  baseMap === 'STREETS'
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5 text-teal-400" />
                <span>Calles (OSM)</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeBaseMap('SATELLITE')}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  baseMap === 'SATELLITE'
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Satellite className="w-3.5 h-3.5 text-blue-400" />
                <span>Satelital</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeBaseMap('HYBRID')}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  baseMap === 'HYBRID'
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Híbrido</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeBaseMap('GODS_EYE_DARK')}
                className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  baseMap === 'GODS_EYE_DARK'
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                <span>God's Eye</span>
              </button>
            </div>
          </div>

          {/* Thematic Layers (Checkboxes) */}
          <div className="border-t border-slate-800 pt-2 space-y-1.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono-tactical mb-1">
              Capas Temáticas
            </div>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900 cursor-pointer text-xs">
              <span className="font-medium text-slate-300">Territorial (Polígonos/Zonas)</span>
              <input
                type="checkbox"
                checked={layers.territorial}
                onChange={() => onToggleLayer('territorial')}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900 cursor-pointer text-xs">
              <span className="font-medium text-slate-300">Edificios (Contornos y accesos)</span>
              <input
                type="checkbox"
                checked={layers.buildings}
                onChange={() => onToggleLayer('buildings')}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900 cursor-pointer text-xs">
              <span className="font-medium text-slate-300">Predicación (Estado de trabajo)</span>
              <input
                type="checkbox"
                checked={layers.preachingStatus}
                onChange={() => onToggleLayer('preachingStatus')}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900 cursor-pointer text-xs">
              <span className="font-medium text-slate-300">Edificios 3D (Extrusión)</span>
              <input
                type="checkbox"
                checked={layers.threeDBuildings}
                onChange={() => onToggleLayer('threeDBuildings')}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-900 cursor-pointer text-xs">
              <span className="font-medium text-slate-300">Problemas / Restricciones</span>
              <input
                type="checkbox"
                checked={layers.restrictions}
                onChange={() => onToggleLayer('restrictions')}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0"
              />
            </label>

            <div className="flex items-center justify-between p-1.5 text-xs text-slate-500 opacity-60">
              <span>Infraestructura (Escuelas, etc.)</span>
              <span className="text-[10px] font-mono-tactical">Próx. v3</span>
            </div>
          </div>

          {/* Legend for Predicación */}
          {layers.preachingStatus && (
            <div className="border-t border-slate-800 pt-2 space-y-1 font-mono-tactical text-[10px]">
              <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                Leyenda de Trabajo
              </div>
              <div className="grid grid-cols-2 gap-1 text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Contactado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Sin respuesta</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Pendiente</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span>Restricción</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
