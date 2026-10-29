import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ListPlus, Plus, ReceiptText, Trash2, UserRoundPlus, X } from 'lucide-react';
import { friendlyError } from '../../utils/requests';
import type { Ambulance, FuelRecord, Staff } from '../../types';
import { supabase } from '../../lib/supabase';
import { localDate } from '../../utils/statistics';
import { ModalShell } from '../ui/ModalShell';
import { askConfirm, notify } from '../ui/feedback';

interface FuelBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void | Promise<void>;
  staff: Staff[];
  ambulances: Ambulance[];
  /** Movimiento existente para corregir o eliminar. */
  editing?: FuelRecord | null;
}

type FuelDraft = Omit<Partial<FuelRecord>, 'liters'> & { key: string; liters: string };

// Acepta coma o punto decimal ("35,5" o "35.5"). Devuelve NaN si no es un número.
export const parseLiters = (value: string) => {
  const clean = value.trim().replace(',', '.');
  return clean === '' ? 0 : Number(clean);
};

const newRow = (previous?: FuelDraft): FuelDraft => ({
  key: `${Date.now()}-${Math.random()}`,
  date: previous?.date || localDate(),
  ambulanceId: previous?.ambulanceId,
  driverId: previous?.driverId,
  externalDriverName: previous?.externalDriverName,
  fuelType: previous?.fuelType || 'Euro Diesel',
  liters: '',
  items: ''
});

const fromRecord = (record: FuelRecord): FuelDraft => ({
  ...record,
  key: record.id,
  driverId: record.driverId || undefined,
  externalDriverName: record.externalDriverName || undefined,
  liters: record.liters ? String(record.liters).replace('.', ',') : '',
  items: record.items || ''
});

const fieldClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';

export const FuelBatchModal: React.FC<FuelBatchModalProps> = ({ isOpen, onClose, onSaveSuccess, staff, ambulances, editing }) => {
  const [rows, setRows] = useState<FuelDraft[]>([newRow()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const drivers = useMemo(() => staff.filter(person => person.role === 'Chofer'), [staff]);

  useEffect(() => {
    if (isOpen) {
      setRows([editing ? fromRecord(editing) : newRow()]);
      setError('');
    }
  }, [isOpen, editing]);

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
      const liters = parseLiters(row.liters);
      const hasMovement = liters > 0 || Boolean(row.items?.trim());
      return !row.ambulanceId || !hasDriver || !hasMovement || !Number.isFinite(liters) || liters < 0 || liters > 500;
    });

    if (invalidRow >= 0) {
      setError(`Revisá el movimiento ${invalidRow + 1}: elegí móvil y chofer, y cargá litros (entre 0 y 500) o una compra.`);
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
      liters: parseLiters(row.liters),
      items: row.items?.trim() || null
    }));

    try {
      const { error: saveError } = editing
        ? await supabase.from('fuel_records').update(records[0]).eq('id', editing.id)
        : await supabase.from('fuel_records').insert(records);
      if (saveError) throw saveError;
      await onSaveSuccess();
      notify.success(editing ? 'Movimiento corregido.' : records.length === 1 ? 'Movimiento de combustible guardado.' : `${records.length} movimientos de combustible guardados.`);
      onClose();
    } catch (saveError: any) {
      setError(`No se pudo guardar: ${friendlyError(saveError)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!(await askConfirm({ title: '¿Eliminar este movimiento de combustible?', confirmLabel: 'Eliminar', danger: true }))) return;
    setSaving(true);
    try {
      const { error: deleteError } = await supabase.from('fuel_records').delete().eq('id', editing.id);
      if (deleteError) throw deleteError;
      await onSaveSuccess();
      notify.success('Movimiento eliminado.');
      onClose();
    } catch (deleteError: any) {
      setError(`No se pudo eliminar: ${friendlyError(deleteError)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} busy={saving} labelledBy="fuel-modal-title">
      <div className="dispatch-modal-panel flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl sm:max-w-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600"><ListPlus className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">{editing ? 'Corregir movimiento' : 'Carga rápida'}</p>
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
                  <span className="text-sm font-bold text-slate-800">{editing ? 'Movimiento' : `Movimiento ${index + 1}`}</span>
                  {!editing && <button type="button" onClick={() => removeRow(index)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label={`Quitar movimiento ${index + 1}`}><Trash2 className="h-4 w-4" /></button>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="min-w-0 text-xs font-semibold text-slate-600">
                    Fecha
                    <span className="relative mt-1 block">
                      <span className={`${fieldClass} flex items-center justify-between`}><span>{(row.date || localDate()).split('-').reverse().join('/')}</span><CalendarDays className="h-4 w-4 text-slate-500" /></span>
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
                        <UserRoundPlus className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
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
                    <input type="text" inputMode="decimal" value={row.liters} onChange={event => updateRow(index, { liters: event.target.value.replace(/[^0-9.,]/g, '') })} placeholder="0" className={`${fieldClass} mt-1`} aria-label={`Litros del movimiento ${index + 1}`} />
                  </label>

                  <label className="col-span-2 text-xs font-semibold text-slate-600">
                    Compra en la estación <span className="font-normal text-slate-500">(opcional)</span>
                    <span className="relative mt-1 block">
                      <ReceiptText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <input type="text" value={row.items || ''} onChange={event => updateRow(index, { items: event.target.value })} placeholder="Ej: franela, aceite, agua destilada" className={`${fieldClass} pl-9`} />
                    </span>
                  </label>
                </div>
              </section>
            );
          })}

          {!editing && <button type="button" onClick={addRow} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"><Plus className="h-4 w-4" /> Agregar otro movimiento</button>}
        </div>

        <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
          {error && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p>}
          <div className={`grid gap-2 ${editing ? 'grid-cols-[auto_auto_1fr]' : 'grid-cols-[auto_1fr]'}`}>
            {editing && <button type="button" onClick={handleDelete} disabled={saving} className="h-11 rounded-xl px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60">Eliminar</button>}
            <button type="button" onClick={onClose} className="h-11 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="button" onClick={handleSave} disabled={saving} className="h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Guardando…' : editing ? 'Guardar cambios' : rows.length === 1 ? 'Guardar movimiento' : `Guardar ${rows.length} movimientos`}</button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
