import React, { useState } from 'react';
import { Staff, Ambulance, FuelRecord } from '../../types';
import { ListPlus, X, Trash2, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Using supabase directly or I should add to resourceService

// Temporary import of supabase here, but ideally should use resourceService.
// I will update resourceService to include saveFuelBatch later or now.
// For now, I'll inline the supabase call or mock it.
// Actually I'll use `onSave` prop that takes the records, or handle it here?
// The instructions said "Extract logic". I'll put logic here.

interface FuelBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    staff: Staff[];
    ambulances: Ambulance[];
}

export const FuelBatchModal: React.FC<FuelBatchModalProps> = ({ isOpen, onClose, onSaveSuccess, staff, ambulances }) => {
    if (!isOpen) return null;

    const [rows, setRows] = useState<Partial<FuelRecord>[]>([]);

    const addRow = () => {
        const lastRow = rows[rows.length - 1];
        setRows([...rows, { date: lastRow?.date || new Date().toISOString().split('T')[0], fuelType: 'Euro Diesel', liters: 0 }]);
    };

    const updateRow = (index: number, field: keyof FuelRecord, value: any) => {
        const newRows = [...rows];
        newRows[index] = { ...newRows[index], [field]: value };
        setRows(newRows);
    };

    const removeRow = (index: number) => {
        setRows(rows.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        const newRecords = rows.filter(r => r.liters && r.ambulanceId && r.driverId).map(r => ({
            date: r.date || new Date().toISOString().split('T')[0],
            ambulance_id: r.ambulanceId,
            driver_id: r.driverId,
            fuel_type: r.fuelType || 'Euro Diesel',
            liters: Number(r.liters),
            items: r.items
        }));

        if (newRecords.length === 0) return;

        try {
            const { error } = await supabase.from('fuel_records').insert(newRecords);
            if (error) throw error;
            onSaveSuccess();
            onClose();
            setRows([]);
        } catch (err: any) {
            alert("Error guardando combustible: " + err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <ListPlus className="w-5 h-5 text-indigo-600" /> Carga Masiva de Combustible
                    </h3>
                    <button onClick={onClose}><X className="w-6 h-6" /></button>
                </div>
                <div className="p-4 overflow-x-auto flex-1">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-600">
                            <tr>
                                <th className="p-2 text-left rounded-l-lg">Fecha</th>
                                <th className="p-2 text-left">Móvil</th>
                                <th className="p-2 text-left">Chofer</th>
                                <th className="p-2 text-left">Combustible</th>
                                <th className="p-2 text-left">Litros</th>
                                <th className="p-2 text-left">Items Extra</th>
                                <th className="p-2 text-left rounded-r-lg"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {rows.map((row, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50">
                                    <td className="p-2">
                                        <input type="date" value={row.date} onChange={(e) => updateRow(idx, 'date', e.target.value)} className="w-32 border rounded p-1" />
                                    </td>
                                    <td className="p-2">
                                        <select value={row.ambulanceId || ''} onChange={(e) => updateRow(idx, 'ambulanceId', e.target.value)} className="w-24 border rounded p-1">
                                            <option value="">Sel...</option>
                                            {ambulances.map(a => <option key={a.id} value={a.id}>{a.number}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <select value={row.driverId || ''} onChange={(e) => updateRow(idx, 'driverId', e.target.value)} className="w-32 border rounded p-1">
                                            <option value="">Sel...</option>
                                            {staff.filter(s => s.role === 'Chofer').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <select value={row.fuelType} onChange={(e) => updateRow(idx, 'fuelType', e.target.value)} className="w-32 border rounded p-1">
                                            <option value="Euro Diesel">Euro Diesel</option>
                                            <option value="Nafta Super">Nafta Super</option>
                                            <option value="Nafta Premium">Nafta Premium</option>
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <input type="number" value={row.liters} onChange={(e) => updateRow(idx, 'liters', e.target.value)} className="w-20 border rounded p-1" step="0.1" />
                                    </td>
                                    <td className="p-2">
                                        <input type="text" value={row.items || ''} onChange={(e) => updateRow(idx, 'items', e.target.value)} placeholder="Ej: Aceite" className="w-32 border rounded p-1" />
                                    </td>
                                    <td className="p-2">
                                        <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <button onClick={addRow} className="mt-4 flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-800">
                        <Plus className="w-4 h-4" /> Agregar Fila
                    </button>
                </div>
                <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600">Cancelar</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Guardar Todo</button>
                </div>
            </div>
        </div>
    );
};
