import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, Ambulance } from 'lucide-react';
import { Transfer, Staff, Ambulance as AmbulanceModel, Client } from '../../types';
import { localDate } from '../../utils/statistics';
import { DateInput } from '../DateInput';
import { driverOptionLabel, licenseStatus } from '../../utils/licenses';
import { ModalShell } from '../ui/ModalShell';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transfer: Partial<Transfer>) => Promise<void>;
    onDelete?: (id: string) => void;
    transfer: Partial<Transfer> | null;
    staff: Staff[];
    ambulances?: AmbulanceModel[];
    clients?: Client[];
}

export const TransferModal: React.FC<TransferModalProps> = ({
    isOpen, onClose, onSave, onDelete, transfer, staff, ambulances = [], clients = []
}) => {
    const [formData, setFormData] = useState<Partial<Transfer>>({
        date: localDate(),
        status: 'Pending',
        ambulance_type: 'S/M'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [missing, setMissing] = useState<string[]>([]);
    const submitting = useRef(false);

    useEffect(() => {
        setError('');
        setMissing([]);
        if (transfer) {
            setFormData({
                date: localDate(),
                status: 'Pending',
                ...transfer
            });
        } else {
            setFormData({
                date: localDate(),
                status: 'Pending',
                ambulance_type: 'S/M'
            });
        }
    }, [transfer, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting.current) return;
        // Registros anteriores sin origen/destino siguen editables; la exigencia aplica a traslados nuevos.
        const empty = transfer?.id ? [] : (['origin', 'destination'] as const).filter(key => !String(formData[key] ?? '').trim());
        setMissing(empty);
        if (empty.length) {
            setError('Completá origen y destino para guardar el traslado.');
            (document.querySelector(`#transfer-form [name="${empty[0]}"]`) as HTMLInputElement | null)?.focus();
            return;
        }
        submitting.current = true;
        setIsSaving(true);
        setError('');
        try {
            await onSave(formData);
        } catch (e: any) {
            setError(e.message || 'No se pudo guardar el traslado. Revisá la conexión y volvé a intentar.');
        } finally {
            submitting.current = false;
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (missing.includes(name) && value.trim()) setMissing(prev => prev.filter(key => key !== name));
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value ? Number(value) : undefined) : value
        }));
    };

    const drivers = staff.filter(s => s.role === 'Chofer');
    const serviceDate = formData.date || localDate();
    const driverExpiration = drivers.find(d => d.id === formData.driver_id)?.licenseExpiration;
    const driverLicense = licenseStatus(driverExpiration, serviceDate);
    const planValue = (key: 'planned_start_at' | 'planned_end_at') => formData[key] ? new Date(Date.parse(formData[key]!) - 3 * 3600000).toISOString().slice(0, 16) : '';
    const setPlan = (key: 'planned_start_at' | 'planned_end_at', part: 'date' | 'time', value: string) => {
        const old = planValue(key);
        const date = part === 'date' ? value : old.slice(0, 10) || formData.date || localDate();
        const time = part === 'time' ? value : old.slice(11, 16) || '09:00';
        setFormData(prev => ({ ...prev, [key]: date && time ? `${date}T${time}:00-03:00` : undefined }));
    };

    return (
        <ModalShell onClose={onClose} busy={isSaving}>
            <div className="dispatch-modal-panel bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Ambulance className="w-5 h-5 text-indigo-600" />
                        {transfer?.id ? 'Editar Traslado' : 'Nuevo Traslado'}
                    </h3>
                    <button onClick={onClose} disabled={isSaving} aria-label="Cerrar traslado" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
                    <form id="transfer-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Status & Header info */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº Traslado</label>
                                <input type="text" name="transfer_number" value={formData.transfer_number || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg bg-white" placeholder="Ej: 00123" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha *</label>
                                <DateInput name="date" aria-label="Fecha de traslado" required value={formData.date || ''} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg bg-white" />
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
                                    {drivers.map(d => <option key={d.id} value={d.id}>{driverOptionLabel(d, serviceDate)}</option>)}
                                </select>
                                {formData.driver_id && driverLicense.state === 'expired' && <p role="alert" className="mt-1 text-xs font-semibold text-rose-700">⚠ Licencia vencida para la fecha del traslado (venció el {driverExpiration?.split('-').reverse().join('/')}).</p>}
                            </div>
                        </div>

                        <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-3">
                            <h4 className="text-sm font-bold text-slate-700">Programación y reserva de recursos</h4>
                            <p className="text-xs text-slate-500">La reserva incluye el regreso a base. Los horarios reales se registran más abajo.</p>
                            <div className="grid grid-cols-2 gap-3">
                                {(['planned_start_at', 'planned_end_at'] as const).map(key => <React.Fragment key={key}>
                                    <label className="min-w-0 text-xs text-slate-600">{key === 'planned_start_at' ? 'Fecha de salida prevista' : 'Fecha de regreso previsto'}<DateInput aria-label={key === 'planned_start_at' ? 'Fecha de salida prevista' : 'Fecha de regreso previsto'} value={planValue(key).slice(0,10)} onChange={e => setPlan(key,'date',e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2"/></label>
                                    <label className="min-w-0 text-xs text-slate-600">{key === 'planned_start_at' ? 'Hora de salida prevista' : 'Hora de regreso prevista'}<input type="time" aria-label={key === 'planned_start_at' ? 'Hora de salida prevista' : 'Hora de regreso prevista'} value={planValue(key).slice(11,16)} onChange={e => setPlan(key,'time',e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2"/></label>
                                </React.Fragment>)}
                                <label className="text-xs text-slate-600">Móvil<select aria-label="Móvil del traslado" name="ambulance_id" className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2" value={formData.ambulance_id || ''} onChange={handleChange}><option value="">Pendiente</option>{ambulances.map(a=><option key={a.id} value={a.id} disabled={!!a.maintenance?.status && a.maintenance.status !== 'Active'}>Móvil {a.number}{a.maintenance?.status && a.maintenance.status !== 'Active'?' · No disponible':''}</option>)}</select></label>
                                <label className="text-xs text-slate-600">Enfermero/a<select aria-label="Enfermero del traslado" name="nurse_id" className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2" value={formData.nurse_id || ''} onChange={handleChange}><option value="">Pendiente</option>{staff.filter(s=>s.role !== 'Chofer').map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                                <label className="col-span-2 text-xs text-slate-600">Cliente<select aria-label="Cliente del traslado" name="client_id" className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2" value={formData.client_id || ''} onChange={handleChange}><option value="">Pendiente</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                            </div>
                        </section>
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
                                <label htmlFor="transfer-origin" className="block text-xs font-bold text-slate-500 uppercase mb-1">Origen (Traslado Desde) *</label>
                                <input id="transfer-origin" type="text" name="origin" aria-invalid={missing.includes('origin')} value={formData.origin || ''} onChange={handleChange} className={`w-full p-2 border rounded-lg ${missing.includes('origin') ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`} placeholder="Ej: San Fernando" />
                                {missing.includes('origin') && <p className="mt-1 text-xs text-rose-700">Indicá desde dónde sale el traslado.</p>}
                            </div>
                            <div className="md:col-span-1">
                                <label htmlFor="transfer-destination" className="block text-xs font-bold text-slate-500 uppercase mb-1">Destino (Lugar Hasta) *</label>
                                <input id="transfer-destination" type="text" name="destination" aria-invalid={missing.includes('destination')} value={formData.destination || ''} onChange={handleChange} className={`w-full p-2 border rounded-lg ${missing.includes('destination') ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`} placeholder="Ej: Hospital Gutierrez" />
                                {missing.includes('destination') && <p className="mt-1 text-xs text-rose-700">Indicá a dónde va el traslado.</p>}
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
                                disabled={isSaving}
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
                            disabled={isSaving}
                            className="px-6 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="transfer-form"
                            disabled={isSaving}
                            className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Guardando…' : 'Guardar Traslado'}
                        </button>
                    </div>
                </div>

            </div>
        </ModalShell>
    );
};

