import React, { useMemo } from 'react';
import { MatchType, Location, Ambulance, Staff, Match } from '../../types';
import { Zap, X, Plus, AlertTriangle } from 'lucide-react';

interface QuickAddRow {
    id: string;
    time: string;
    location: string;
    fieldNumber: string;
    ambulanceId: string;
    driverId: string;
    nurseId: string;
    type: MatchType;
}

interface QuickAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: string;
    setDate: (date: string) => void;
    rows: QuickAddRow[];
    setRows: React.Dispatch<React.SetStateAction<QuickAddRow[]>>;
    onSave: () => void;
    locations: Location[];
    ambulances: Ambulance[];
    staff: Staff[];
    existingMatches?: Match[]; // Matches that already exist in the system
}

// Helper to convert time to minutes
const timeToMinutes = (timeStr?: string) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
};

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
    isOpen, onClose, date, setDate, rows, setRows, onSave, locations, ambulances, staff, existingMatches = []
}) => {
    if (!isOpen) return null;

    // Calculate conflicts between rows themselves and with existing matches
    const conflicts = useMemo(() => {
        const conflictMap: Record<string, { field: string; conflictWith: string }[]> = {};

        // Filter existing matches for the same date
        const sameDayMatches = existingMatches.filter(m => m.date === date && m.status !== 'Suspended');

        rows.forEach((row, idx) => {
            const rowConflicts: { field: string; conflictWith: string }[] = [];
            const rowStart = timeToMinutes(row.time);
            const rowEnd = rowStart + 90 + 15; // 90 min default + 15 buffer

            // Check conflicts with OTHER rows in the quick add
            rows.forEach((other, otherIdx) => {
                if (idx >= otherIdx) return; // Only check forward to avoid duplicates

                const otherStart = timeToMinutes(other.time);
                const otherEnd = otherStart + 90 + 15;

                // Check for time overlap
                const overlaps = !(rowEnd <= otherStart || rowStart >= otherEnd);
                if (!overlaps) return;

                // Check for resource conflicts
                if (row.ambulanceId && row.ambulanceId === other.ambulanceId) {
                    rowConflicts.push({ field: 'ambulanceId', conflictWith: `Fila ${otherIdx + 1}` });
                }
                if (row.driverId && row.driverId === other.driverId) {
                    rowConflicts.push({ field: 'driverId', conflictWith: `Fila ${otherIdx + 1}` });
                }
                if (row.nurseId && row.nurseId === other.nurseId) {
                    rowConflicts.push({ field: 'nurseId', conflictWith: `Fila ${otherIdx + 1}` });
                }
            });

            // Check conflicts with EXISTING matches in the system
            sameDayMatches.forEach(existing => {
                const existingStart = timeToMinutes(existing.time);
                const existingEnd = existingStart + (existing.durationMinutes || 90) + 15;

                const overlaps = !(rowEnd <= existingStart || rowStart >= existingEnd);
                if (!overlaps) return;

                if (row.ambulanceId && row.ambulanceId === existing.ambulanceId) {
                    rowConflicts.push({ field: 'ambulanceId', conflictWith: `${existing.location} (existente)` });
                }
                if (row.driverId && row.driverId === existing.driverId) {
                    rowConflicts.push({ field: 'driverId', conflictWith: `${existing.location} (existente)` });
                }
                if (row.nurseId && row.nurseId === existing.nurseId) {
                    rowConflicts.push({ field: 'nurseId', conflictWith: `${existing.location} (existente)` });
                }
            });

            if (rowConflicts.length > 0) {
                conflictMap[row.id] = rowConflicts;
            }
        });

        return conflictMap;
    }, [rows, date, existingMatches]);

    const updateQuickRow = (id: string, field: keyof QuickAddRow, value: string) => {
        setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const addQuickRow = () => {
        const lastRow = rows[rows.length - 1];
        setRows(prev => [...prev, {
            id: Math.random().toString(),
            time: lastRow ? lastRow.time : '14:00',
            location: lastRow ? lastRow.location : '',
            fieldNumber: '',
            ambulanceId: '',
            driverId: '',
            nurseId: '',
            type: 'Partido de Polo'
        }]);
    };

    const removeQuickRow = (id: string) => {
        if (rows.length > 1) {
            setRows(prev => prev.filter(r => r.id !== id));
        }
    };

    // Helper to check if a specific field has a conflict
    const hasFieldConflict = (rowId: string, field: string) => {
        return conflicts[rowId]?.some(c => c.field === field);
    };

    const getFieldConflictTooltip = (rowId: string, field: string) => {
        const fieldConflicts = conflicts[rowId]?.filter(c => c.field === field);
        if (!fieldConflicts || fieldConflicts.length === 0) return '';
        return `Conflicto con: ${fieldConflicts.map(c => c.conflictWith).join(', ')}`;
    };


    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500 fill-amber-500" /> Carga Rápida de Coberturas
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Ingrese múltiples partidos para una misma fecha rápidamente.</p>
                    </div>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400" /></button>
                </div>

                <div className="p-4 border-b bg-white flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-bold text-slate-700">Fecha Común:</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                    </div>
                </div>

                <div className="p-4 overflow-auto flex-1">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-600 sticky top-0 z-10">
                            <tr>
                                <th className="p-2 text-left w-24">Hora</th>
                                <th className="p-2 text-left w-48">Lugar/Sede</th>
                                <th className="p-2 text-left w-40">Detalle/Cancha</th>
                                <th className="p-2 text-left w-24">Tipo</th>
                                <th className="p-2 text-left w-32">Móvil</th>
                                <th className="p-2 text-left w-32">Chofer</th>
                                <th className="p-2 text-left w-32">Enfermero/a</th>
                                <th className="p-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {rows.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50">
                                    <td className="p-2">
                                        <input
                                            type="time"
                                            value={row.time}
                                            onChange={(e) => updateQuickRow(row.id, 'time', e.target.value)}
                                            className="w-full border rounded p-1"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            list="locations-list-quick"
                                            value={row.location}
                                            onChange={(e) => updateQuickRow(row.id, 'location', e.target.value)}
                                            placeholder="Lugar"
                                            className="w-full border rounded p-1"
                                        />
                                        <datalist id="locations-list-quick">
                                            {locations.map(l => <option key={l.id} value={l.name} />)}
                                        </datalist>
                                    </td>
                                    <td className="p-2">
                                        <input
                                            value={row.fieldNumber}
                                            onChange={(e) => updateQuickRow(row.id, 'fieldNumber', e.target.value)}
                                            placeholder="Ej: Cancha 1"
                                            className="w-full border rounded p-1"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <select
                                            value={row.type}
                                            onChange={(e) => updateQuickRow(row.id, 'type', e.target.value as MatchType)}
                                            className="w-full border rounded p-1 bg-white"
                                        >
                                            <option value="Partido de Polo">Partido de Polo</option>
                                            <option value="Práctica de Polo">Práctica de Polo</option>
                                            <option value="Triangular de Polo">Triangular de Polo</option>
                                            <option value="Partido de Fútbol">Partido de Fútbol</option>
                                            <option value="Evento">Evento</option>
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <div className="relative">
                                            <select
                                                value={row.ambulanceId}
                                                onChange={(e) => updateQuickRow(row.id, 'ambulanceId', e.target.value)}
                                                className={`w-full border rounded p-1 bg-white text-xs ${hasFieldConflict(row.id, 'ambulanceId') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                                                title={getFieldConflictTooltip(row.id, 'ambulanceId')}
                                            >
                                                <option value="">--</option>
                                                {ambulances.map(a => <option key={a.id} value={a.id}>{a.number}</option>)}
                                            </select>
                                            {hasFieldConflict(row.id, 'ambulanceId') && (
                                                <AlertTriangle className="w-4 h-4 text-red-500 absolute -right-1 -top-1" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        <div className="relative">
                                            <select
                                                value={row.driverId}
                                                onChange={(e) => updateQuickRow(row.id, 'driverId', e.target.value)}
                                                className={`w-full border rounded p-1 bg-white text-xs ${hasFieldConflict(row.id, 'driverId') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                                                title={getFieldConflictTooltip(row.id, 'driverId')}
                                            >
                                                <option value="">--</option>
                                                {staff.filter(s => s.role === 'Chofer').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            {hasFieldConflict(row.id, 'driverId') && (
                                                <AlertTriangle className="w-4 h-4 text-red-500 absolute -right-1 -top-1" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        <div className="relative">
                                            <select
                                                value={row.nurseId}
                                                onChange={(e) => updateQuickRow(row.id, 'nurseId', e.target.value)}
                                                className={`w-full border rounded p-1 bg-white text-xs ${hasFieldConflict(row.id, 'nurseId') ? 'border-red-500 border-2 bg-red-50' : ''}`}
                                                title={getFieldConflictTooltip(row.id, 'nurseId')}
                                            >
                                                <option value="">--</option>
                                                {staff.filter(s => s.role === 'Enfermero/a').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            {hasFieldConflict(row.id, 'nurseId') && (
                                                <AlertTriangle className="w-4 h-4 text-red-500 absolute -right-1 -top-1" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => removeQuickRow(row.id)} className="text-slate-400 hover:text-red-500">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <button onClick={addQuickRow} className="mt-4 flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-800 text-sm">
                        <Plus className="w-4 h-4" /> Agregar Fila
                    </button>
                </div>

                <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600">Cancelar</button>
                    <button onClick={onSave} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm">
                        Guardar Todas
                    </button>
                </div>
            </div>
        </div>
    );
};

export type { QuickAddRow };
