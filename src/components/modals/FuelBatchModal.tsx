import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ListPlus, Plus, ReceiptText, Trash2, UserRoundPlus, X } from 'lucide-react';
import type { Ambulance, FuelRecord, Staff } from '../../types';
import { supabase } from '../../lib/supabase';
import { localDate } from '../../utils/statistics';

interface FuelBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void | Promise<void>;
  staff: Staff[];
  ambulances: Ambulance[];
}

type FuelDraft = Partial<FuelRecord> & { key: string };

const newRow = (previous?: FuelDraft): FuelDraft => ({
  key: `${Date.now()}-${Math.random()}`,
  date: previous?.date || localDate(),
  ambulanceId: previous?.ambulanceId,
  driverId: previous?.driverId,
  externalDriverName: previous?.externalDriverName,
  fuelType: previous?.fuelType || 'Euro Diesel',
  liters: 0,
  items: ''
});

const fieldClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

export const FuelBatchModal: React.FC<FuelBatchModalProps> = ({ isOpen, onClose, onSaveSuccess, staff, ambulances }) => {
  const [rows, setRows] = useState<FuelDraft[]>([newRow()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const drivers = useMemo(() => staff.filter(person => person.role === 'Chofer'), [staff]);

  useEffect(() => {
    if (isOpen) {
      setRows([newRow()]);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const updateRow = (index: number, changes: Partial<FuelDraft>) => {
    setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...changes } : row));
    setError('');
  };

  const selectDriver = (index: number, value: string) => {
    if (value === '__external__') {
      updateRow(index, { driverId: undefined, externalDriverName: '' });
      return;
    }
    updateRow(index, { driverId: value || undefined, externalDriverName: undefined });
  };

  const addRow = () => setRows(current => [...current, newRow(current[current.length - 1])]);
  const removeRow = (index: number) => setRows(current => current.length === 1 ? [newRow()] : current.filter((_, rowIndex) => rowIndex !== index));

  const handleSave = async () => {
    const invalidRow = rows.findIndex(row => {
      const hasDriver = Boolean(row.driverId || row.externalDriverName?.trim());
      const hasMovement = Number(row.liters || 0) > 0 || Boolean(row.items?.trim());
      return !row.ambulanceId || !hasDriver || !hasMovement || Number(row.liters || 0) < 0;
    });

    if (invalidRow >= 0) {
      setError(`Revisá el movimiento ${invalidRow + 1}: elegí móvil y chofer, y cargá litros o una compra.`);
      return;
    }

    setSaving(true);
    setError('');
    const records = rows.map(row => ({
      date: row.date || localDate(),
      ambulance_id: row.ambulanceId,
      driver_id: row.driverId || null,
      external_driver_name: row.externalDriverName?.trim() || null,
      fuel_type: row.fuelType || 'Euro Diesel',
      liters: Number(row.liters || 0),
      items: row.items?.trim() || null
    }));

    try {
      const { error: saveError } = await supabase.from('fuel_records').insert(records);
      if (saveError) throw saveError;
      await onSaveSuccess();
      onClose();
    } catch (saveError: any) {
      setError(`No se pudo guardar: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/55 sm:items-center sm:justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="fuel-modal-title">
      <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><ListPlus className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600">Carga rápida</p>
              <h3 id="fuel-modal-title" className="truncate text-lg font-bold text-slate-900">Combustible y compras</h3>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-5">
          {rows.map((row, index) => {
            const driverValue = row.externalDriverName !== undefined ? '__external__' : row.driverId || '';
            return (
              <section key={row.key} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" aria-label={`Movimiento ${index + 1}`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">Movimiento {index + 1}</span>
                  <button type="button" onClick={() => removeRow(index)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Quitar movimiento ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="min-w-0 text-xs font-semibold text-slate-600">
                    Fecha
                    <span className="relative mt-1 block">
                      <span className={`${fieldClass} flex items-center justify-between`}><span>{(row.date || localDate()).split('-').reverse().join('/')}</span><CalendarDays className="h-4 w-4 text-slate-400" /></span>
                      <input type="date" value={row.date || ''} onChange={event => updateRow(index, { date: event.target.value })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={`Fecha del movimiento ${index + 1}`} />
                    </span>
                  </label>
                  <label className="min-w-0 text-xs font-semibold text-slate-600">
                    Móvil
                    <select value={row.ambulanceId || ''} onChange={event => updateRow(index, { ambulanceId: event.target.value || undefined })} className={`${fieldClass} mt-1`}>
                      <option value="">Elegir</option>
                      {ambulances.map(ambulance => <option key={ambulance.id} value={ambulance.id}>Móvil {ambulance.number}</option>)}
                    </select>
                  </label>

                  <label className="col-span-2 text-xs font-semibold text-slate-600">
                    Chofer
                    <select value={driverValue} onChange={event => selectDriver(index, event.target.value)} className={`${fieldClass} mt-1`}>
                      <option value="">Elegir chofer</option>
                      {drivers.map(driver => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                      <option value="__external__">Otro / no registrado</option>
                    </select>
                  </label>
                  {driverValue === '__external__' && (
                    <label className="col-span-2 text-xs font-semibold text-slate-600">
                      Nombre del chofer externo
                      <span className="relative mt-1 block">
                        <UserRoundPlus className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input type="text" value={row.externalDriverName || ''} onChange={event => updateRow(index, { externalDriverName: event.target.value })} placeholder="Nombre y apellido" className={`${fieldClass} pl-9`} autoFocus />
                      </span>
                    </label>
                  )}

                  <label className="min-w-0 text-xs font-semibold text-slate-600">
                    Combustible
                    <select value={row.fuelType || 'Euro Diesel'} onChange={event => updateRow(index, { fuelType: event.target.value })} className={`${fieldClass} mt-1`}>
                      <option value="Euro Diesel">Euro Diesel</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Nafta Super">Nafta Super</option>
                      <option value="Nafta Premium">Nafta Premium</option>
                    </select>
                  </label>
                  <label className="min-w-0 text-xs font-semibold text-slate-600">
                    Litros
                    <input type="number" inputMode="decimal" min="0" step="0.1" value={row.liters ?? 0} onChange={event => updateRow(index, { liters: Number(event.target.value) })} className={`${fieldClass} mt-1`} />
                  </label>

                  <label className="col-span-2 text-xs font-semibold text-slate-600">
                    Compra en la estación <span className="font-normal text-slate-400">(opcional)</span>
                    <span className="relative mt-1 block">
                      <ReceiptText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input type="text" value={row.items || ''} onChange={event => updateRow(index, { items: event.target.value })} placeholder="Ej: franela, aceite, agua destilada" className={`${fieldClass} pl-9`} />
                    </span>
                  </label>
                </div>
              </section>
            );
          })}

          <button type="button" onClick={addRow} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"><Plus className="h-4 w-4" /> Agregar otro movimiento</button>
        </div>

        <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
          {error && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p>}
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button type="button" onClick={onClose} className="h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="button" onClick={handleSave} disabled={saving} className="h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Guardando…' : rows.length === 1 ? 'Guardar movimiento' : `Guardar ${rows.length} movimientos`}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
