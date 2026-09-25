import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  ShieldAlert, 
  History, 
  FileText, 
  DoorOpen, 
  Send, 
  UserCheck, 
  ChevronDown, 
  ChevronUp,
  Edit2,
  Save,
  Trash2
} from 'lucide-react';
import { Building, Apartment, Visit, Restriction, VisitResult, ApartmentStatus, AccessType, BuildingType } from '../types';

interface DetailPanelProps {
  building: Building | null;
  apartments: Apartment[];
  visits: Visit[];
  restrictions: Restriction[];
  onClose: () => void;
  onRecordVisit: (data: {
    apartmentId: string;
    buildingId: string;
    result: VisitResult;
    note?: string;
  }) => Promise<void>;
  onUpdateBuilding?: (buildingId: string, updates: Partial<Building>) => Promise<void>;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  building,
  apartments,
  visits,
  restrictions,
  onClose,
  onRecordVisit,
  onUpdateBuilding
}) => {
  const [activeTab, setActiveTab] = useState<'UNITS' | 'HISTORY' | 'INFO'>('UNITS');
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [visitResult, setVisitResult] = useState<VisitResult>('CONTACTED');
  const [visitNote, setVisitNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpandedMobile, setIsExpandedMobile] = useState(true);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(building?.name || '');
  const [editAddress, setEditAddress] = useState(building?.address || '');
  const [editFloors, setEditFloors] = useState(building?.floors || 4);
  const [editAccessType, setEditAccessType] = useState<AccessType>(building?.accessType || 'INTERCOM');

  // Sync edit fields when building changes
  React.useEffect(() => {
    if (building) {
      setEditName(building.name);
      setEditAddress(building.address);
      setEditFloors(building.floors);
      setEditAccessType(building.accessType);
      setIsEditing(false);
    }
  }, [building]);

  if (!building) return null;

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
        accessType: editAccessType
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating building:', err);
      alert('Error al guardar modificaciones del edificio');
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

  return (
    <aside 
      className={`fixed z-40 transition-all duration-300 select-none
        /* Mobile: Bottom Sheet */
        bottom-0 left-0 right-0 max-h-[85vh] bg-slate-950/98 backdrop-blur-2xl border-t border-slate-700/80 shadow-[0_-12px_45px_rgba(0,0,0,0.7)] rounded-t-3xl flex flex-col
        /* Desktop: Right Slide-over */
        sm:top-14 sm:bottom-12 sm:right-0 sm:left-auto sm:w-96 sm:rounded-none sm:border-t-0 sm:border-l sm:max-h-none sm:shadow-2xl
      `}
    >
      {/* Mobile Drag Handle */}
      <div 
        onClick={() => setIsExpandedMobile(!isExpandedMobile)}
        className="sm:hidden w-full pt-3 pb-1 flex flex-col items-center justify-center cursor-pointer"
      >
        <div className="w-12 h-1.5 rounded-full bg-slate-600" />
      </div>

      {/* Header */}
      <div className="px-4 py-2 border-b border-slate-800/80 flex items-start justify-between">
        <div className="flex-1 pr-2 truncate">
          {!isEditing ? (
            <>
              <div className="flex items-center gap-1.5 text-xs text-teal-400 font-mono-tactical font-medium">
                <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{getAccessLabel(building.accessType)} · {building.floors} Pisos</span>
              </div>
              <h2 className="text-base font-bold text-slate-100 truncate mt-0.5">{building.name}</h2>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 truncate">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                <span className="truncate">{building.address}</span>
              </div>
            </>
          ) : (
            <div className="space-y-1.5 py-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre del edificio"
                className="w-full p-1.5 rounded-lg bg-slate-900 border border-teal-500 text-xs text-white"
              />
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Dirección"
                className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onUpdateBuilding && (
            <button
              onClick={() => {
                if (isEditing) handleSaveBuildingEdits();
                else setIsEditing(true);
              }}
              className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
              title={isEditing ? 'Guardar cambios' : 'Editar datos'}
            >
              {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => setIsExpandedMobile(!isExpandedMobile)}
            className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:text-white"
          >
            {isExpandedMobile ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Cerrar panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isExpandedMobile && (
        <>
          {/* Restrictions / Alerts Banner */}
          {restrictions.length > 0 && (
            <div className="mx-3 mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-amber-300">Restricción activa:</div>
                {restrictions.map(r => (
                  <div key={r.id} className="text-[11px] text-amber-200/90 mt-0.5">
                    • {r.description}
                  </div>
                ))}
              </div>
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
              <span>Aptos ({apartments.length})</span>
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
              <span>Historial ({visits.length})</span>
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
              <span>Detalles</span>
            </button>
          </div>

          {/* Scrollable Tab Body */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {activeTab === 'UNITS' && (
              <div className="space-y-3">
                {/* Status Legend */}
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-[10px] sm:text-[11px] font-mono-tactical">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Contactado</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Sin resp.</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Pendiente</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Acceso imp.</span>
                </div>

                {/* Units Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {apartments.map(apt => (
                    <button
                      key={apt.id}
                      onClick={() => setSelectedApartment(apt)}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all min-h-[56px] active:scale-95 ${
                        selectedApartment?.id === apt.id
                          ? 'ring-2 ring-teal-400 bg-teal-500/30 border-teal-400'
                          : getStatusColor(apt.calculatedStatus)
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs font-mono-tactical">{apt.unitNumber}</span>
                        <span className={`w-2 h-2 rounded-full ${getStatusDot(apt.calculatedStatus)}`} />
                      </div>
                      <div className="text-[10px] opacity-80 mt-1">
                        Piso {apt.floor}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Visit Registration Form (Inline Drawer) */}
                {selectedApartment && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-slate-900 border border-teal-500/40 shadow-2xl space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
                        <UserCheck className="w-4 h-4 text-teal-400" />
                        <span>Registrar Visita · Apto {selectedApartment.unitNumber}</span>
                      </div>
                      <button
                        onClick={() => setSelectedApartment(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setVisitResult('CONTACTED')}
                        className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
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
                        className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
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
                        className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                          visitResult === 'ACCESS_PROBLEM'
                            ? 'bg-red-500/30 border-red-500 text-red-200 ring-1 ring-red-500'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300'
                        }`}
                      >
                        🔴 Problema acceso
                      </button>

                      <button
                        type="button"
                        onClick={() => setVisitResult('REFUSED')}
                        className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
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
                      placeholder="Nota rápida de la visita (opcional)..."
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-teal-500 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
                    />

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSaveVisit}
                      className="w-full py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-lg shadow-teal-900/40 transition-all active:scale-98"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Guardando...' : 'Registrar Visita'}</span>
                    </button>
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
                    <div key={v.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">
                          {v.result === 'CONTACTED' && '🟢 Contactado'}
                          {v.result === 'NO_ANSWER' && '🟠 Sin respuesta'}
                          {v.result === 'ACCESS_PROBLEM' && '🔴 Problema de acceso'}
                          {v.result === 'REFUSED' && '⛔ Rechazado'}
                          {v.result === 'NOT_HOME' && '🟡 No estaba en casa'}
                          {v.result === 'OTHER' && '⚪ Otro'}
                        </span>
                        <span className="text-[10px] font-mono-tactical text-slate-400">
                          {new Date(v.visitedAt).toLocaleString('es-DO', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </span>
                      </div>
                      {v.note && (
                        <p className="text-[11px] text-slate-300 italic bg-slate-950/40 p-1.5 rounded-lg">
                          "{v.note}"
                        </p>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono-tactical pt-1 border-t border-slate-800/40">
                        <span>Usuario: {v.userId}</span>
                        <span>Op: {v.operationId.substring(0, 14)}...</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'INFO' && (
              <div className="space-y-3 text-xs">
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
                      <span className="text-slate-400 block text-[11px]">Notas operativas</span>
                      <p className="text-slate-300 mt-0.5">{building.notes}</p>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 font-mono-tactical text-[11px] space-y-1 text-slate-400">
                  <div className="text-slate-300 font-bold uppercase">Georreferencia:</div>
                  <div>Lat: {building.center[1].toFixed(6)}° N</div>
                  <div>Lon: {building.center[0].toFixed(6)}° W</div>
                  <div>ID: {building.id}</div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
};
