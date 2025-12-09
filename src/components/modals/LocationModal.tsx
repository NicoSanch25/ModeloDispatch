import React, { useState } from 'react';
import { Location } from '../../types';
import { MapPin, X, ExternalLink, Phone } from 'lucide-react';
import { resourceService } from '../../services/resources';

interface LocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    editingLocation: Partial<Location> | null;
}

export const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose, onSaveSuccess, editingLocation }) => {
    if (!isOpen) return null;

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);

        const locationData: Partial<Location> = {
            id: editingLocation?.id,
            name: formData.get('name') as string,
            address: formData.get('address') as string,
            googleMapsUrl: formData.get('googleMapsUrl') as string,
            contactName: formData.get('contactName') as string,
            contactPhone: formData.get('contactPhone') as string,
        };

        try {
            await resourceService.saveLocation(locationData);
            onSaveSuccess();
            onClose();
        } catch (error: any) {
            alert('Error guardando lugar: ' + error.message);
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
                                <MapPin className="w-5 h-5" />
                            </div>
                            {editingLocation ? 'Editar Lugar' : 'Nuevo Lugar'}
                        </h3>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5 overflow-y-auto">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Lugar</label>
                            <input name="name" defaultValue={editingLocation?.name} placeholder="Ej: Cancha 1 - Palermo" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección</label>
                            <input name="address" defaultValue={editingLocation?.address} placeholder="Calle 123" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link Google Maps</label>
                            <div className="relative">
                                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input name="googleMapsUrl" defaultValue={editingLocation?.googleMapsUrl} placeholder="https://maps..." className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-blue-600" />
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Phone className="w-3 h-3" /> Contacto del Lugar</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre</label>
                                    <input name="contactName" defaultValue={editingLocation?.contactName} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Teléfono</label>
                                    <input name="contactPhone" defaultValue={editingLocation?.contactPhone} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm" />
                                </div>
                            </div>
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
