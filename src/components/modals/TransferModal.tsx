import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Ambulance } from 'lucide-react';
import { Transfer, Staff } from '../../types';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transfer: Partial<Transfer>) => void;
    onDelete?: (id: string) => void;
    transfer: Partial<Transfer> | null;
    staff: Staff[];
}

export const TransferModal: React.FC<TransferModalProps> = ({
    isOpen, onClose, onSave, onDelete, transfer, staff
}) => {
    const [formData, setFormData] = useState<Partial<Transfer>>({
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        ambulance_type: 'S/M'
    });

    useEffect(() => {
        if (transfer) {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                status: 'Pending',
                ...transfer
            });
        } else {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                status: 'Pending',
                ambulance_type: 'S/M'
            });
        }
    }, [transfer, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value ? Number(value) : undefined) : value
        }));
    };

    const drivers = staff.filter(s => s.role === 'Chofer');

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-2 md:p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Ambulance className="w-5 h-5 text-indigo-600" />
                        {transfer?.id ? 'Editar Traslado' : 'Nuevo Traslado'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    <form id="transfer-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Status & Header info */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº Traslado</label>
                                <input type="text" name="transfer_number" value={formData.transfer_number || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg bg-white" placeholder="Ej: 00123" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha *</label>
                                <input type="date" name="date" required value={formData.date || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado</label>
                                <select name="status" value={formData.status || 'Pending'} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg bg-white font-medium">
                                    <option value="Pending">Pendiente</option>
                                    <option value="Completed">Completado</option>
                                    <option value="Cancelled">Cancelado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chofer</label>
                                <select name="driver_id" value={formData.driver_id || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg bg-white">
                                    <option value="">Seleccionar...</option>
                                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Patient Info */}
                        <h4 className="text-sm font-bold text-slate-700 border-b pb-2">Información del Paciente</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Paciente</label>
                                <input type="text" name="patient_name" value={formData.patient_name || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titular</label>
                                <input type="text" name="holder_name" value={formData.holder_name || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº Abonado</label>
                                <input type="text" name="subscriber_number" value={formData.subscriber_number || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº Afiliado</label>
                                <input type="text" name="affiliate_number" value={formData.affiliate_number || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">DNI / Doc.</label>
                                <input type="text" name="document_number" value={formData.document_number || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Edad</label>
                                <input type="text" name="age" value={formData.age || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Domicilio</label>
                                <input type="text" name="address" value={formData.address || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Localidad</label>
                                <input type="text" name="locality" value={formData.locality || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg" />
                            </div>
                        </div>

                        {/* Origin/Destination */}
                        <h4 className="text-sm font-bold text-slate-700 border-b pb-2 mt-6">Ruta y Tipo</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Ambulancia</label>
                                <select name="ambulance_type" value={formData.ambulance_type || 'S/M'} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg">
                                    <option value="S/M">S/M</option>
                                    <option value="C/M">C/M</option>
                                    <option value="UTIM">UTIM</option>
                                    <option value="OTROS">OTROS</option>
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Origen (Traslado Desde)</label>
                                <input type="text" name="origin" value={formData.origin || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="Ej: San Fernando" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destino (Lugar Hasta)</label>
                                <input type="text" name="destination" value={formData.destination || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg" placeholder="Ej: Hospital Gutierrez" />
                            </div>
                        </div>

                        {/* Timetable Grid */}
                        <h4 className="text-sm font-bold text-slate-700 border-b pb-2 mt-6">Horarios</h4>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-2 font-bold text-slate-600">Punto de Control</th>
                                        <th className="px-4 py-2 font-bold text-slate-600 w-32">Llegada</th>
                                        <th className="px-4 py-2 font-bold text-slate-600 w-32">Salida</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr>
                                        <td className="px-4 py-2 font-medium text-slate-700">Origen (Domicilio/Hospital)</td>
                                        <td className="px-2 py-1"><input type="time" name="arrival_origin_time" value={formData.arrival_origin_time || ''} onChange={handleChange} className="w-full p-1 border border-slate-200 rounded" /></td>
                                        <td className="px-2 py-1"><input type="time" name="departure_origin_time" value={formData.departure_origin_time || ''} onChange={handleChange} className="w-full p-1 border border-slate-200 rounded" /></td>
                                    </tr>
                                    <tr className="bg-slate-50/50">
                                        <td className="px-4 py-2 font-medium text-slate-700">Destino</td>
                                        <td className="px-2 py-1"><input type="time" name="arrival_destination_time" value={formData.arrival_destination_time || ''} onChange={handleChange} className="w-full p-1 border border-slate-200 rounded" /></td>
                                        <td className="px-2 py-1"><input type="time" name="departure_destination_time" value={formData.departure_destination_time || ''} onChange={handleChange} className="w-full p-1 border border-slate-200 rounded" /></td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-2 font-medium text-slate-700">Base</td>
                                        <td className="px-2 py-1"><input type="time" name="arrival_base_time" value={formData.arrival_base_time || ''} onChange={handleChange} className="w-full p-1 border border-slate-200 rounded" /></td>
                                        <td className="px-2 py-1"><input type="time" name="departure_base_time" value={formData.departure_base_time || ''} onChange={handleChange} className="w-full p-1 border border-slate-200 rounded" /></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Extra Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tiempo de Espera (min)</label>
                                <input type="number" name="wait_time_minutes" value={formData.wait_time_minutes || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kms Recorridos</label>
                                <input type="number" name="kms_driven" value={formData.kms_driven || ''} onChange={handleChange} step="0.1" className="w-full p-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Importe a Facturar ($)</label>
                                <input type="number" name="amount_to_bill" value={formData.amount_to_bill || ''} onChange={handleChange} step="0.01" className="w-full p-2 border border-slate-200 rounded-lg" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Diagnóstico Presunto</label>
                                <input type="text" name="presumed_diagnosis" value={formData.presumed_diagnosis || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones</label>
                                <textarea name="observations" value={formData.observations || ''} onChange={handleChange} rows={3} className="w-full p-2 border border-slate-200 rounded-lg resize-none"></textarea>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Recepcionó</label>
                                    <input type="text" name="received_by" value={formData.received_by || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-between gap-3">
                    <div className="flex items-center">
                        {transfer?.id && onDelete && (
                            <button
                                type="button"
                                onClick={() => onDelete(transfer.id as string)}
                                className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto justify-center"
                            >
                                <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="transfer-form"
                            className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            Guardar Traslado
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

