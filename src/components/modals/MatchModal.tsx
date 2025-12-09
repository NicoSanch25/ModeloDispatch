import React, { useState, useEffect } from 'react';
import { Match, MatchType, Location, Client, Staff, Ambulance } from '../../types';
import { X, Lock, Unlock, Briefcase, Siren, Trash2, UserPlus } from 'lucide-react';
import { matchesService } from '../../services/matches';
import { resourceService } from '../../services/resources';

interface MatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    editingMatch: Partial<Match> | null;
    locations: Location[];
    clients: Client[];
    staff: Staff[];
    ambulances: Ambulance[];
}

export const MatchModal: React.FC<MatchModalProps> = ({
    isOpen, onClose, onSaveSuccess, editingMatch, locations, clients, staff, ambulances
}) => {
    if (!isOpen) return null;

    const [isReadOnly, setIsReadOnly] = useState(false);
    const [showChukkers, setShowChukkers] = useState(false);
    const [showSuspensionReason, setShowSuspensionReason] = useState(false);
    const [statusValue, setStatusValue] = useState(editingMatch?.status || 'Pending');
    const [typeValue, setTypeValue] = useState(editingMatch?.type || 'Partido de Polo');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (editingMatch && editingMatch.status === 'Completed') {
            setIsReadOnly(true);
        } else {
            setIsReadOnly(false);
        }

        setStatusValue(editingMatch?.status || 'Pending');
        setShowSuspensionReason(editingMatch?.status === 'Suspended');

        const type = editingMatch?.type || 'Partido de Polo';
        setTypeValue(type);
        setShowChukkers(type.includes('Polo'));
    }, [editingMatch]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);

        const matchData: Partial<Match> = {
            id: editingMatch?.id,
            date: formData.get('date') as string,
            time: formData.get('time') as string,
            location: formData.get('location') as string,
            fieldNumber: formData.get('fieldNumber') as string,
            type: formData.get('type') as MatchType,
            chukkers: Number(formData.get('chukkers') || 0),
            durationMinutes: Number(formData.get('durationMinutes') || 90),
            extensionMinutes: Number(formData.get('extensionMinutes') || 0),
            status: formData.get('status') as any,
            suspensionReason: formData.get('suspensionReason') as string,
            clientId: formData.get('clientId') as string,
            hiredBy: formData.get('hiredBy') as string,
            hiredContact: formData.get('hiredContact') as string,
            isSingleCrew: formData.get('isSingleCrew') === 'on',
            ambulanceId: formData.get('ambulanceId') as string,
            driverId: formData.get('driverId') as string,
            nurseId: formData.get('nurseId') as string,
            thirdCrewId: formData.get('thirdCrewId') as string,
        };

        try {
            // 1. Handle New Location
            if (matchData.location) {
                const locName = matchData.location.trim();
                const exists = locations.some(l => l.name.toLowerCase() === locName.toLowerCase());
                if (!exists) {
                    await resourceService.createLocation(locName);
                }
            }

            // 2. Handle Audit Logs (only on update)
            if (editingMatch && editingMatch.id) {
                const changes: string[] = [];
                const norm = (val: any) => (val || '').toString().trim();
                const m = editingMatch;
                const d = matchData;

                if (norm(m.status) !== norm(d.status)) changes.push(`Estado: ${m.status} -> ${d.status}`);
                if (norm(m.time) !== norm(d.time)) changes.push(`Hora: ${m.time} -> ${d.time}`);
                if (norm(m.location) !== norm(d.location)) changes.push(`Lugar: ${m.location} -> ${d.location}`);
                if (norm(m.ambulanceId) !== norm(d.ambulanceId)) changes.push('Cambio de Móvil');
                if (norm(m.driverId) !== norm(d.driverId)) changes.push('Cambio de Chofer');
                if (m.isSingleCrew !== d.isSingleCrew) changes.push(`Tripulación: ${d.isSingleCrew ? 'Simple' : 'Completa'}`);

                if (changes.length > 0) {
                    await matchesService.addAuditLog(m.id, changes.join(', '));
                }
            }

            // 3. Save Match
            await matchesService.saveMatch(matchData);

            onSaveSuccess();
            onClose();
        } catch (error: any) {
            alert('Error guardando cobertura: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!editingMatch || !confirm('¿Seguro que desea eliminar esta cobertura?')) return;
        setIsLoading(true);
        try {
            await matchesService.deleteMatch(editingMatch.id);
            onSaveSuccess();
            onClose();
        } catch (error: any) {
            alert('Error eliminando: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value as MatchType;
        setTypeValue(val);
        setShowChukkers(val.includes('Polo'));
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setStatusValue(val as any);
        setShowSuspensionReason(val === 'Suspended');
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b bg-slate-50 rounded-t-xl flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h3 className="text-xl font-bold text-slate-800">{editingMatch ? 'Editar Cobertura' : 'Nueva Cobertura'}</h3>
                            {editingMatch?.status === 'Completed' && (
                                isReadOnly ? (
                                    <button type="button" onClick={() => setIsReadOnly(false)} className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded border border-amber-200 font-bold hover:bg-amber-200 transition-colors">
                                        <Lock className="w-3 h-3" /> Historial Bloqueado (Click para Editar)
                                    </button>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded border border-red-200 font-bold">
                                        <Unlock className="w-3 h-3" /> Edición Auditada
                                    </span>
                                )
                            )}
                        </div>
                        <button type="button" onClick={onClose}><X className="w-6 h-6 text-slate-400" /></button>
                    </div>

                    <div className={`p-8 space-y-6 ${isReadOnly ? 'opacity-80 pointer-events-none grayscale-[0.5]' : ''}`}>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                                <input name="date" type="date" required defaultValue={editingMatch?.date || new Date().toISOString().split('T')[0]} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Hora Inicio</label>
                                <input name="time" type="time" required defaultValue={editingMatch?.time || '14:00'} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                                <select name="type" value={typeValue} onChange={handleTypeChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="Partido de Polo">Partido de Polo</option>
                                    <option value="Práctica de Polo">Práctica de Polo</option>
                                    <option value="Triangular de Polo">Triangular de Polo</option>
                                    <option value="Partido de Fútbol">Partido de Fútbol</option>
                                    <option value="Evento">Evento</option>
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Estado</label>
                                <select name="status" value={statusValue} onChange={handleStatusChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium">
                                    <option value="Pending">Pendiente</option>
                                    <option value="Confirmed">Confirmado</option>
                                    <option value="Completed">Completado</option>
                                    <option value="Suspended">Suspendido</option>
                                </select>
                            </div>
                        </div>

                        {showSuspensionReason && (
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100 animate-in fade-in">
                                <label className="block text-sm font-bold text-red-700 mb-1">Motivo de Suspensión</label>
                                <input name="suspensionReason" defaultValue={editingMatch?.suspensionReason} className="w-full p-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 text-red-800" placeholder="Ej: Lluvia..." />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Lugar / Sede</label>
                                <input list="locations-list" name="location" required defaultValue={editingMatch?.location} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Seleccionar o escribir..." />
                                <datalist id="locations-list">
                                    {locations.map(l => <option key={l.id} value={l.name} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Detalle / Cancha</label>
                                <input name="fieldNumber" defaultValue={editingMatch?.fieldNumber} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: Cancha 1..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div style={{ visibility: showChukkers ? 'visible' : 'hidden' }}>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Chukkers (0-20)</label>
                                <input name="chukkers" type="number" min="0" max="20" defaultValue={editingMatch?.chukkers} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tiempo Extra (min)</label>
                                <input name="extensionMinutes" type="number" min="0" defaultValue={editingMatch?.extensionMinutes || 0} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Ej: 30" />
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                            <h4 className="font-bold text-slate-700 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Datos del Cliente</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente Registrado</label>
                                    <select name="clientId" defaultValue={editingMatch?.clientId} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 text-sm">
                                        <option value="">-- Seleccionar Cliente --</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contratado Por (Manual)</label>
                                    <input name="hiredBy" defaultValue={editingMatch?.hiredBy} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contacto</label>
                                    <input name="hiredContact" defaultValue={editingMatch?.hiredContact} className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 text-sm" />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-indigo-900 flex items-center gap-2"><Siren className="w-4 h-4" /> Asignación de Recursos</h4>
                                <label className="flex items-center gap-2 text-sm text-indigo-900 font-medium cursor-pointer">
                                    <input type="checkbox" name="isSingleCrew" defaultChecked={editingMatch?.isSingleCrew} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                                    Tripulación Simple
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Ambulancia</label>
                                    <select name="ambulanceId" defaultValue={editingMatch?.ambulanceId} className="w-full p-2 border border-indigo-200 rounded text-sm focus:ring-2 focus:ring-indigo-500">
                                        <option value="">Sin Asignar</option>
                                        {ambulances.map(a => (
                                            <option key={a.id} value={a.id}>Móvil {a.number} {a.isOutsourced ? '(Ext)' : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Chofer</label>
                                    <select name="driverId" defaultValue={editingMatch?.driverId} className="w-full p-2 border border-indigo-200 rounded text-sm focus:ring-2 focus:ring-indigo-500">
                                        <option value="">Sin Asignar</option>
                                        {staff.filter(s => s.role === 'Chofer').map(s => <option key={s.id} value={s.id}>{s.name} {s.isOutsourced ? '(Ext)' : ''}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Enfermero/a</label>
                                    <select name="nurseId" defaultValue={editingMatch?.nurseId} className="w-full p-2 border border-indigo-200 rounded text-sm focus:ring-2 focus:ring-indigo-500">
                                        <option value="">Sin Asignar</option>
                                        {staff.filter(s => s.role === 'Enfermero/a').map(s => <option key={s.id} value={s.id}>{s.name} {s.isOutsourced ? '(Ext)' : ''}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2 pt-2 border-t border-indigo-200/50">
                                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1 flex items-center gap-2">
                                        <UserPlus className="w-3 h-3" /> 3er Tripulante (Opcional)
                                    </label>
                                    <select name="thirdCrewId" defaultValue={editingMatch?.thirdCrewId} className="w-full p-2 border border-indigo-200 rounded text-sm focus:ring-2 focus:ring-indigo-500">
                                        <option value="">Nadie</option>
                                        {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role}) {s.isOutsourced ? '(Ext)' : ''}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t bg-slate-50 rounded-b-xl flex flex-col md:flex-row justify-between gap-3">
                        {editingMatch && !isReadOnly && (
                            <button type="button" onClick={handleDelete} className="px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 font-medium flex items-center justify-center gap-2 order-2 md:order-1">
                                <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                        )}
                        <div className="flex gap-3 ml-auto order-1 md:order-2 w-full md:w-auto">
                            <button type="button" onClick={onClose} className="flex-1 md:flex-none px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-200 font-medium">Cancelar</button>
                            {!isReadOnly && (
                                <button type="submit" disabled={isLoading} className="flex-1 md:flex-none px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-lg shadow-indigo-200">
                                    {isLoading ? 'Guardando...' : (editingMatch ? 'Guardar' : 'Crear')}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
