import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  History, 
  FileText, 
  DoorOpen, 
  Send, 
  UserCheck, 
  ChevronDown, 
  ChevronUp,
  Edit2, 
  Save, 
  Trash2, 
  Navigation, 
  Plus, 
  Palette, 
  Layers, 
  AlertCircle,
  Check
} from 'lucide-react';
import { Building, Apartment, Visit, Restriction, VisitResult, ApartmentStatus, AccessType, Zone } from '../types';
import { ColorPickerBar } from './ColorPickerBar';

interface DetailPanelProps {
  building: Building | null;
  apartments: Apartment[];
  visits: Visit[];
  restrictions: Restriction[];
  zones?: Zone[];
  onClose: () => void;
  onRecordVisit: (data: {
    apartmentId: string;
    buildingId: string;
    result: VisitResult;
    note?: string;
  }) => Promise<void>;
  onUpdateBuilding?: (buildingId: string, updates: Partial<Building>) => Promise<void>;
  onDeleteBuilding?: (buildingId: string) => Promise<void>;
  onFlyToBuilding?: (building: Building) => void;
  onCreateApartment?: (data: {
    buildingId: string;
    unitNumber: string;
    floor: number;
    notes?: string;
  }) => Promise<void>;
  onDeleteApartment?: (apartmentId: string, buildingId: string) => Promise<void>;
  onUpdateApartment?: (apartmentId: string, buildingId: string, updates: Partial<Apartment>) => Promise<void>;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  building,
  apartments,
  visits,
  restrictions,
  zones = [],
  onClose,
  onRecordVisit,
  onUpdateBuilding,
  onDeleteBuilding,
  onFlyToBuilding,
  onCreateApartment,
  onDeleteApartment,
  onUpdateApartment
}) => {
  const [activeTab, setActiveTab] = useState<'UNITS' | 'HISTORY' | 'INFO'>('UNITS');
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [visitResult, setVisitResult] = useState<VisitResult>('CONTACTED');
  const [visitNote, setVisitNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpandedMobile, setIsExpandedMobile] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Edit Building state
  const [isEditingBuilding, setIsEditingBuilding] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editFloors, setEditFloors] = useState(4);
  const [editZoneId, setEditZoneId] = useState('');
  const [editAccessType, setEditAccessType] = useState<AccessType>('INTERCOM');

  // Single Apartment Add state
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [newUnitFloor, setNewUnitFloor] = useState(1);
  const [newUnitNotes, setNewUnitNotes] = useState('');

  // Batch Generator state
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchFloors, setBatchFloors] = useState(4);
  const [batchUnitsPerFloor, setBatchUnitsPerFloor] = useState(2);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);

  // Edit Selected Apartment state
  const [isEditingUnit, setIsEditingUnit] = useState(false);
  const [editUnitNumber, setEditUnitNumber] = useState('');
  const [editUnitFloor, setEditUnitFloor] = useState(1);
  const [editUnitNotes, setEditUnitNotes] = useState('');
  const [confirmDeleteUnit, setConfirmDeleteUnit] = useState(false);

  // Sync state when building changes
  useEffect(() => {
    if (building) {
      setEditName(building.name);
      setEditAddress(building.address);
      setEditFloors(building.floors || 4);
      setEditZoneId(building.zoneId || '');
      setEditAccessType(building.accessType || 'INTERCOM');
      setIsEditingBuilding(false);
      setSelectedApartment(null);
      setIsAddingUnit(false);
      setIsBatchOpen(false);
      setIsEditingUnit(false);
      setConfirmDeleteUnit(false);
      setShowColorPicker(false);
    }
  }, [building]);

  // Sync edit apartment fields when selected apartment changes
  useEffect(() => {
    if (selectedApartment) {
      setEditUnitNumber(selectedApartment.unitNumber);
      setEditUnitFloor(selectedApartment.floor);
      setEditUnitNotes(selectedApartment.notes || '');
      setIsEditingUnit(false);
      setConfirmDeleteUnit(false);
    }
  }, [selectedApartment]);

  if (!building) return null;

  // Smart suggestion for next unit number
  const handleOpenAddUnit = () => {
    if (apartments.length === 0) {
      setNewUnitNumber('101');
      setNewUnitFloor(1);
    } else {
      const numericUnits = apartments
        .map(a => parseInt(a.unitNumber, 10))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);
      
      if (numericUnits.length > 0) {
        const lastNum = numericUnits[numericUnits.length - 1];
        setNewUnitNumber(String(lastNum + 1));
        const calculatedFloor = Math.floor((lastNum + 1) / 100);
        setNewUnitFloor(calculatedFloor > 0 ? calculatedFloor : 1);
      } else {
        setNewUnitNumber(`Apto ${apartments.length + 1}`);
        setNewUnitFloor(1);
      }
    }
    setNewUnitNotes('');
    setIsAddingUnit(true);
    setIsBatchOpen(false);
  };

  const handleSaveNewUnit = async () => {
    if (!onCreateApartment || !newUnitNumber.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateApartment({
        buildingId: building.id,
        unitNumber: newUnitNumber.trim(),
        floor: Number(newUnitFloor) || 1,
        notes: newUnitNotes.trim() ? newUnitNotes.trim() : undefined
      });
      setIsAddingUnit(false);
      setNewUnitNumber('');
      setNewUnitNotes('');
    } catch (e) {
      console.error('Error creating apartment:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!onCreateApartment) return;
    setIsGeneratingBatch(true);
    try {
      const floors = Math.max(1, Math.min(batchFloors, 40));
      const perFloor = Math.max(1, Math.min(batchUnitsPerFloor, 20));
      
      for (let f = 1; f <= floors; f++) {
        for (let u = 1; u <= perFloor; u++) {
          const unitNumber = `${f}0${u}`;
          const exists = apartments.some(a => a.unitNumber === unitNumber);
          if (!exists) {
            await onCreateApartment({
              buildingId: building.id,
              unitNumber,
              floor: f
            });
          }
        }
      }
      setIsBatchOpen(false);
    } catch (e) {
      console.error('Error generating batch apartments:', e);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const handleSaveVisit = async () => {
    if (!selectedApartment) return;
    setIsSubmitting(true);
    try {
      await onRecordVisit({
        apartmentId: selectedApartment.id,
        buildingId: building.id,
        result: visitResult,
        note: visitNote.trim() ? visitNote.trim() : undefined
      });
      setSelectedApartment(null);
      setVisitNote('');
      setVisitResult('CONTACTED');
    } catch (e) {
      console.error('Error saving visit:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveBuildingEdits = async () => {
    if (!onUpdateBuilding) return;
    try {
      await onUpdateBuilding(building.id, {
        name: editName.trim() || building.name,
        address: editAddress.trim() || building.address,
        floors: Number(editFloors) || building.floors,
        zoneId: editZoneId || building.zoneId,
        accessType: editAccessType
      });
      setIsEditingBuilding(false);
    } catch (err) {
      console.error('Error updating building:', err);
    }
  };

  const handleUpdateCurrentUnit = async () => {
    if (!selectedApartment || !onUpdateApartment || !editUnitNumber.trim()) return;
    try {
      await onUpdateApartment(selectedApartment.id, building.id, {
        unitNumber: editUnitNumber.trim(),
        floor: Number(editUnitFloor) || 1,
        notes: editUnitNotes.trim() ? editUnitNotes.trim() : undefined
      });
      setIsEditingUnit(false);
      setSelectedApartment(prev => prev ? {
        ...prev,
        unitNumber: editUnitNumber.trim(),
        floor: Number(editUnitFloor) || 1,
        notes: editUnitNotes.trim() ? editUnitNotes.trim() : undefined
      } : null);
    } catch (e) {
      console.error('Error updating unit:', e);
    }
  };

  const handleDeleteCurrentUnit = async () => {
    if (!selectedApartment || !onDeleteApartment) return;
    try {
      await onDeleteApartment(selectedApartment.id, building.id);
      setSelectedApartment(null);
      setConfirmDeleteUnit(false);
    } catch (e) {
      console.error('Error deleting unit:', e);
    }
  };

  const handleColorChange = async (color: string) => {
    if (onUpdateBuilding) {
      await onUpdateBuilding(building.id, { color });
    }
  };

  const handleResetColor = async () => {
    if (onUpdateBuilding) {
      await onUpdateBuilding(building.id, { color: undefined });
    }
  };

  const handleDeleteBuilding = async () => {
    if (onDeleteBuilding && confirm(`¿Estás seguro de eliminar "${building.name}" y todos sus apartamentos?`)) {
      await onDeleteBuilding(building.id);
      onClose();
    }
  };

  const getStatusColor = (status: ApartmentStatus) => {
    switch (status) {
      case 'CONTACTED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30';
      case 'NO_ANSWER':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30';
      case 'ACCESS_PROBLEM':
        return 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30';
      case 'PENDING':
      case 'UNVISITED':
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30';
    }
  };

  const getStatusDot = (status: ApartmentStatus) => {
    switch (status) {
      case 'CONTACTED': return 'bg-emerald-400';
      case 'NO_ANSWER': return 'bg-amber-400';
      case 'ACCESS_PROBLEM': return 'bg-red-400';
      default: return 'bg-blue-400';
    }
  };

  const getAccessLabel = (type: Building['accessType']) => {
    switch (type) {
      case 'INTERCOM': return 'Intercomunicador';
      case 'GUARD': return 'Vigilante / Garita';
      case 'GATE_SECURITY': return 'Portón Eléctrico';
      case 'LOCKED': return 'Cerrado con llave';
      case 'FREE': return 'Acceso Libre';
      default: return 'Otro';
    }
  };

  const currentZone = zones.find(z => z.id === building.zoneId);

  return (
    <aside 
      className={`fixed z-40 transition-all duration-200 ease-out select-none
        /* Mobile (< 768px): Bottom Sheet with compact max-height to keep map context visible */
        bottom-0 left-0 right-0 max-h-[70vh] bg-slate-950/98 backdrop-blur-2xl border-t border-slate-700/80 shadow-[0_-12px_45px_rgba(0,0,0,0.8)] rounded-t-3xl flex flex-col
        /* Desktop (>= 768px): Floating Google Maps card with spacious desktop layout */
        md:top-20 md:bottom-14 md:right-4 md:left-auto md:w-96 lg:w-[420px] md:rounded-2xl md:border md:max-h-[calc(100vh-140px)]
      `}
    >
      {/* Mobile Drag Handle */}
      <div 
        onClick={() => setIsExpandedMobile(!isExpandedMobile)}
        className="md:hidden w-full pt-2.5 pb-1 flex flex-col items-center justify-center cursor-pointer active:opacity-70"
      >
        <div className="w-10 h-1 rounded-full bg-slate-600 hover:bg-slate-500 transition-colors" />
      </div>

      {/* Header */}
      <div className="px-4 py-2 border-b border-slate-800/80 flex items-start justify-between">
        <div className="flex-1 pr-2 truncate">
          {!isEditingBuilding ? (
            <>
              <div className="flex items-center gap-1.5 text-xs text-teal-400 font-mono-tactical font-medium">
                <span 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: building.color || '#2dd4bf' }}
                />
                <span className="truncate">{getAccessLabel(building.accessType)} · {building.floors} Niveles</span>
                {currentZone && (
                  <span className="text-slate-400 truncate">· {currentZone.name}</span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate mt-0.5">{building.name}</h2>
              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-400 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0 text-slate-500" />
                <span className="truncate">{building.address}</span>
              </div>
            </>
          ) : (
            <div className="space-y-1.5 py-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre del edificio / inmueble"
                className="w-full p-1.5 rounded-lg bg-slate-900 border border-teal-500 text-xs text-white"
              />
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Dirección"
                className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="text-[10px] text-slate-400">Pisos / Niveles</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editFloors}
                    onChange={(e) => setEditFloors(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400">Tipo de Acceso</label>
                  <select
                    value={editAccessType}
                    onChange={(e) => setEditAccessType(e.target.value as AccessType)}
                    className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300"
                  >
                    <option value="INTERCOM">Intercom</option>
                    <option value="GUARD">Vigilante</option>
                    <option value="GATE_SECURITY">Portón</option>
                    <option value="LOCKED">Cerrado</option>
                    <option value="FREE">Libre</option>
                  </select>
                </div>
              </div>
              {zones.length > 0 && (
                <select
                  value={editZoneId}
                  onChange={(e) => setEditZoneId(e.target.value)}
                  className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300"
                >
                  <option value="">Sin residencial asignado</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>
                      Residencial: {z.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onUpdateBuilding && (
            <button
              onClick={() => {
                if (isEditingBuilding) handleSaveBuildingEdits();
                else setIsEditingBuilding(true);
              }}
              className={`p-1.5 rounded-lg transition-colors ${isEditingBuilding ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title={isEditingBuilding ? 'Guardar cambios' : 'Editar inmueble'}
            >
              {isEditingBuilding ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => setIsExpandedMobile(!isExpandedMobile)}
            className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            {isExpandedMobile ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExpandedMobile && (
        <>
          {/* Quick Action Chips Bar */}
          <div className="px-3 pt-2 pb-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
            {onFlyToBuilding && (
              <button
                onClick={() => onFlyToBuilding(building)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap border border-slate-700 transition-all active:scale-95"
              >
                <Navigation className="w-3 h-3 text-teal-400" />
                <span>Centrar</span>
              </button>
            )}

            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition-all active:scale-95 ${
                showColorPicker
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Palette className="w-3 h-3 text-teal-400" />
              <span>Color</span>
            </button>

            {onDeleteBuilding && (
              <button
                onClick={handleDeleteBuilding}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-medium whitespace-nowrap border border-red-500/30 transition-all ml-auto active:scale-95"
              >
                <Trash2 className="w-3 h-3" />
                <span>Eliminar Inmueble</span>
              </button>
            )}
          </div>

          {/* Collapsible Color Customization Bar */}
          {showColorPicker && (
            <div className="px-3 py-1 bg-slate-900/60 border-y border-slate-800 animate-in fade-in">
              <ColorPickerBar
                currentColor={building.color}
                onSelectColor={handleColorChange}
                onResetColor={handleResetColor}
                label="Color del Edificio / Casa"
              />
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex items-center border-b border-slate-800 px-3 pt-1 text-xs font-medium gap-1 flex-shrink-0">
            <button
              onClick={() => setActiveTab('UNITS')}
              className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'UNITS'
                  ? 'border-teal-400 text-teal-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <DoorOpen className="w-3.5 h-3.5" />
              <span>Unidades ({apartments.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'HISTORY'
                  ? 'border-teal-400 text-teal-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Visitas ({visits.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('INFO')}
              className={`px-3 py-2 border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'INFO'
                  ? 'border-teal-400 text-teal-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Info</span>
            </button>
          </div>

          {/* Scrollable Tab Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-3">
            {activeTab === 'UNITS' && (
              <div className="space-y-3">
                {/* Units Action Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400 font-mono-tactical">
                    {apartments.length === 0 ? 'Sin apartamentos' : `${apartments.length} apartamento(s)`}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onCreateApartment && (
                      <>
                        <button
                          onClick={handleOpenAddUnit}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-900/30 transition-all active:scale-95"
                          title="Añadir un apartamento a este edificio"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Apto</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsBatchOpen(!isBatchOpen);
                            setIsAddingUnit(false);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all active:scale-95"
                          title="Crear múltiples apartamentos en lote"
                        >
                          <Layers className="w-3 h-3 text-teal-400" />
                          <span>Lote</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Inline Add Single Apartment Form */}
                {isAddingUnit && (
                  <div className="p-3 rounded-2xl bg-slate-900 border border-teal-500/60 shadow-xl space-y-2.5 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between text-xs font-bold text-teal-300">
                      <span className="flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-teal-400" />
                        Añadir Nuevo Apartamento
                      </span>
                      <button
                        onClick={() => setIsAddingUnit(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Número / Identificador</label>
                        <input
                          type="text"
                          value={newUnitNumber}
                          onChange={(e) => setNewUnitNumber(e.target.value)}
                          placeholder="ej. 101, 2-A"
                          className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-teal-400 text-xs text-white"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Piso / Nivel</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={newUnitFloor}
                          onChange={(e) => setNewUnitFloor(parseInt(e.target.value, 10) || 1)}
                          className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-teal-400 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={newUnitNotes}
                        onChange={(e) => setNewUnitNotes(e.target.value)}
                        placeholder="Nota o detalle (opcional, ej. Timbre azul)"
                        className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-teal-400 text-xs text-slate-300 placeholder-slate-600"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingUnit(false)}
                        className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting || !newUnitNumber.trim()}
                        onClick={handleSaveNewUnit}
                        className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 text-xs font-bold text-white shadow-lg shadow-teal-900/40 transition-all active:scale-95"
                      >
                        {isSubmitting ? 'Guardando...' : 'Guardar Apartamento'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Batch Generator Form */}
                {isBatchOpen && (
                  <div className="p-3 rounded-2xl bg-slate-900 border border-teal-500/60 shadow-xl space-y-2.5 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between text-xs font-bold text-teal-300">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-teal-400" />
                        Generador de Unidades en Lote
                      </span>
                      <button
                        onClick={() => setIsBatchOpen(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug">
                      Crea automáticamente las unidades para los pisos configurados (ej. 101, 102, 201, 202...).
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Pisos totales</label>
                        <input
                          type="number"
                          min="1"
                          max="40"
                          value={batchFloors}
                          onChange={(e) => setBatchFloors(parseInt(e.target.value, 10) || 1)}
                          className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Aptos por piso</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={batchUnitsPerFloor}
                          onChange={(e) => setBatchUnitsPerFloor(parseInt(e.target.value, 10) || 1)}
                          className="w-full p-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsBatchOpen(false)}
                        className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={isGeneratingBatch}
                        onClick={handleBatchGenerate}
                        className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 text-xs font-bold text-white shadow-lg shadow-teal-900/40 transition-all active:scale-95"
                      >
                        {isGeneratingBatch ? 'Generando...' : 'Crear Unidades'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Legend */}
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-[10px] font-mono-tactical">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Contactado</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Sin resp.</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Pendiente</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Acceso imp.</span>
                </div>

                {/* Units Grid */}
                {apartments.length === 0 ? (
                  <div className="text-center py-6 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
                    <DoorOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 mb-2">No hay apartamentos registrados aún.</p>
                    <button
                      onClick={handleOpenAddUnit}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 text-xs font-bold text-white hover:bg-teal-500 transition-colors"
                    >
                      + Añadir Primer Apartamento
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {apartments.map(apt => (
                      <button
                        key={apt.id}
                        onClick={() => setSelectedApartment(apt)}
                        className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all min-h-[52px] active:scale-95 ${
                          selectedApartment?.id === apt.id
                            ? 'ring-2 ring-teal-400 bg-teal-500/30 border-teal-400 shadow-md shadow-teal-900/40'
                            : getStatusColor(apt.calculatedStatus)
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs font-mono-tactical truncate">{apt.unitNumber}</span>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDot(apt.calculatedStatus)}`} />
                        </div>
                        <div className="text-[10px] opacity-80 mt-0.5 truncate">
                          Piso {apt.floor}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Apartment Management & Visit Registration */}
                {selectedApartment && (
                  <div className="mt-3 p-3 rounded-2xl bg-slate-900 border border-teal-500/60 shadow-2xl space-y-2.5 animate-in fade-in">
                    {/* Apartment Header with Edit & Delete options */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
                        <UserCheck className="w-4 h-4 text-teal-400" />
                        <span>Apto {selectedApartment.unitNumber} · Piso {selectedApartment.floor}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {onUpdateApartment && (
                          <button
                            onClick={() => setIsEditingUnit(!isEditingUnit)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isEditingUnit ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                            title="Editar número o piso"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteApartment && (
                          <button
                            onClick={() => setConfirmDeleteUnit(true)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                            title="Eliminar este apartamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedApartment(null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Delete Confirmation Box */}
                    {confirmDeleteUnit && (
                      <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/50 space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 text-red-300 font-semibold">
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <span>¿Eliminar Apto {selectedApartment.unitNumber}?</span>
                        </div>
                        <p className="text-[11px] text-red-200/80">
                          Se eliminará la unidad y su historial de visitas asociadas.
                        </p>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => setConfirmDeleteUnit(false)}
                            className="px-2.5 py-1 rounded-lg text-xs text-slate-300 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleDeleteCurrentUnit}
                            className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                          >
                            Sí, Eliminar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Inline Unit Edit Form */}
                    {isEditingUnit ? (
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                        <div className="text-[11px] font-semibold text-teal-300">Modificar Datos de la Unidad</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Número</label>
                            <input
                              type="text"
                              value={editUnitNumber}
                              onChange={(e) => setEditUnitNumber(e.target.value)}
                              className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">Piso</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={editUnitFloor}
                              onChange={(e) => setEditUnitFloor(parseInt(e.target.value, 10) || 1)}
                              className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Notas</label>
                          <input
                            type="text"
                            value={editUnitNotes}
                            onChange={(e) => setEditUnitNotes(e.target.value)}
                            placeholder="Notas de la unidad"
                            className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => setIsEditingUnit(false)}
                            className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleUpdateCurrentUnit}
                            className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 font-bold text-white text-xs shadow-md transition-all active:scale-95"
                          >
                            Guardar Cambios
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Visit Options */}
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setVisitResult('CONTACTED')}
                            className={`p-2 rounded-xl border text-left font-medium transition-all ${
                              visitResult === 'CONTACTED'
                                ? 'bg-emerald-500/30 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500'
                                : 'bg-slate-800/80 border-slate-700 text-slate-300'
                            }`}
                          >
                            🟢 Contactado
                          </button>

                          <button
                            type="button"
                            onClick={() => setVisitResult('NO_ANSWER')}
                            className={`p-2 rounded-xl border text-left font-medium transition-all ${
                              visitResult === 'NO_ANSWER'
                                ? 'bg-amber-500/30 border-amber-500 text-amber-200 ring-1 ring-amber-500'
                                : 'bg-slate-800/80 border-slate-700 text-slate-300'
                            }`}
                          >
                            🟠 Sin respuesta
                          </button>

                          <button
                            type="button"
                            onClick={() => setVisitResult('ACCESS_PROBLEM')}
                            className={`p-2 rounded-xl border text-left font-medium transition-all ${
                              visitResult === 'ACCESS_PROBLEM'
                                ? 'bg-red-500/30 border-red-500 text-red-200 ring-1 ring-red-500'
                                : 'bg-slate-800/80 border-slate-700 text-slate-300'
                            }`}
                          >
                            🔴 No acceso
                          </button>

                          <button
                            type="button"
                            onClick={() => setVisitResult('REFUSED')}
                            className={`p-2 rounded-xl border text-left font-medium transition-all ${
                              visitResult === 'REFUSED'
                                ? 'bg-purple-500/30 border-purple-500 text-purple-200 ring-1 ring-purple-500'
                                : 'bg-slate-800/80 border-slate-700 text-slate-300'
                            }`}
                          >
                            ⛔ Rechazado
                          </button>
                        </div>

                        <textarea
                          value={visitNote}
                          onChange={(e) => setVisitNote(e.target.value)}
                          rows={2}
                          placeholder="Nota breve (opcional)..."
                          className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                        />

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleSaveVisit}
                          className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-lg shadow-teal-900/40 transition-all active:scale-98"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSubmitting ? 'Guardando...' : 'Guardar Visita'}</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'HISTORY' && (
              <div className="space-y-2">
                {visits.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    Aún no hay visitas registradas para este edificio.
                  </div>
                ) : (
                  visits.map(v => (
                    <div key={v.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">
                          {v.result === 'CONTACTED' && '🟢 Contactado'}
                          {v.result === 'NO_ANSWER' && '🟠 Sin respuesta'}
                          {v.result === 'ACCESS_PROBLEM' && '🔴 Problema acceso'}
                          {v.result === 'REFUSED' && '⛔ Rechazado'}
                          {v.result === 'NOT_HOME' && '🟡 No estaba'}
                          {v.result === 'OTHER' && '⚪ Otro'}
                        </span>
                        <span className="text-[10px] font-mono-tactical text-slate-400">
                          {new Date(v.visitedAt).toLocaleDateString('es-DO', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      {v.note && (
                        <p className="text-[11px] text-slate-300 italic bg-slate-950/40 p-1.5 rounded-lg">
                          "{v.note}"
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'INFO' && (
              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Tipo de estructura</span>
                    <span className="font-medium text-slate-200">{building.buildingType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Acceso principal</span>
                    <span className="font-medium text-slate-200">{getAccessLabel(building.accessType)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Pisos y unidades</span>
                    <span className="font-medium text-slate-200">{building.floors} niveles · {apartments.length} unidades</span>
                  </div>
                  {building.notes && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Notas</span>
                      <p className="text-slate-300 mt-0.5">{building.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
};
