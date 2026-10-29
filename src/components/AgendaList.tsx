import React from 'react';
import { AlertTriangle, Car, Clock, MapPin, Truck, Users } from 'lucide-react';
import type { Ambulance, Staff } from '../types';
import { agendaConflicts, agendaTime, type AgendaService } from '../utils/agenda';
import { StatusChip } from './ui/StatusChip';

interface Props {
  services: AgendaService[];
  allServices: AgendaService[];
  staff: Staff[];
  ambulances: Ambulance[];
  date: string;
  onOpen: (service: AgendaService) => void;
}

export function AgendaList({ services, allServices, staff, ambulances, date, onOpen }: Props) {
  const person = (id: string) => staff.find(member => member.id === id)?.name || 'Personal sin ficha';
  if (!services.length) return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No hay servicios para esta selección.</p>;
  return <div className="space-y-2">{services.map(service => {
    const conflicts = agendaConflicts(service, allServices);
    const ambulance = ambulances.find(vehicle => vehicle.id === service.ambulanceId);
    return <article key={service.key} className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${service.kind === 'coverage' ? 'text-indigo-700' : 'text-teal-700'}`}>
          {service.kind === 'coverage' ? <MapPin className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}{service.kind === 'coverage' ? 'Cobertura' : 'Traslado'}
        </span>
        <StatusChip tone={service.tone}>{service.status}</StatusChip>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-1 text-sm font-semibold text-slate-800"><Clock className="h-3.5 w-3.5" />{agendaTime(service.start)}{service.end !== null && ` – ${agendaTime(service.end)}`}{service.date < date && <span className="text-xs font-normal text-slate-500">Desde {service.date.split('-').reverse().join('/')}</span>}</p>
      {service.start !== null && service.end !== null && new Date(service.end).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }) > service.date && <p className="text-xs text-slate-500">Continúa al día siguiente</p>}
      <h4 className="mt-1 break-words font-semibold text-slate-800">{service.title}</h4>
      <p className="text-xs text-slate-500">{service.detail}</p>
      <div className="mt-2 space-y-1 text-xs text-slate-600">
        {ambulance && <p className="flex items-center gap-1"><Car className="h-3.5 w-3.5 shrink-0" />Móvil {ambulance.number}</p>}
        {!!service.crew.length && <p className="flex items-start gap-1"><Users className="h-3.5 w-3.5 shrink-0" />{service.crew.map(person).join(' · ')}</p>}
      </div>
      {!!conflicts.length && <div className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{conflicts.map(conflict => <p key={conflict.other.key} className="mb-1 last:mb-0"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" /><strong>{conflict.possible ? 'Posible cruce: verificar horarios' : 'Cruce de recursos'}</strong> · {[...conflict.staffIds.map(person), conflict.ambulanceId && `Móvil ${ambulance?.number || 'asignado'}`].filter(Boolean).join(', ')} con {conflict.other.kind === 'coverage' ? 'cobertura' : 'traslado'} en {conflict.other.title} ({agendaTime(conflict.other.start)}).</p>)}</div>}
      {!!service.warnings.length && !service.closed && <p className="mt-2 break-words text-xs text-amber-700">{service.warnings.join(' · ')}</p>}
      <button type="button" onClick={() => onOpen(service)} className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">{service.closed ? 'Ver servicio' : 'Abrir servicio'}</button>
    </article>;
  })}</div>;
}
