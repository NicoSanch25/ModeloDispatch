import React, { useState, useEffect, useRef } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Truck, Users, X } from 'lucide-react';
import type { Ambulance, Staff } from '../../types';
import { localDate } from '../../utils/statistics';
import { servicesForDay, shiftAgendaDate, type AgendaService } from '../../utils/agenda';
import { DateInput } from '../DateInput';
import { AgendaList } from '../AgendaList';
import { ModalShell } from '../ui/ModalShell';

interface Props {
  date: string; setDate: (date: string) => void; onClose: () => void;
  services: AgendaService[]; staff: Staff[]; ambulances: Ambulance[];
  onOpen: (service: AgendaService) => void;
  onCreate: (kind: 'coverage' | 'transfer') => void;
  onStaffSchedule: () => void;
  dataError: string | null; loading: boolean; onRefresh: () => void;
}

export function OperationalAgendaModal({ date, setDate, onClose, services, staff, ambulances, onOpen, onCreate, onStaffSchedule, dataError, loading, onRefresh }: Props) {
  const [kind, setKind] = useState('all');
  const [staffId, setStaffId] = useState('');
  const [includeClosed, setIncludeClosed] = useState(false);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select') || []);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  const day = servicesForDay(services, date, includeClosed).filter(service => (kind === 'all' || service.kind === kind) && (!staffId || service.crew.includes(staffId)));
  return <ModalShell onClose={onClose} labelledBy="agenda-title">
    <section ref={dialog} className="dispatch-modal-panel flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
      <header className="flex items-center justify-between gap-2 border-b p-3 sm:p-4"><h3 id="agenda-title" className="flex items-center gap-2 font-bold text-slate-800"><CalendarDays className="h-5 w-5 text-indigo-600" />Agenda de servicios</h3><button onClick={onClose} aria-label="Cerrar agenda" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></header>
      <div className="space-y-2 border-b bg-slate-50 p-3">
        <div className="flex items-center gap-2"><button aria-label="Día anterior" onClick={() => setDate(shiftAgendaDate(date, -1))} className="rounded-lg border bg-white p-2"><ChevronLeft className="h-4 w-4" /></button><div className="min-w-0 flex-1"><DateInput aria-label="Fecha de agenda" value={date} required onChange={event => { if (event.target.value) setDate(event.target.value); }} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-2 text-sm" /></div><button aria-label="Día siguiente" onClick={() => setDate(shiftAgendaDate(date, 1))} className="rounded-lg border bg-white p-2"><ChevronRight className="h-4 w-4" /></button><button onClick={() => setDate(localDate())} className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">Hoy</button></div>
        <div className="flex gap-2"><select aria-label="Tipo de servicio" value={kind} onChange={event => setKind(event.target.value)} className="min-w-0 flex-1 rounded-lg border bg-white p-2 text-sm"><option value="all">Todos los servicios</option><option value="coverage">Coberturas</option><option value="transfer">Traslados</option></select><select aria-label="Filtrar personal" value={staffId} onChange={event => setStaffId(event.target.value)} className="min-w-0 flex-1 rounded-lg border bg-white p-2 text-sm"><option value="">Todo el personal</option>{staff.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div>
        <div className="flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={includeClosed} onChange={event => setIncludeClosed(event.target.checked)} />Ver finalizados y cancelados</label><button onClick={onRefresh} disabled={loading} className="text-xs font-semibold text-indigo-700 disabled:opacity-50">{loading ? 'Actualizando…' : 'Actualizar agenda'}</button></div>
        <div className="flex flex-wrap gap-2"><button onClick={() => onCreate('transfer')} className="dispatch-secondary-action !px-3 !py-2 !text-xs"><Truck className="h-4 w-4" />Nuevo traslado</button><button onClick={() => onCreate('coverage')} className="dispatch-primary-action !px-3 !py-2 !text-xs"><Plus className="h-4 w-4" />Nueva cobertura</button></div>
      </div>
      <div className="flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-4">
        {dataError && <p role="alert" className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{dataError}</p>}
        <p className="mb-3 text-xs text-slate-500">Horarios registrados; no confirman salida ni disponibilidad real. Cruces con margen de 15 minutos. Los traslados sin móvil o tripulación asignados no participan en el control de cruces de esos recursos.</p>
        <AgendaList services={day} allServices={services} date={date} staff={staff} ambulances={ambulances} onOpen={onOpen} />
      </div>
      <footer className="border-t p-3"><button onClick={onStaffSchedule} className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Users className="h-4 w-4" />Cronograma de coberturas por personal</button></footer>
    </section>
  </ModalShell>;
}
