import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Car, Ambulance } from 'lucide-react';
import { Ambulance as AmbulanceModel, Match as MatchModel } from '../types';
import { formatTime24 } from '../utils/formatters';
import { activeCoverage } from '../utils/scheduling';
import type { AgendaService } from '../utils/agenda';

interface FleetStatusWidgetProps {
    ambulances: AmbulanceModel[];
    matches: MatchModel[];
    services?: AgendaService[];
    onAmbulanceClick?: (amb: AmbulanceModel) => void;
}

const getAmbulanceIcon = (vehicleType?: string, className: string = "w-6 h-6") => {
    const type = (vehicleType || '').toLowerCase();
    const smallVehicles = ['kangoo', 'partner', 'berlingo', 'caddy', 'fiorino', 'saveiro', 'courrier'];
    if (smallVehicles.some(v => type.includes(v))) {
        return <Car className={className} />;
    }
    return <Ambulance className={className} />;
};

export const FleetStatusWidget: React.FC<FleetStatusWidgetProps> = ({ ambulances, matches, services, onAmbulanceClick }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [filter, setFilter] = useState<'Todos' | 'Disponibles' | 'En Servicio' | 'En Taller'>('Todos');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 30_000);
        return () => clearInterval(timer);
    }, []);

    const enrichedAmbulances = useMemo(() => {
        return ambulances.map(amb => {
            let statusText = '';
            let statusColor = 'bg-emerald-500';
            let activeMatch = null;
            let activeService: AgendaService | undefined;

            if (amb.maintenance?.status === 'InRepair') {
                statusText = 'En Taller';
                statusColor = 'bg-amber-500';
            } else if (amb.maintenance?.status === 'OutOfService') {
                statusText = 'Fuera de Servicio';
                statusColor = 'bg-red-500';
            } else {
                if (services) {
                    activeService = services.find(s => s.ambulanceId === amb.id && !s.closed && (s.operatingNow || s.start !== null && s.end !== null && s.start <= currentTime.getTime() && s.end + 15 * 60000 > currentTime.getTime()));
                } else activeMatch = activeCoverage(amb.id, matches, currentTime) || null;

                if (activeMatch || activeService) {
                    statusText = activeService?.operatingNow ? activeService.status : 'Reserva activa';
                    statusColor = 'bg-blue-500 animate-pulse';
                } else {
                    statusText = 'Sin reserva activa';
                    statusColor = 'bg-emerald-500';
                }
            }
            return { amb, statusText, statusColor, activeMatch, activeService };
        });
    }, [ambulances, matches, services, currentTime]);

    const filteredAmbulances = enrichedAmbulances.filter(item => {
        if (filter === 'Todos') return true;
        if (filter === 'Disponibles') return item.statusText === 'Sin reserva activa';
        if (filter === 'En Servicio') return !!item.activeMatch || !!item.activeService;
        if (filter === 'En Taller') return item.statusText === 'En Taller' || item.statusText === 'Fuera de Servicio';
        return true;
    });

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col h-full">
            <h3 className="text-lg font-bold mb-3 flex items-center justify-between">
                Estado de Flota
                <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">Según agenda</span>
            </h3>
            
            <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-1">
                {['Todos', 'Disponibles', 'En Servicio', 'En Taller'].map(f => (
                    <button 
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors font-medium border ${filter === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                    >
                        {f === 'Disponibles' ? 'Sin reserva activa' : f === 'En Servicio' ? 'Con servicio' : f}
                    </button>
                ))}
            </div>

            <p className="mb-3 text-xs text-slate-500">Según reservas y estados informados. No es ubicación GPS. Verificá bloqueos y regreso antes de asignar.</p>
            <div className="space-y-3 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                {filteredAmbulances.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-4">No hay móviles en este estado.</p>
                ) : (
                    filteredAmbulances.map(({ amb, statusText, statusColor, activeMatch, activeService }) => (
                        <div 
                            key={amb.id} 
                            onClick={() => onAmbulanceClick && onAmbulanceClick(amb)}
                            className={`flex items-center justify-between p-3 rounded-lg border border-slate-50 hover:bg-slate-50 transition-colors ${onAmbulanceClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${statusText === 'En Taller' || statusText === 'Fuera de Servicio' ? 'bg-amber-50 text-amber-600' : activeMatch ? 'bg-blue-50' : 'bg-slate-50'}`}>
                                    {getAmbulanceIcon(amb.vehicleType, `w-5 h-5 ${statusText === 'En Taller' || statusText === 'Fuera de Servicio' ? 'text-amber-600' : activeMatch ? 'text-blue-600' : 'text-slate-500'}`)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-800 text-sm">Móvil {amb.number}</p>
                                        {(statusText === 'En Taller' || statusText === 'Fuera de Servicio') && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">En Taller</span>
                                        )}
                                    </div>
                                    {activeService ? <div className="flex flex-col"><span className="text-xs font-bold text-blue-700">{activeService.title}</span><span className="text-xs text-blue-600">{statusText}</span></div> : activeMatch ? (
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {activeMatch.location}
                                            </span>
                                            <span className="text-[10px] text-blue-600 truncate max-w-[150px]">
                                                {activeMatch.fieldNumber || activeMatch.type}
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500">{amb.vehicleType} {statusText !== 'En Taller' && statusText !== 'Fuera de Servicio' ? `— ${statusText}` : ''}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className={`w-3 h-3 rounded-full ${statusColor}`} title={statusText}></span>
                                {activeMatch && <span className="text-[10px] font-bold text-slate-400">{formatTime24(activeMatch.time)}</span>}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
