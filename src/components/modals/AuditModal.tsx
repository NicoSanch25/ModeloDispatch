import React from 'react';
import { Match } from '../../types';
import { History, X } from 'lucide-react';

interface AuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: Match | null;
}

export const AuditModal: React.FC<AuditModalProps> = ({ isOpen, onClose, match }) => {
    if (!isOpen || !match) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-500" /> Historial de Cambios
                    </h3>
                    <button onClick={onClose}>
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>
                <div className="p-0 overflow-y-auto flex-1">
                    {(!match.auditLog || match.auditLog.length === 0) ? (
                        <div className="p-8 text-center text-slate-500">
                            No hay cambios registrados para esta cobertura.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {[...match.auditLog].reverse().map((log, idx) => (
                                <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-slate-400 uppercase">
                                            {new Date(log.date).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700">{log.changes}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm">Cerrar</button>
                </div>
            </div>
        </div>
    );
};
