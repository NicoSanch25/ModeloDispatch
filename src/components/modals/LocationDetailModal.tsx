import React, { useState } from 'react';
import { Location, Match } from '../../types';
import { MapPin, Phone, History, Edit2, X, ExternalLink, Calendar } from 'lucide-react';
import { formatDateAR, formatTime24 } from '../../utils/formatters';

interface LocationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    location: Location | null;
    matches: Match[]; // All matches to filter from
    onEdit: (location: Location) => void;
}

export const LocationDetailModal: React.FC<LocationDetailModalProps> = ({
    isOpen,
    onClose,
    location,
    matches,
    onEdit
}) => {
    const [showHistory, setShowHistory] = useState(false);

    if (!isOpen || !location) return null;

    // Filter history by location name (case insensitive just in case, or exact?)
    // Usually the app uses exact strings for location linking
    const history = matches.filter(m =>
        m.location.trim().toLowerCase() === location.name.trim().toLowerCase()
    ).sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.time.localeCompare(a.time);
    });

    const handleEdit = () => {
        onEdit(location);
        onClose(); // Close this modal so the Edit modal can open (controlled by parent)
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-xl shadow-xl w-full flex flex-col transition-all ${showHistory ? 'max-w-4xl max-h-[90vh]' : 'max-w-md'}`}>

                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                        <MapPin className="w-5 h-5 text-indigo-600" />
                        {showHistory ? `Historial: ${location.name}` : 'Detalles de Lugar'}
                    </h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
                </div>

                {/* Body */}
                <div className={`overflow-y-auto ${showHistory ? 'p-0 flex-1' : 'p-6 space-y-6'}`}>

                    {!showHistory ? (
                        <>
                            {/* Details View */}
                            <div className="space-y-4">
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-bold text-slate-800">{location.name}</h2>
                                    {location.address && <p className="text-slate-500 mt-1">{location.address}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {location.googleMapsUrl ? (
                                        <a
                                            href={location.googleMapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex flex-col items-center justify-center p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 hover:bg-indigo-100 transition-colors"
                                        >
                                            <MapPin className="w-8 h-8 mb-2 opacity-80" />
                                            <span className="font-semibold text-sm">Ver Mapa</span>
                                        </a>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-400">
                                            <MapPin className="w-8 h-8 mb-2 opacity-30" />
                                            <span className="font-medium text-sm">Sin Mapa</span>
                                        </div>
                                    )}

                                    {location.contactPhone ? (
                                        <a
                                            href={`https://wa.me/${location.contactPhone.replace(/[^0-9]/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex flex-col items-center justify-center p-4 bg-green-50 border border-green-100 rounded-xl text-green-700 hover:bg-green-100 transition-colors"
                                        >
                                            <Phone className="w-8 h-8 mb-2 opacity-80" />
                                            <span className="font-semibold text-sm">Contacto</span>
                                        </a>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-400">
                                            <Phone className="w-8 h-8 mb-2 opacity-30" />
                                            <span className="font-medium text-sm">Sin Contacto</span>
                                        </div>
                                    )}
                                </div>

                                {location.contactName && (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <p className="text-xs font-bold text-slate-500 uppercase">Nombre de Contacto</p>
                                        <p className="text-slate-800 font-medium">{location.contactName}</p>
                                    </div>
                                )}

                                {location.notes && (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <p className="text-xs font-bold text-slate-500 uppercase">Notas</p>
                                        <p className="text-slate-700 text-sm italic">{location.notes}</p>
                                    </div>
                                )}

                                <div className="pt-4 flex flex-col gap-3">
                                    <button
                                        onClick={() => setShowHistory(true)}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
                                    >
                                        <History className="w-5 h-5" />
                                        Historial de Coberturas ({history.length})
                                    </button>

                                    <button
                                        onClick={handleEdit}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                        Editar Información
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* History View */}
                            {history.length === 0 ? (
                                <div className="p-12 text-center text-slate-400">Sin historial de coberturas en este lugar.</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3 text-left">Fecha</th>
                                            <th className="p-3 text-left">Hora</th>
                                            <th className="p-3 text-left">Tipo</th>
                                            <th className="p-3 text-left">Cancha</th>
                                            <th className="p-3 text-left">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {history.map(m => (
                                            <tr key={m.id} className="hover:bg-slate-50">
                                                <td className="p-3 whitespace-nowrap">{formatDateAR(m.date)}</td>
                                                <td className="p-3 whitespace-nowrap font-mono">{formatTime24(m.time)}</td>
                                                <td className="p-3">{m.type}</td>
                                                <td className="p-3 text-slate-500">{m.fieldNumber || '-'}</td>
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
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </>
                    )}
                </div>

                {/* Footer only for history mode to go back */}
                {showHistory && (
                    <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-between">
                        <button
                            onClick={() => setShowHistory(false)}
                            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                        >
                            &larr; Volver a Detalles
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900"
                        >
                            Cerrar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
