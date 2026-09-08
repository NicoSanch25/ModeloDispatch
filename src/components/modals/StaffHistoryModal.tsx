import React from 'react';
import { Staff, Match, Ambulance } from '../../types';
import { History, X } from 'lucide-react';
import { matchHelpers } from '../../services/matches';
import { formatTime24, formatDateAR } from '../../utils/formatters';

interface StaffHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    staff: Staff | null;
    matches: Match[];
    ambulances: Ambulance[];
}

export const StaffHistoryModal: React.FC<StaffHistoryModalProps> = ({ isOpen, onClose, staff, matches, ambulances }) => {
    if (!isOpen || !staff) return null;

    const history = matchHelpers.getStaffHistory(staff.id, matches);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-600" /> Historial de Asignaciones
                    </h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400" /></button>
                </div>
                <div className="p-4 border-b bg-white">
                    <h4 className="font-bold text-slate-800 text-lg">{staff.name}</h4>
                    <div className="flex gap-2 text-sm text-slate-500">
                        <span>{staff.role}</span>
                        {staff.isOutsourced && <span className="text-amber-600 bg-amber-50 px-2 rounded text-xs font-bold border border-amber-100">Externo</span>}
                    </div>
                </div>
                <div className="p-0 overflow-y-auto flex-1">
                    {history.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">Sin historial de coberturas</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 text-left">Fecha</th>
                                    <th className="p-3 text-left">Hora</th>
                                    <th className="p-3 text-left">Lugar</th>
                                    <th className="p-3 text-left">Rol en Móvil</th>
                                    <th className="p-3 text-left">Móvil</th>
                                    <th className="p-3 text-left">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map(m => {
                                    const amb = ambulances.find(a => a.id === m.ambulanceId);
                                    let roleInMatch = '';
                                    if (m.driverId === staff.id) roleInMatch = 'Chofer';
                                    if (m.nurseId === staff.id) roleInMatch = 'Enfermero/a';
                                    if (m.thirdCrewId === staff.id) roleInMatch = 'Auxiliar';

                                    return (
                                        <tr key={m.id} className="hover:bg-slate-50">
                                            <td className="p-3 whitespace-nowrap">{formatDateAR(m.date)}</td>
                                            <td className="p-3 whitespace-nowrap font-mono">{formatTime24(m.time)}</td>
                                            <td className="p-3">
                                                <span className="font-medium text-slate-700 block">{m.location}</span>
                                                <span className="text-xs text-slate-500">{m.fieldNumber}</span>
                                            </td>
                                            <td className="p-3">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${roleInMatch === 'Chofer' ? 'bg-blue-100 text-blue-700' :
                                                        roleInMatch === 'Enfermero/a' ? 'bg-green-100 text-green-700' :
                                                            'bg-purple-100 text-purple-700'
                                                    }`}>
                                                    {roleInMatch}
                                                </span>
                                            </td>
                                            <td className="p-3 text-slate-600">{amb ? `Móvil ${amb.number}` : '--'}</td>
                                            <td className="p-3">
                                                <span className={`text-xs font-bold px-2 py-1 rounded inline-block ${m.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                        m.status === 'Suspended' ? 'bg-red-100 text-red-700' :
                                                            m.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {m.status === 'Pending' ? 'Pendiente' :
                                                        m.status === 'Confirmed' ? 'Confirmado' :
                                                            m.status === 'Completed' ? 'Completado' : 'Suspendido'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
