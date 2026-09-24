import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  Navigation, 
  Layers, 
  Save, 
  Sparkles,
  Compass
} from 'lucide-react';
import { Zone, Territory, BuildingType, AccessType } from '../types';

interface BuildingCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTerritory: Territory | null;
  zones: Zone[];
  mapCenter: [number, number];
  initialPolygon?: number[][][] | null;
  onSaveBuilding: (data: {
    zoneId: string;
    territoryId: string;
    name: string;
    address: string;
    center: [number, number];
    polygonCoordinates: number[][][];
    buildingType: BuildingType;
    floors: number;
    accessType: AccessType;
    unitsPerFloor: number;
    notes?: string;
  }) => Promise<void>;
}

export const BuildingCreationModal: React.FC<BuildingCreationModalProps> = ({
  isOpen,
  onClose,
  activeTerritory,
  zones,
  mapCenter,
  initialPolygon,
  onSaveBuilding
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [zoneId, setZoneId] = useState(zones[0]?.id || '');
  const [buildingType, setBuildingType] = useState<BuildingType>('RESIDENTIAL_BUILDING');
  const [accessType, setAccessType] = useState<AccessType>('INTERCOM');
  const [floors, setFloors] = useState(4);
  const [unitsPerFloor, setUnitsPerFloor] = useState(2);
  const [notes, setNotes] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number]>(mapCenter);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (zones.length > 0 && !zoneId) {
      setZoneId(zones[0].id);
    }
  }, [zones, zoneId]);

  useEffect(() => {
    if (initialPolygon && initialPolygon[0] && initialPolygon[0].length > 0) {
      const ring = initialPolygon[0];
      let sumLon = 0;
      let sumLat = 0;
      ring.forEach(pt => {
        sumLon += pt[0];
        sumLat += pt[1];
      });
      setCoordinates([sumLon / ring.length, sumLat / ring.length]);
    } else {
      setCoordinates(mapCenter);
    }
  }, [initialPolygon, mapCenter]);

  if (!isOpen) return null;

  const handleGetGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada en este navegador');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates([pos.coords.longitude, pos.coords.latitude]);
        setIsGettingGps(false);
      },
      (err) => {
        console.warn('GPS error:', err);
        alert('No se pudo obtener señal GPS precisa. Usando coordenadas del visor.');
        setIsGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim() || !zoneId || !activeTerritory) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    setIsSaving(true);
    try {
      let polygonCoords: number[][][];
      if (initialPolygon && initialPolygon.length > 0) {
        polygonCoords = initialPolygon;
      } else {
        // Generate a small polygon footprint centered at `coordinates`
        const [lon, lat] = coordinates;
        const offset = 0.00025; // ~25 meters
        polygonCoords = [[
          [lon - offset, lat - offset / 1.5],
          [lon + offset, lat - offset / 1.5],
          [lon + offset, lat + offset / 1.5],
          [lon - offset, lat + offset / 1.5],
          [lon - offset, lat - offset / 1.5],
        ]];
      }

      await onSaveBuilding({
        zoneId,
        territoryId: activeTerritory.id,
        name: name.trim(),
        address: address.trim(),
        center: coordinates,
        polygonCoordinates: polygonCoords,
        buildingType,
        floors: Number(floors),
        accessType,
        unitsPerFloor: Number(unitsPerFloor),
        notes: notes.trim() ? notes.trim() : undefined
      });

      onClose();
    } catch (err) {
      console.error('Error saving building:', err);
      alert('Error al guardar edificio');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 text-slate-100 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-teal-300 font-bold text-base">
            <Building2 className="w-5 h-5 text-teal-400" />
            <span>Registrar Nuevo Edificio</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          {/* Territory & Residential/Zone Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Territorio</label>
              <input
                type="text"
                disabled
                value={activeTerritory ? `${activeTerritory.code} - ${activeTerritory.name}` : ''}
                className="w-full p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 font-mono-tactical text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Residencial / Zona Asignada *</label>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-teal-500 focus:outline-none"
              >
                {zones.map(z => (
                  <option key={z.id} value={z.id}>
                    📁 {z.code} - {z.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Name & Address */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Nombre del Edificio / Inmueble *</label>
            <input
              type="text"
              required
              placeholder="Ej. Torre Piantini 45 o Condominio El Conde"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Dirección exacta *</label>
            <input
              type="text"
              required
              placeholder="Ej. Calle Arzobispo Meriño #105"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* Building Type & Access */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Tipo de Estructura</label>
              <select
                value={buildingType}
                onChange={(e) => setBuildingType(e.target.value as BuildingType)}
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-teal-500 focus:outline-none"
              >
                <option value="RESIDENTIAL_BUILDING">Edificio Residencial</option>
                <option value="TOWER">Torre de Apartamentos</option>
                <option value="HOUSE">Casa Unifamiliar</option>
                <option value="GATED_COMMUNITY">Residencial Cerrado</option>
                <option value="COMMERCIAL">Comercial / Mixto</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Control de Acceso</label>
              <select
                value={accessType}
                onChange={(e) => setAccessType(e.target.value as AccessType)}
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-teal-500 focus:outline-none"
              >
                <option value="INTERCOM">Intercomunicador</option>
                <option value="GUARD">Vigilante / Garita</option>
                <option value="GATE_SECURITY">Portón Eléctrico</option>
                <option value="FREE">Libre Acceso</option>
                <option value="LOCKED">Cerrado con llave</option>
              </select>
            </div>
          </div>

          {/* Floors & Units per floor */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Niveles / Pisos</label>
              <input
                type="number"
                min="1"
                max="50"
                value={floors}
                onChange={(e) => setFloors(parseInt(e.target.value) || 1)}
                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono-tactical"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Apartamentos por Piso</label>
              <input
                type="number"
                min="1"
                max="20"
                value={unitsPerFloor}
                onChange={(e) => setUnitsPerFloor(parseInt(e.target.value) || 1)}
                className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono-tactical"
              />
            </div>
            <div className="col-span-2 text-[11px] text-teal-400 font-mono-tactical">
              ✓ Se crearán {floors * unitsPerFloor} apartamentos automáticos ({floors} pisos × {unitsPerFloor} unidades).
            </div>
          </div>

          {/* Drawn Footprint Notification */}
          {initialPolygon && (
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono-tactical text-[11px]">
              🎯 Polígono dibujado directamente en el mapa ({initialPolygon[0]?.length || 0} vértices).
            </div>
          )}

          {/* Location Picker */}
          {!initialPolygon && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span>Coordenadas en Santo Domingo</span>
                <button
                  type="button"
                  onClick={handleGetGps}
                  disabled={isGettingGps}
                  className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-mono-tactical"
                >
                  <Navigation className={`w-3 h-3 ${isGettingGps ? 'animate-spin' : ''}`} />
                  <span>{isGettingGps ? 'Capturando GPS...' : 'Usar GPS actual'}</span>
                </button>
              </div>
              <div className="font-mono-tactical text-[11px] text-slate-400">
                Lon: {coordinates[0].toFixed(5)}°, Lat: {coordinates[1].toFixed(5)}°
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-medium mb-1">Notas operativas (opcional)</label>
            <textarea
              rows={2}
              placeholder="Instrucciones para conserje o timbres..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 font-semibold text-white flex items-center gap-1.5 shadow-lg shadow-teal-900/40"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Guardando...' : 'Crear Edificio'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
