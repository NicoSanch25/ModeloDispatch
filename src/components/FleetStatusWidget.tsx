import React, { useState, useEffect } from 'react';
import { MapPin, Car, Ambulance } from 'lucide-react';
import { Ambulance as AmbulanceModel, Match as MatchModel } from '../types';
import { formatTime24, timeToMinutes } from '../utils/formatters';

interface FleetStatusWidgetProps {
    ambulances: AmbulanceModel[];
    matches: MatchModel[];
}

const getAmbulanceIcon = (vehicleType?: string, className: string = "w-6 h-6") => {
    const type = (vehicleType || '').toLowerCase();
    const smallVehicles = ['kangoo', 'partner', 'berlingo', 'caddy', 'fiorino', 'saveiro', 'courrier'];
    if (smallVehicles.some(v => type.includes(v))) {
        return <Car className={className} />;
    }
    return <Ambulance className={className} />;
};

export const FleetStatusWidget: React.FC<FleetStatusWidgetProps> = ({ ambulances, matches }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col h-full">
            <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
                Estado de Flota
                <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded">En Tiempo Real</span>
            </h3>
            <div className="space-y-3 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                {ambulances.map(amb => {
                    const isMaintenance = amb.maintenance?.status !== 'Active';
                    let statusText = '';
                    let statusColor = 'bg-emerald-500';
                    let activeMatch = null;

                    if (amb.maintenance?.status === 'InRepair') {
                        statusText = 'En Taller';
                        statusColor = 'bg-amber-500';
                    } else if (amb.maintenance?.status === 'OutOfService') {
                        statusText = 'Fuera de Servicio';
                        statusColor = 'bg-red-500';
                    } else {
                        const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
                        const todayStr = currentTime.toISOString().split('T')[0];

                        activeMatch = matches.find(m => {
                            if (m.ambulanceId !== amb.id) return false;
                            if (m.date !== todayStr) return false;
                            if (m.status === 'Suspended') return false;
                            const start = timeToMinutes(m.time);
                            const end = start + (m.durationMinutes || 90) + (m.extensionMinutes || 0);
                            return nowMinutes >= start && nowMinutes <= end;
                        });

                        if (activeMatch) {
                            statusText = 'En Cobertura';
                            statusColor = 'bg-blue-500 animate-pulse';
                        } else {
                            statusText = 'Disponible';
                            statusColor = 'bg-emerald-500';
                        }
                    }

                    return (
                        <div key={amb.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-50 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${activeMatch ? 'bg-blue-50' : 'bg-slate-50'}`}>
                                    {getAmbulanceIcon(amb.vehicleType, `w-5 h-5 ${activeMatch ? 'text-blue-600' : 'text-slate-500'}`)}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Móvil {amb.number}</p>
                                    {activeMatch ? (
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {activeMatch.location}
                                            </span>
                                            <span className="text-[10px] text-blue-600 truncate max-w-[150px]">
                                                {activeMatch.fieldNumber || activeMatch.type}
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500">{amb.vehicleType} • {statusText}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className={`w-3 h-3 rounded-full ${statusColor}`} title={statusText}></span>
                                {activeMatch && <span className="text-[10px] font-bold text-slate-400">{formatTime24(activeMatch.time)}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
