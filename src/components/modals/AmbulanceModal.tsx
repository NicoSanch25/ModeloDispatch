import React, { useState } from 'react';
import { Ambulance, Staff } from '../../types';
import { Truck, X, User, Check } from 'lucide-react';
import { resourceService } from '../../services/resources';
import { formatDateAR } from '../../utils/formatters';

interface AmbulanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    editingAmbulance: Partial<Ambulance> | null;
    staff: Staff[];
}

export const AmbulanceModal: React.FC<AmbulanceModalProps> = ({ isOpen, onClose, onSaveSuccess, editingAmbulance, staff }) => {
    if (!isOpen) return null;

    const [isLoading, setIsLoading] = useState(false);
    const [showOutsourced, setShowOutsourced] = useState(editingAmbulance?.isOutsourced || false);
    const [showWorkshop, setShowWorkshop] = useState(editingAmbulance?.maintenance?.status === 'InRepair');

    // Helper to safely get date string YYYY-MM-DD
    const safeDate = (dateStr?: string) => dateStr ? dateStr.split('T')[0] : '';
    // Actually input type="date" expects YYYY-MM-DD.

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.currentTarget);

        // Construct nested object manually
        const ambulanceData: Partial<Ambulance> = {
            id: editingAmbulance?.id,
            number: formData.get('number') as string,
            plate: formData.get('plate') as string,
            year: Number(formData.get('year')),
            vehicleType: formData.get('vehicleType') as string,
            coachBuilder: formData.get('coachBuilder') as string,
            isOutsourced: showOutsourced, // formData.get('isOutsourced') === 'on'
            outsourcedCompanyName: formData.get('outsourcedCompanyName') as string,
            maintenance: {
                status: formData.get('maintenanceStatus') as any,
                mileage: formData.get('mileage') as string,
                vtvExpiration: formData.get('vtvExpiration') as string,
                insurance: formData.get('insurance') as string,
                mechanicNotes: formData.get('mechanicNotes') as string,
                tireType: formData.get('tireType') as string,
                oilType: formData.get('oilType') as string,
                batteryType: formData.get('batteryType') as string,
                batteryLastChange: formData.get('batteryLastChange') as string,
                batteryPurchaseLocation: formData.get('batteryPurchaseLocation') as string,
                workshopName: formData.get('workshopName') as string,
                mechanicContact: formData.get('mechanicContact') as string,
            }
        };

        try {
            await resourceService.saveAmbulance(ambulanceData);
            onSaveSuccess();
            onClose();
        } catch (error: any) {
            alert('Error guardando móvil: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden transform transition-all">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                <Truck className="w-5 h-5" />
                            </div>
                            {editingAmbulance ? 'Editar Móvil' : 'Nuevo Móvil'}
                        </h3>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Column 1: Identity */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-700 text-sm border-b pb-2 mb-2">Identificación del Vehículo</h4>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número</label>
                                        <input name="number" defaultValue={editingAmbulance?.number} placeholder="Ej: 22" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Patente</label>
                                        <input name="plate" defaultValue={editingAmbulance?.plate} placeholder="AAA 123" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Modelo</label>
                                        <input name="vehicleType" defaultValue={editingAmbulance?.vehicleType} placeholder="Ej: Kangoo" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Año</label>
                                        <input
                                            name="year"
                                            type="number"
                                            min="1900"
                                            max={new Date().getFullYear() + 1}
                                            defaultValue={editingAmbulance?.year}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Carrocería / Carrocera</label>
                                    <input name="coachBuilder" defaultValue={editingAmbulance?.coachBuilder} placeholder="Ej: Vallé" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>

                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                name="isOutsourced"
                                                id="isOutsourcedAmb"
                                                checked={showOutsourced}
                                                onChange={(e) => setShowOutsourced(e.target.checked)}
                                                className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 transition-all checked:border-indigo-600 checked:bg-indigo-600"
                                            />
                                            <Check className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100" />
                                        </div>
                                        <label htmlFor="isOutsourcedAmb" className="text-sm font-medium text-slate-700 cursor-pointer">Es móvil externo / terciarizado</label>
                                    </div>
                                    {showOutsourced && (
                                        <div className="mt-3 pl-8 animate-in slide-in-from-top-1">
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre Empresa / Dueño</label>
                                            <div className="relative">
                                                <input list="outsourced-staff-list" name="outsourcedCompanyName" defaultValue={editingAmbulance?.outsourcedCompanyName} placeholder="Buscar personal externo..." className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white" autoComplete="off" />
                                                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                            </div>
                                            <datalist id="outsourced-staff-list">
                                                {staff.filter(s => s.isOutsourced).map(s => (
                                                    <option key={s.id} value={s.name}>
                                                        {s.role} - {s.companyName || 'Sin empresa'}
                                                    </option>
                                                ))}
                                            </datalist>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado de Mantenimiento</label>
                                        <select
                                            name="maintenanceStatus"
                                            defaultValue={editingAmbulance?.maintenance?.status || 'Active'}
                                            onChange={(e) => setShowWorkshop(e.target.value === 'InRepair')}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                        >
                                            <option value="Active">Operativo</option>
                                            <option value="InRepair">En Taller</option>
                                            <option value="OutOfService">Fuera de Servicio</option>
                                        </select>
                                    </div>

                                    {showWorkshop && (
                                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 animate-in slide-in-from-top-2">
                                            <h5 className="text-xs font-bold text-amber-700 uppercase mb-2">Datos del Taller</h5>
                                            <div className="space-y-2">
                                                <input name="workshopName" defaultValue={editingAmbulance?.maintenance?.workshopName} placeholder="Nombre del Taller" className="w-full px-2 py-1 border border-amber-200 rounded text-sm focus:ring-2 focus:ring-amber-500" />
                                                <input name="mechanicContact" defaultValue={editingAmbulance?.maintenance?.mechanicContact} placeholder="Contacto / Teléfono" className="w-full px-2 py-1 border border-amber-200 rounded text-sm focus:ring-2 focus:ring-amber-500" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Column 2: Mechanics */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-700 text-sm border-b pb-2 mb-2">Mecánica y Documentación</h4>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kilometraje Actual</label>
                                    <input name="mileage" type="number" min="0" defaultValue={editingAmbulance?.maintenance?.mileage} placeholder="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vencimiento VTV</label>
                                        <input name="vtvExpiration" type="date" defaultValue={editingAmbulance?.maintenance?.vtvExpiration} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seguro</label>
                                        <input name="insurance" defaultValue={editingAmbulance?.maintenance?.insurance} placeholder="Compañía" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Cubierta</label>
                                        <input name="tireType" defaultValue={editingAmbulance?.maintenance?.tireType} placeholder="Ej: Michelin" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Aceite</label>
                                        <input name="oilType" defaultValue={editingAmbulance?.maintenance?.oilType} placeholder="Ej: 10W40" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Batería</label>

                                    <div>
                                        <span className="text-[10px] text-slate-400 block mb-1">Modelo / Tipo</span>
                                        <input name="batteryType" defaultValue={editingAmbulance?.maintenance?.batteryType} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" placeholder="Especificación técnica" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-[10px] text-slate-400 block mb-1">Último Cambio</span>
                                            <input name="batteryLastChange" type="date" defaultValue={editingAmbulance?.maintenance?.batteryLastChange} className="w-full px-2 py-1 border border-slate-200 rounded text-sm" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-slate-400 block mb-1">Proveedor / Lugar</span>
                                            <input name="batteryPurchaseLocation" defaultValue={editingAmbulance?.maintenance?.batteryPurchaseLocation} placeholder="Ej: Warnes" className="w-full px-2 py-1 border border-slate-200 rounded text-sm" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones Mecánicas</label>
                                    <textarea name="mechanicNotes" defaultValue={editingAmbulance?.maintenance?.mechanicNotes} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm h-20 resize-none" placeholder="Detalles adicionales..." />
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
