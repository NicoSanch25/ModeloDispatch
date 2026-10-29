import React from 'react';
import { Ambulance as AmbulanceIcon, ArrowRight, Car, Clock, Edit2, MapPin } from 'lucide-react';
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
}

/**
 * Lista de traslados: tarjetas en celular y tablet (todo visible, sin desplazamiento lateral)
 * y tabla desde `lg`.
 */
export const TransfersList: React.FC<TransfersListProps> = ({ transfers, staff, ambulances, onEdit }) => {
  if (transfers.length === 0) {
    return <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">No hay traslados registrados.</p>;
  }
  const driverName = (transfer: Transfer) => staff.find(s => s.id === transfer.driver_id)?.name;
  const ambulanceNumber = (transfer: Transfer) => ambulances.find(a => a.id === transfer.ambulance_id)?.number;

  return (
    <>
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

              <button type="button" onClick={() => onEdit(transfer)} className="dispatch-secondary-action mt-3 w-full min-h-11">
                <Edit2 className="h-4 w-4" aria-hidden="true" /> Editar traslado
              </button>
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
                <td className="text-center">
                  <button onClick={() => onEdit(transfer)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar" aria-label="Editar traslado">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
