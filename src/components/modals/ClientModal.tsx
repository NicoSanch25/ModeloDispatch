import React, { useState } from 'react';
import { Client } from '../../types';
import { Building, X } from 'lucide-react';
import { resourceService } from '../../services/resources';

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    editingClient: Partial<Client> | null;
}

export const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, onSaveSuccess, editingClient }) => {
    if (!isOpen) return null;

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);

        const clientData: Partial<Client> = {
            id: editingClient?.id,
            name: formData.get('name') as string,
            contactName: formData.get('contactName') as string,
            contactPhone: formData.get('contactPhone') as string,
            email: formData.get('email') as string,
            notes: formData.get('notes') as string,
        };

        try {
            await resourceService.saveClient(clientData);
            onSaveSuccess();
            onClose();
        } catch (error: any) {
            alert('Error guardando cliente: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                <Building className="w-5 h-5" />
                            </div>
                            {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                        </h3>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5 overflow-y-auto">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre / Razón Social</label>
                            <input name="name" defaultValue={editingClient?.name} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contacto Nombre</label>
                                <input name="contactName" defaultValue={editingClient?.contactName} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contacto Teléfono</label>
                                <input name="contactPhone" defaultValue={editingClient?.contactPhone} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                            <input name="email" type="email" defaultValue={editingClient?.email} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas Internas</label>
                            <textarea name="notes" defaultValue={editingClient?.notes} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none" placeholder="Información adicional..." />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-lg shadow-indigo-200 transition-all transform active:scale-95">
                            {isLoading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
