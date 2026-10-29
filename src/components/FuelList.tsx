import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Droplet, Edit2, Gauge, ReceiptText } from 'lucide-react';
import type { Ambulance, FuelRecord, Staff } from '../types';
import { localDate } from '../utils/statistics';
import { formatKm, formatPesos, shiftMonth, summarizeFuelMonth } from '../utils/fuel';

interface FuelListProps {
  records: FuelRecord[];
  staff: Staff[];
  ambulances: Ambulance[];
  onEdit: (record: FuelRecord) => void;
}

const liters = (value: number) => `${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })} L`;
const dayLabel = (date: string) => date.split('-').reverse().slice(0, 2).join('/');
const monthLabel = (month: string) => {
  const label = new Date(`${month}-15T12:00:00`).toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Control mensual de combustible: totales, litros por móvil y movimientos (tarjetas en celular, tabla desde `sm`). */
export const FuelList: React.FC<FuelListProps> = ({ records, staff, ambulances, onEdit }) => {
  const currentMonth = localDate().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [ambulanceId, setAmbulanceId] = useState('');
  const summary = useMemo(() => summarizeFuelMonth(records, month, ambulanceId), [records, month, ambulanceId]);
  const ambulanceNumber = (id: string) => ambulances.find(a => a.id === id)?.number || '--';
  const driverName = (record: FuelRecord) => staff.find(s => s.id === record.driverId)?.name || record.externalDriverName || 'Chofer sin indicar';
  // Importe, kilometraje y ticket en una línea; los movimientos anteriores a los tickets no los tienen.
  const ticketLine = (record: FuelRecord) => [
    record.amount !== undefined ? formatPesos(record.amount) : null,
    record.odometerKm !== undefined ? formatKm(record.odometerKm) : null,
    record.ticketNumber ? `Ticket ${record.ticketNumber}` : null
  ].filter(Boolean).join(' · ');

  return (
    <div className="space-y-3">
      <div className="dispatch-card p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1" role="group" aria-label="Mes">
            <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Mes anterior"><ChevronLeft className="h-5 w-5" /></button>
            <span className="min-w-36 text-center font-bold text-slate-800" aria-live="polite">{monthLabel(month)}</span>
            <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= currentMonth} className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Mes siguiente"><ChevronRight className="h-5 w-5" /></button>
          </div>
          <select value={ambulanceId} onChange={e => setAmbulanceId(e.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm" aria-label="Filtrar por móvil">
            <option value="">Todos los móviles</option>
            {ambulances.map(a => <option key={a.id} value={a.id}>Móvil {a.number}</option>)}
          </select>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          <div className="rounded-xl bg-emerald-50 p-2"><dt className="text-xs text-emerald-800">Gastado</dt><dd className="text-lg font-bold tabular-nums text-emerald-900">{formatPesos(summary.amount)}</dd></div>
          <div className="rounded-xl bg-cyan-50 p-2"><dt className="text-xs text-cyan-800">Litros</dt><dd className="text-lg font-bold tabular-nums text-cyan-900">{liters(summary.liters)}</dd></div>
          <div className="rounded-xl bg-slate-50 p-2"><dt className="text-xs text-slate-600">Cargas</dt><dd className="text-lg font-bold text-slate-900">{summary.loads}</dd></div>
          <div className="rounded-xl bg-amber-50 p-2"><dt className="text-xs text-amber-800">Compras</dt><dd className="text-lg font-bold text-amber-900">{summary.purchases}</dd></div>
        </dl>
        {summary.withoutAmount > 0 && (
          <p className="text-xs text-slate-500">{summary.withoutAmount === 1 ? '1 movimiento no tiene importe' : `${summary.withoutAmount} movimientos no tienen importe`} (cargados antes de los tickets).</p>
        )}
        {!ambulanceId && summary.byAmbulance.length > 1 && (
          <ul className="flex flex-wrap gap-1.5 text-xs" aria-label="Consumo por móvil">
            {summary.byAmbulance.map(item => <li key={item.ambulanceId} className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">Móvil {ambulanceNumber(item.ambulanceId)} · {liters(item.liters)}{item.amount > 0 ? ` · ${formatPesos(item.amount)}` : ''}</li>)}
          </ul>
        )}
      </div>

      {summary.rows.length === 0 ? (
        <div className="dispatch-card p-10 text-center text-sm text-slate-500"><Droplet className="mx-auto mb-2 h-7 w-7 text-slate-300" />No hay movimientos en {monthLabel(month).toLowerCase()}.</div>
      ) : (
        <>
          <ul className="space-y-2 sm:hidden" aria-label="Movimientos de combustible">
            {summary.rows.map(rec => (
              <li key={rec.id}>
                <button type="button" onClick={() => onEdit(rec)} className="dispatch-card w-full p-3 text-left" aria-label={`Corregir movimiento del ${dayLabel(rec.date)}, móvil ${ambulanceNumber(rec.ambulanceId)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500">{dayLabel(rec.date)} · {rec.fuelType}</p>
                      <h3 className="font-bold text-slate-900">Móvil {ambulanceNumber(rec.ambulanceId)}</h3>
                      <p className="mt-0.5 truncate text-sm text-slate-600">{driverName(rec)}</p>
                      {ticketLine(rec) && <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Gauge className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />{ticketLine(rec)}</p>}
                    </div>
                    {rec.liters > 0 ? <span className="shrink-0 rounded-lg bg-cyan-50 px-2 py-1 font-mono text-sm font-semibold text-cyan-700">{liters(rec.liters)}</span> : <span className="shrink-0 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Compra</span>}
                  </div>
                  {rec.items && <p className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-sm text-slate-700"><ReceiptText className="h-4 w-4 shrink-0 text-slate-500" /> {rec.items}</p>}
                </button>
              </li>
            ))}
          </ul>
          <div className="dispatch-table-wrap hidden sm:block">
            <table className="dispatch-table">
              <thead>
                <tr><th>Fecha</th><th>Móvil</th><th>Chofer</th><th>Combustible</th><th>Litros</th><th>Importe</th><th>Km</th><th>Compra</th><th><span className="sr-only">Acciones</span></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.rows.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td>{dayLabel(rec.date)}</td>
                    <td className="whitespace-nowrap font-semibold text-slate-800">Móvil {ambulanceNumber(rec.ambulanceId)}</td>
                    <td>{driverName(rec)}</td>
                    <td>{rec.fuelType}</td>
                    <td>{rec.liters > 0 ? <span className="whitespace-nowrap rounded-lg bg-cyan-50 px-2 py-1 font-mono font-semibold text-cyan-700">{liters(rec.liters)}</span> : '—'}</td>
                    <td className="tabular-nums">{rec.amount !== undefined ? <span className="whitespace-nowrap font-semibold text-slate-800">{formatPesos(rec.amount)}</span> : '—'}{rec.ticketNumber && <span className="block text-xs text-slate-500">Ticket {rec.ticketNumber}</span>}</td>
                    <td className="whitespace-nowrap tabular-nums">{rec.odometerKm !== undefined ? formatKm(rec.odometerKm) : '—'}</td>
                    <td>{rec.items || '—'}</td>
                    <td className="text-right"><button type="button" onClick={() => onEdit(rec)} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"><Edit2 className="h-4 w-4" /> Corregir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
