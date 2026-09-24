import React, { useState } from 'react';
import { X, Layers, Save, Palette, MapPin } from 'lucide-react';
import { Territory, GeoPolygon } from '../types';

interface ZoneCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTerritory: Territory | null;
  polygonCoordinates: number[][][];
  onSaveZone: (data: {
    territoryId: string;
    name: string;
    code: string;
    color: string;
    center: [number, number];
    polygonCoordinates: number[][][];
  }) => Promise<void>;
}

const PRESET_COLORS = [
  '#0d9488', // Teal
  '#0284c7', // Sky
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#8b5cf6', // Violet
  '#d97706'  // Ochre
];

export const ZoneCreationModal: React.FC<ZoneCreationModalProps> = ({
  isOpen,
  onClose,
  activeTerritory,
  polygonCoordinates,
  onSaveZone
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  // Calculate polygon center
  const getCenter = (): [number, number] => {
    if (!polygonCoordinates || polygonCoordinates.length === 0 || !polygonCoordinates[0]) {
      return activeTerritory ? activeTerritory.center : [-69.8860, 18.4740];
    }
    const ring = polygonCoordinates[0];
    let sumLon = 0;
    let sumLat = 0;
    ring.forEach(pt => {
      sumLon += pt[0];
      sumLat += pt[1];
    });
    return [sumLon / ring.length, sumLat / ring.length];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeTerritory) {
      alert('Por favor ingrese el nombre del residencial o zona');
      return;
    }

    setIsSaving(true);
    try {
      const center = getCenter();
      const zoneCode = code.trim() || `Z-${Math.floor(10 + Math.random() * 90)}`;
      await onSaveZone({
        territoryId: activeTerritory.id,
        name: name.trim(),
        code: zoneCode,
        color: selectedColor,
        center,
        polygonCoordinates
      });
      onClose();
    } catch (err) {
      console.error('Error saving zone:', err);
      alert('Error al guardar el residencial');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 text-slate-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-teal-300 font-bold text-base">
            <Layers className="w-5 h-5 text-teal-400" />
            <span>Registrar Residencial / Zona</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Territorio Superior</label>
            <input
              type="text"
              disabled
              value={activeTerritory ? `${activeTerritory.code} - ${activeTerritory.name}` : ''}
              className="w-full p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 font-mono-tactical text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Nombre del Residencial o Sector *</label>
            <input
              type="text"
              required
              placeholder="Ej. Residencial Las Praderas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Código / Referencia (opcional)</label>
            <input
              type="text"
              placeholder="Ej. RES-01 o Z-3"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-teal-400" />
              <span>Color identificador en el mapa</span>
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    selectedColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono-tactical text-teal-300">
            ✓ Geometría capturada: {polygonCoordinates[0]?.length || 0} vértices en el mapa.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 font-semibold text-white flex items-center gap-1.5 shadow-lg shadow-teal-900/40"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Guardando...' : 'Crear Residencial'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
