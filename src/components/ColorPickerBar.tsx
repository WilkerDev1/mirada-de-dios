import React from 'react';
import { Palette, RotateCcw } from 'lucide-react';

export const PALETTE_COLORS = [
  { hex: '#0d9488', name: 'Turquesa' },
  { hex: '#0284c7', name: 'Azul' },
  { hex: '#6366f1', name: 'Índigo' },
  { hex: '#8b5cf6', name: 'Púrpura' },
  { hex: '#10b981', name: 'Esmeralda' },
  { hex: '#f59e0b', name: 'Ámbar' },
  { hex: '#ea580c', name: 'Naranja' },
  { hex: '#f43f5e', name: 'Carmesí' },
  { hex: '#64748b', name: 'Grafito' }
];

interface ColorPickerBarProps {
  currentColor?: string;
  onSelectColor: (hex: string) => void;
  onResetColor?: () => void;
  label?: string;
}

export const ColorPickerBar: React.FC<ColorPickerBarProps> = ({
  currentColor,
  onSelectColor,
  onResetColor,
  label = 'Color en el mapa'
}) => {
  return (
    <div className="space-y-1.5 py-1">
      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span className="flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-teal-400" />
          <span>{label}</span>
        </span>
        {onResetColor && currentColor && (
          <button
            type="button"
            onClick={onResetColor}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-teal-300 transition-colors"
            title="Restablecer color por defecto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Por defecto</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {PALETTE_COLORS.map(c => {
          const isSelected = currentColor?.toLowerCase() === c.hex.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              onClick={() => onSelectColor(c.hex)}
              className={`w-7 h-7 rounded-full flex-shrink-0 transition-all ${
                isSelected
                  ? 'ring-2 ring-white scale-110 shadow-lg'
                  : 'hover:scale-105 opacity-85 hover:opacity-100 ring-1 ring-white/20'
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          );
        })}
      </div>
    </div>
  );
};
