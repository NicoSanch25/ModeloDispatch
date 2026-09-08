import React, { useState } from 'react';
import { Staff } from '../../types';
import { Users, X, Check } from 'lucide-react';
import { resourceService } from '../../services/resources';

interface StaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    editingStaff: Partial<Staff> | null;
}

export const StaffModal: React.FC<StaffModalProps> = ({ isOpen, onClose, onSaveSuccess, editingStaff }) => {
    if (!isOpen) return null;

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);

        const staffData: Partial<Staff> = {
            id: editingStaff?.id,
            name: formData.get('name') as string,
            role: formData.get('role') as any,
            phone: formData.get('phone') as string,
            isOutsourced: formData.get('isOutsourced') === 'on',
            companyName: formData.get('companyName') as string,
        };

        try {
            await resourceService.saveStaff(staffData);
            onSaveSuccess();
            onClose();
        } catch (error: any) {
            alert('Error guardando personal: ' + error.message);
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
                                <Users className="w-5 h-5" />
                            </div>
                            {editingStaff ? 'Editar Personal' : 'Nuevo Personal'}
                        </h3>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5 overflow-y-auto">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                            <input name="name" defaultValue={editingStaff?.name} placeholder="Ej: Juan Pérez" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rol</label>
                                <select name="role" defaultValue={editingStaff?.role || 'Chofer'} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                    <option value="Chofer">Chofer</option>
                                    <option value="Enfermero/a">Enfermero/a</option>
                                    <option value="Médico/a">Médico/a</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                                <input name="phone" defaultValue={editingStaff?.phone} placeholder="Ej: 11 1234 5678" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="relative flex items-center">
                                    <input type="checkbox" name="isOutsourced" id="isOutsourced" defaultChecked={editingStaff?.isOutsourced} className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 transition-all checked:border-indigo-600 checked:bg-indigo-600" />
                                    <Check className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100" />
                                </div>
                                <label htmlFor="isOutsourced" className="text-sm font-medium text-slate-700 cursor-pointer">Es personal externo / terciarizado</label>
                            </div>
                            <div className="pl-8">
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Empresa</label>
                                <input name="companyName" defaultValue={editingStaff?.companyName} placeholder="Nombre de la empresa" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" />
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
