import React from 'react';
import { Ambulance, Match } from '../../types';
import { Truck, X, Wrench, Gauge, Activity, FileText, Check, Shield, ClipboardCheck, Hash, AlertCircle } from 'lucide-react';
import { matchHelpers } from '../../services/matches';
import { formatDateAR, formatTime24 } from '../../utils/formatters';

interface AmbulanceDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    ambulance: Ambulance | null;
    matches: Match[];
}

export const AmbulanceDetailModal: React.FC<AmbulanceDetailModalProps> = ({ isOpen, onClose, ambulance, matches }) => {
    if (!isOpen || !ambulance) return null;

    const history = matchHelpers.getAmbulanceHistory(ambulance.id, matches);

    // Status badge helper
    const renderStatus = (status: string) => {
        switch (status) {
            case 'Active': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Operativo</span>;
            case 'InRepair': return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Wrench className="w-3 h-3" /> En Taller</span>;
            case 'OutOfService': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Ban className="w-3 h-3" /> Fuera de Servicio</span>;
            default: return null;
        }
    };

    // Helper Ban icon if not imported
    const Ban = ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></svg>
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-indigo-600" /> Detalle del Móvil {ambulance.number}
                    </h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-red-500" /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
                    {/* Sidebar Info */}
                    <div className="col-span-1 bg-slate-50 border-r border-slate-200 overflow-y-auto p-6 space-y-6">
                        <div>
                            <h4 className="font-bold text-slate-800 text-2xl mb-1">Móvil {ambulance.number}</h4>
                            {renderStatus(ambulance.maintenance?.status || 'Active')}
                        </div>

                        <div className="space-y-4">
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                <h5 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><FileText className="w-3 h-3" /> Datos Generales</h5>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                        <span className="text-slate-500">Patente</span>
                                        <span className="font-mono font-bold text-slate-700">{ambulance.plate || '--'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                        <span className="text-slate-500">Modelo</span>
                                        <span className="font-medium text-slate-700">{ambulance.vehicleType} {ambulance.year}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Carrocería</span>
                                        <span className="font-medium text-slate-700">{ambulance.coachBuilder || '--'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                <h5 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><Gauge className="w-3 h-3" /> Mantenimiento</h5>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                        <span className="text-slate-500">Kilometraje</span>
                                        <span className="font-mono font-bold text-indigo-600 text-lg">{ambulance.maintenance?.mileage || 0} km</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1">
                                        <span className="text-slate-500">VTV</span>
                                        <span className={`font-medium ${new Date(ambulance.maintenance?.vtvExpiration || '') < new Date() ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                                            {formatDateAR(ambulance.maintenance?.vtvExpiration)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Seguro</span>
                                        <span className="font-medium text-slate-700 text-right truncate pl-2">{ambulance.maintenance?.insurance || '--'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                <h5 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><Activity className="w-3 h-3" /> Mecánica</h5>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase block">Aceite</span>
                                        <span className="font-medium text-slate-700">{ambulance.maintenance?.oilType || '--'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase block">Cubiertas</span>
                                        <span className="font-medium text-slate-700">{ambulance.maintenance?.tireType || '--'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase block">Batería</span>
                                        <span className="font-medium text-slate-700">{ambulance.maintenance?.batteryType || '--'}</span>
                                        <span className="text-xs text-slate-400 block">Ult. Cambio: {formatDateAR(ambulance.maintenance?.batteryLastChange)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* History */}
                    <div className="col-span-2 flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b bg-white">
                            <h4 className="font-bold text-slate-700">Historial de Servicios</h4>
                        </div>
                        <div className="overflow-y-auto flex-1 p-0">
                            {history.length === 0 ? (
                                <div className="p-12 text-center text-slate-400">Sin historial de servicios</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-600 sticky top-0">
                                        <tr>
                                            <th className="p-3 text-left">Fecha</th>
                                            <th className="p-3 text-left">Hora</th>
                                            <th className="p-3 text-left">Lugar</th>
                                            <th className="p-3 text-left">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {history.map(m => (
                                            <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 whitespace-nowrap">{formatDateAR(m.date)}</td>
                                                <td className="p-3 whitespace-nowrap font-mono text-slate-500">{formatTime24(m.time)}</td>
                                                <td className="p-3">
                                                    <span className="font-medium text-slate-800 block">{m.location}</span>
                                                    <span className="text-xs text-slate-500">{m.fieldNumber}</span>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded inline-block ${m.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                            m.status === 'Suspended' ? 'bg-red-100 text-red-700' :
                                                                'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {m.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
