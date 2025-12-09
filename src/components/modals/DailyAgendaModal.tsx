import React, { useState, useEffect } from 'react';
import { Match, Staff, Ambulance } from '../../types';
import { Calendar, X, Clock4, Send, Copy } from 'lucide-react';
import { formatTime24 } from '../../utils/formatters';
import { timeUtils } from '../../services/matches';

interface DailyAgendaModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: string;
    setDate: (date: string) => void;
    matches: Match[];
    staff: Staff[];
    ambulances: Ambulance[];
}

export const DailyAgendaModal: React.FC<DailyAgendaModalProps> = ({
    isOpen, onClose, date, setDate, matches, staff, ambulances
}) => {
    if (!isOpen) return null;

    const [citationTimes, setCitationTimes] = useState<Record<string, string>>({});
    const [useCitation, setUseCitation] = useState<Record<string, boolean>>({});

    const dayMatches = matches.filter(m => m.date === date && m.status !== 'Suspended').sort((a, b) => a.time.localeCompare(b.time));
    const activeStaffIds: string[] = Array.from(new Set(dayMatches.flatMap(m => [m.driverId, m.nurseId, m.thirdCrewId].filter((id): id is string => !!id))));

    // Re-implemeting subtractTime here or import it?
    // It was in helper in App.tsx: 
    /*
    const subtractTime = (timeStr: string, minutesToSubtract: number) => {
      const start = timeToMinutes(timeStr);
      let newTime = start - minutesToSubtract;
      if (newTime < 0) newTime += 24 * 60; 
      return minutesToTime(newTime);
    };
    */
    // I will use timeUtils from matches service, but I need to make sure subtractTime logic exists.
    // timeUtils has timeToMinutes and minutesToTime. I can compose them.
    const subtractTime = (timeStr: string, minutesToSubtract: number) => {
        const start = timeUtils.timeToMinutes(timeStr);
        let newTime = start - minutesToSubtract;
        if (newTime < 0) newTime += 24 * 60;
        return timeUtils.minutesToTime(newTime);
    };

    useEffect(() => {
        const initialTimes: Record<string, string> = {};
        const initialUse: Record<string, boolean> = {};
        activeStaffIds.forEach(sid => {
            const firstMatch = dayMatches.find(m => m.driverId === sid || m.nurseId === sid || m.thirdCrewId === sid);
            if (firstMatch) {
                initialTimes[sid] = subtractTime(firstMatch.time, 60);
                initialUse[sid] = false;
            }
        });
        setCitationTimes(initialTimes);
        setUseCitation(initialUse);
    }, [date, matches]); // Added matches dependency just in case

    const generateIndividualText = (s: Staff) => {
        const staffMatches = dayMatches.filter(m => m.driverId === s.id || m.nurseId === s.id || m.thirdCrewId === s.id);
        const dateLabel = new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

        let text = `👋 Hola *${s.name}*, tu cronograma para ${dateLabel}:\n\n`;

        if (useCitation[s.id] && citationTimes[s.id]) {
            text += `🕒 *Citación en Base:* ${formatTime24(citationTimes[s.id])} hs\n`;
            text += `--------------------------------\n`;
        }

        staffMatches.forEach(m => {
            const amb = ambulances.find(a => a.id === m.ambulanceId);
            const partners = [];
            if (m.driverId && m.driverId !== s.id) {
                const p = staff.find(st => st.id === m.driverId);
                if (p) partners.push(`${p.name} (Chofer)`);
            }
            if (m.nurseId && m.nurseId !== s.id) {
                const p = staff.find(st => st.id === m.nurseId);
                if (p) partners.push(`${p.name} (Enf)`);
            }
            if (m.thirdCrewId && m.thirdCrewId !== s.id) {
                const p = staff.find(st => st.id === m.thirdCrewId);
                if (p) partners.push(`${p.name} (Aux)`);
            }

            text += `🚑 *${formatTime24(m.time)} hs* | ${m.location}\n`;
            text += `   📝 ${m.type} ${m.fieldNumber ? `(${m.fieldNumber})` : ''}\n`;
            text += `   🚐 Móvil: ${amb ? amb.number : 'A designar'}\n`;
            if (m.isSingleCrew && partners.length === 0) {
                text += `   👤 Tripulación Simple\n`;
            } else {
                text += `   🤝 Con: ${partners.join(', ') || 'Nadie'}\n`;
            }
            text += `\n`;
        });
        return text;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" /> Agenda Diaria por Personal
                    </h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400" /></button>
                </div>
                <div className="p-4 border-b bg-white">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar Fecha</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full md:w-64 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="p-6 overflow-y-auto bg-slate-100 flex-1">
                    {activeStaffIds.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <p>No hay personal asignado para esta fecha.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeStaffIds.map(sid => {
                                const s = staff.find(st => st.id === sid);
                                if (!s) return null;
                                const msg = generateIndividualText(s);
                                const cleanPhone = s.phone.replace(/[^0-9]/g, '');
                                const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

                                return (
                                    <div key={sid} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 flex flex-col">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-slate-800">{s.name}</h4>
                                                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{s.role}</span>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={useCitation[sid] || false}
                                                        onChange={(e) => setUseCitation(prev => ({ ...prev, [sid]: e.target.checked }))}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                                                    />
                                                    <Clock4 className="w-3 h-3" /> Citar en Base
                                                </label>
                                                {useCitation[sid] && (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="time"
                                                            className="border rounded p-1 text-sm w-28 text-center bg-indigo-50 border-indigo-100 font-medium"
                                                            value={citationTimes[sid] || ''}
                                                            onChange={(e) => setCitationTimes(prev => ({ ...prev, [sid]: e.target.value }))}
                                                        />
                                                        <span className="text-[10px] text-slate-400 font-bold">HS</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-slate-50 rounded p-2 mb-3 text-xs font-mono text-slate-600 whitespace-pre-wrap border border-slate-100 h-32 overflow-y-auto">
                                            {msg}
                                        </div>
                                        <div className="flex gap-2">
                                            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 bg-green-500 text-white hover:bg-green-600 rounded-lg font-medium flex items-center justify-center gap-2 text-sm transition-colors shadow-sm shadow-green-200">
                                                <Send className="w-4 h-4" /> Enviar WhatsApp
                                            </a>
                                            <button onClick={() => { navigator.clipboard.writeText(msg); }} className="px-3 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded-lg">Cerrar</button>
                </div>
            </div>
        </div>
    );
};
