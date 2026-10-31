import React, { useMemo, useState } from 'react';
import { Ambulance as AmbulanceIcon, ArrowRight, Car, Check, Clock, Copy, Edit2, MapPin, Search } from 'lucide-react';
import type { Ambulance, Staff, Transfer } from '../types';
import { formatDateAR } from '../utils/formatters';
import { agendaTime, transferWindow } from '../utils/agenda';
import { TRANSFER_STATUS } from '../utils/status';
import { StatusChip as Chip } from './ui/StatusChip';

const StatusChip: React.FC<{ status: Transfer['status'] }> = ({ status }) => {
  const { label, tone } = TRANSFER_STATUS[status] ?? TRANSFER_STATUS.Pending;
  return <Chip tone={tone}>{label}</Chip>;
};

/** Dato faltante: se marca para que el operador lo vea sin abrir el traslado. */
const Missing: React.FC<{ children: React.ReactNode }> = ({ children }) => <span className="font-medium text-amber-700">{children}</span>;

const schedule = (transfer: Transfer) => {
  const { start, end } = transferWindow(transfer);
  if (start === null) return 'Sin horario';
  return end === null ? agendaTime(start) : `${agendaTime(start)} – ${agendaTime(end)}`;
};

interface TransfersListProps {
  transfers: Transfer[];
  staff: Staff[];
  ambulances: Ambulance[];
  onEdit: (transfer: Transfer) => void;
  onDuplicate?: (transfer: Transfer) => void;
  /** Cierra el traslado en un toque. */
  onComplete: (transfer: Transfer) => Promise<void>;
}

type Filter = 'Pending' | 'Completed' | 'all';
const FILTERS: [Filter, string][] = [['Pending', 'Pendientes'], ['Completed', 'Finalizados'], ['all', 'Todos']];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Lista de traslados: tarjetas en celular y tablet (todo visible, sin desplazamiento lateral)
 * y tabla desde `lg`.
 */
export const TransfersList: React.FC<TransfersListProps> = ({ transfers: all, staff, ambulances, onEdit, onDuplicate, onComplete }) => {
  const [filter, setFilter] = useState<Filter>('Pending');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const driverName = (transfer: Transfer) => staff.find(s => s.id === transfer.driver_id)?.name;
  const ambulanceNumber = (transfer: Transfer) => ambulances.find(a => a.id === transfer.ambulance_id)?.number;
  const counts = useMemo(() => ({ Pending: all.filter(t => t.status === 'Pending').length, Completed: all.filter(t => t.status === 'Completed').length, all: all.length }), [all]);
  const transfers = useMemo(() => {
    const q = normalize(query.trim());
    return all
      .filter(t => filter === 'all' || t.status === filter)
      .filter(t => !q || normalize([t.transfer_number, t.patient_name, t.origin, t.destination, driverName(t)].filter(Boolean).join(' ')).includes(q))
      // Pendientes: el más próximo primero. Finalizados y todos: el más reciente primero.
      .sort((a, b) => filter === 'Pending' ? a.date.localeCompare(b.date) || (transferWindow(a).start ?? Infinity) - (transferWindow(b).start ?? Infinity) : b.date.localeCompare(a.date));
  }, [all, filter, query, staff]);

  const complete = async (transfer: Transfer) => {
    setBusyId(transfer.id);
    try { await onComplete(transfer); } finally { setBusyId(null); }
  };
  const finishButton = (transfer: Transfer, compact = false) => transfer.status === 'Pending' && (
    <button type="button" onClick={() => complete(transfer)} disabled={busyId === transfer.id} className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 ${compact ? 'h-9 px-2.5 text-xs' : 'min-h-11 px-3 text-sm'}`}>
      <Check className="h-4 w-4" aria-hidden="true" /> {busyId === transfer.id ? 'Guardando…' : 'Finalizar'}
    </button>
  );

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Filtrar traslados">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`min-h-9 flex-1 rounded-lg px-3 text-sm font-semibold sm:flex-none ${filter === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>
              {label} <span className="text-xs font-normal text-slate-500">{counts[key]}</span>
            </button>
          ))}
        </div>
        <label className="relative block sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" aria-hidden="true" />
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar paciente, lugar, chofer o N.º" aria-label="Buscar traslados" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" />
        </label>
      </div>
      {transfers.length === 0 && (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          {query ? 'Ningún traslado coincide con la búsqueda.' : filter === 'Pending' ? 'No hay traslados pendientes.' : 'No hay traslados registrados.'}
        </p>
      )}
      <ul className="space-y-3 lg:hidden" aria-label="Traslados">
        {transfers.map(transfer => {
          const driver = driverName(transfer);
          const ambulance = ambulanceNumber(transfer);
          return (
            <li key={transfer.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <Clock className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                    {formatDateAR(transfer.date)} · {schedule(transfer)}
                  </p>
                  {transfer.transfer_number && <p className="mt-0.5 text-xs text-slate-500">N.º {transfer.transfer_number}</p>}
                </div>
                <StatusChip status={transfer.status} />
              </div>

              <p className="mt-3 font-semibold text-slate-900">{transfer.patient_name || <span className="font-normal text-slate-500">Paciente sin cargar</span>}</p>

              <p className="mt-1.5 flex items-start gap-1.5 text-sm text-slate-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <span className="min-w-0 break-words">
                  {transfer.origin || <Missing>Origen pendiente</Missing>}
                  <ArrowRight className="mx-1 inline h-3.5 w-3.5 text-slate-500" aria-hidden="true" /><span className="sr-only"> hacia </span>
                  {transfer.destination || <Missing>Destino pendiente</Missing>}
                </span>
              </p>

              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Car className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /><span className="sr-only">Chofer:</span>
                  {driver || <Missing>Chofer pendiente</Missing>}
                </span>
                {ambulance && (
                  <span className="flex items-center gap-1.5">
                    <AmbulanceIcon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                    Móvil {ambulance}
                  </span>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => onEdit(transfer)} className="dispatch-secondary-action min-h-11 flex-1">
                  <Edit2 className="h-4 w-4" aria-hidden="true" /> Editar
                </button>
                {finishButton(transfer)}
                {onDuplicate && <button type="button" onClick={() => onDuplicate(transfer)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Duplicar traslado" title="Duplicar para la semana siguiente">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </button>}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="dispatch-table-wrap hidden lg:block">
        <table className="dispatch-table min-w-[900px]">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Paciente</th>
              <th>Origen</th>
              <th>Destino</th>
              <th>Chofer</th>
              <th>Estado</th>
              <th className="text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transfers.map(transfer => (
              <tr key={transfer.id} className="hover:bg-slate-50 transition-colors">
                <td>{formatDateAR(transfer.date)}</td>
                <td className="font-semibold text-slate-800">{transfer.patient_name || '--'}</td>
                <td className="text-slate-600">{transfer.origin || '--'}</td>
                <td className="text-slate-600">{transfer.destination || '--'}</td>
                <td>{driverName(transfer) || '--'}</td>
                <td><StatusChip status={transfer.status} /></td>
                <td className="text-center whitespace-nowrap">
                  {finishButton(transfer, true)}
                  <button onClick={() => onEdit(transfer)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar" aria-label="Editar traslado">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {onDuplicate && <button onClick={() => onDuplicate(transfer)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="Duplicar para la semana siguiente" aria-label="Duplicar traslado">
                    <Copy className="w-4 h-4" />
                  </button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
