import React, { useMemo, useState } from 'react';
import { Activity, ArrowUpRight, BarChart3, CalendarDays, Droplet, Truck, AlertCircle, AlertTriangle, Clock, IdCard, Wrench, type LucideIcon } from 'lucide-react';
import type { Ambulance, FuelRecord, Match, Staff, Transfer } from '../types';
import type { AgendaService } from '../utils/agenda';
import { blockedAssignments, conflictedServices, overdueServices } from '../utils/attention';
import { licenseAlerts, licenseLabel, licenseStatus } from '../utils/licenses';
import { localDate, summarizeOperations } from '../utils/statistics';

interface Props {
  matches: Match[]; transfers: Transfer[]; fuelRecords: FuelRecord[];
}

interface AlertsProps {
  matches: Match[]; ambulances: Ambulance[]; staff: Staff[]; services: AgendaService[];
  onAgenda: () => void; onFleet: () => void; onStaff: () => void;
  onOpenService: (service: AgendaService) => void; onOpenDay: (date: string) => void; onNav: (section: 'matches' | 'transfers') => void;
}

interface Alert { key: string; urgent: boolean; icon: LucideIcon; text: string; onClick: () => void; }

const VISIBLE_ALERTS = 3;
const dayMonth = (date: string) => date.split('-').reverse().slice(0, 2).join('/');
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Avisos que requieren acción, arriba del tablero. Primero lo urgente (rojo): móviles en taller con servicios,
 * cruces y vencimientos; después lo pendiente (ámbar). Con muchos avisos se muestran tres y el resto a pedido.
 */
export function AttentionAlerts({ matches, ambulances, staff, services, onAgenda, onFleet, onStaff, onOpenService, onOpenDay, onNav }: AlertsProps) {
  const [expanded, setExpanded] = useState(false);
  const today = localDate();
  const now = Date.now();
  const unassigned = matches.filter(m => m.date === today && !['Completed', 'Suspended'].includes(m.status) && (!m.ambulanceId || !m.driverId || (!m.isSingleCrew && !m.nurseId))).length;
  const vtv = ambulances.filter(a => !a.isOutsourced).map(a => licenseStatus(a.maintenance?.vtvExpiration, today));
  const expired = vtv.filter(v => v.state === 'expired').length;
  const vtvSoon = vtv.filter(v => v.state === 'soon').length;
  const licenses = useMemo(() => licenseAlerts(staff, today), [staff, today]);
  const blocked = useMemo(() => blockedAssignments(services, ambulances, today, now), [services, ambulances, today]);
  const conflicted = useMemo(() => conflictedServices(services, today, now), [services, today]);
  const overdue = useMemo(() => overdueServices(services, today, now), [services, today]);

  const alerts: Alert[] = [];
  if (blocked.length) {
    const [{ service, ambulance }] = blocked;
    const where = ambulance.maintenance?.status === 'InRepair' ? 'en taller' : 'fuera de servicio';
    alerts.push({ key: 'blocked', urgent: true, icon: Wrench, onClick: () => blocked.length === 1 ? onOpenService(service) : onOpenDay(service.date),
      text: blocked.length === 1 ? `Móvil ${ambulance.number} está ${where} y tiene un servicio el ${dayMonth(service.date)}` : `${blocked.length} servicios asignados a móviles en taller o fuera de servicio` });
  }
  if (conflicted.length) alerts.push({ key: 'conflicts', urgent: true, icon: AlertTriangle, onClick: () => onOpenDay(conflicted[0].date),
    text: `${plural(conflicted.length, 'servicio', 'servicios')} con cruce de chofer, tripulación o móvil` });
  if (expired) alerts.push({ key: 'vtv', urgent: true, icon: AlertCircle, onClick: onFleet, text: plural(expired, 'móvil con VTV vencida', 'móviles con VTV vencida') });
  if (licenses.expired.length) alerts.push({ key: 'license', urgent: true, icon: IdCard, onClick: onStaff,
    text: licenses.expired.length === 1 ? `${licenses.expired[0].person.name} tiene la licencia vencida` : `${licenses.expired.length} choferes con licencia vencida` });
  if (unassigned) alerts.push({ key: 'unassigned', urgent: false, icon: AlertCircle, onClick: onAgenda, text: plural(unassigned, 'cobertura de hoy sin asignación completa', 'coberturas de hoy sin asignación completa') });
  for (const kind of ['coverage', 'transfer'] as const) {
    const late = overdue.filter(s => s.kind === kind);
    if (!late.length) continue;
    const noun = kind === 'coverage' ? 'Cobertura' : 'Traslado';
    alerts.push({ key: `overdue-${kind}`, urgent: false, icon: Clock, onClick: () => late.length === 1 ? onOpenService(late[0]) : onNav(kind === 'coverage' ? 'matches' : 'transfers'),
      text: late.length === 1 ? `${noun} del ${dayMonth(late[0].date)} (${late[0].title}) terminó y sigue ${kind === 'coverage' ? 'abierta' : 'abierto'}` : `${late.length} ${kind === 'coverage' ? 'coberturas' : 'traslados'} terminados sin cerrar` });
  }
  if (vtvSoon) alerts.push({ key: 'vtv-soon', urgent: false, icon: AlertCircle, onClick: onFleet, text: `${plural(vtvSoon, 'móvil con VTV por vencer', 'móviles con VTV por vencer')} en 30 días` });
  if (licenses.soon.length) alerts.push({ key: 'license-soon', urgent: false, icon: IdCard, onClick: onStaff,
    text: licenses.soon.length === 1 ? `${licenses.soon[0].person.name}: ${licenseLabel(licenses.soon[0].status).toLowerCase()}` : `${licenses.soon.length} licencias vencen en los próximos 30 días` });

  if (!alerts.length) return null;
  alerts.sort((a, b) => Number(b.urgent) - Number(a.urgent));
  const hidden = alerts.length - VISIBLE_ALERTS > 1 && !expanded ? alerts.length - VISIBLE_ALERTS : 0;
  return <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mb-3" role="region" aria-label="Requiere atención">
    {alerts.slice(0, alerts.length - hidden).map(({ key, urgent, icon: Icon, text, onClick }) =>
      <button key={key} onClick={onClick} className={`flex-1 sm:basis-72 flex items-center gap-2 text-left text-sm border rounded-xl px-3 py-2.5 ${urgent ? 'bg-rose-50 text-rose-900 border-rose-200' : 'bg-amber-50 text-amber-900 border-amber-200'}`}>
        <Icon size={17} className="shrink-0" /><span className="flex-1">{text}</span><ArrowUpRight size={16} className="shrink-0" />
      </button>)}
    {(hidden > 0 || expanded) && <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="self-start text-sm font-semibold text-indigo-700 px-1 py-2">
      {expanded ? 'Mostrar menos avisos' : `Ver ${plural(hidden, 'aviso más', 'avisos más')}`}
    </button>}
  </div>;
}

export function OperationsInsights({ matches, transfers, fuelRecords }: Props) {
  const [days, setDays] = useState(7);
  const today = localDate();
  const summary = useMemo(() => summarizeOperations(matches, transfers, fuelRecords, today, days), [matches, transfers, fuelRecords, today, days]);
  const max = Math.max(1, ...summary.series.map(d => d.coverage + d.transfers));
  const number = (value: number) => value.toLocaleString('es-AR', { maximumFractionDigits: 1 });
  return <section className="space-y-4" aria-label="Resumen de operaciones">
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex flex-wrap justify-between items-center gap-2 px-4 py-3 border-b border-slate-100">
        <h3 className="font-semibold flex items-center gap-2 text-slate-800"><BarChart3 size={18} className="text-indigo-500" /> Actividad del período</h3>
        <div className="flex bg-slate-100 rounded-lg p-1" aria-label="Período de estadísticas">
          {[7, 30].map(n => <button key={n} aria-pressed={days === n} onClick={() => setDays(n)} className={`px-3 py-1 text-xs font-semibold rounded-md ${days === n ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>{n} días</button>)}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-3">
        {[
          { label: 'Coberturas', value: summary.coverage, detail: `${summary.completed} completadas · ${summary.suspended} suspendidas`, icon: CalendarDays },
          { label: 'Traslados', value: summary.transfers, detail: `${summary.completedTransfers} completados`, icon: Truck },
          { label: 'Finalización', value: summary.completionRate === null ? '—' : `${summary.completionRate}%`, detail: 'Coberturas, sin suspendidas', icon: Activity },
          { label: 'Combustible', value: `${number(summary.liters)} L`, detail: 'Litros cargados en el período', icon: Droplet },
        ].map(({ label, value, detail, icon: Icon }) => <div className="rounded-xl bg-slate-50 p-3" key={label}>
          <div className="flex items-center justify-between gap-2 text-slate-500 text-xs"><span>{label}</span><Icon size={15} /></div>
          <p className="text-2xl font-bold tracking-tight mt-1 text-slate-900">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{detail}</p>
        </div>)}
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-end gap-1 h-20" role="img" aria-label={`Actividad diaria: ${summary.coverage} coberturas y ${summary.transfers} traslados en los últimos ${days} días. Detalle disponible debajo.`}>
          {summary.series.map(d => <div key={d.date} className="flex-1 h-full flex flex-col justify-end gap-0.5" title={`${d.date}: ${d.coverage} coberturas, ${d.transfers} traslados`}>
            <div className="bg-teal-400 rounded-t-sm" style={{ height: `${d.transfers / max * 90}%` }} />
            {d.coverage + d.transfers === 0 ? <div className="h-0.5 rounded-full bg-slate-200" /> : <div className="bg-indigo-500 rounded-t-sm" style={{ height: `${d.coverage / max * 90}%` }} />}
          </div>)}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2"><span>{summary.start.split('-').reverse().join('/')}</span><span>Hasta hoy · {today.split('-').reverse().join('/')}</span></div>
        <div className="flex gap-4 text-xs text-slate-600 mt-3"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" />Coberturas</span><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-400" />Traslados</span></div>
        {!summary.coverage && !summary.transfers && <p className="text-sm text-slate-500 mt-2">No hay servicios registrados en este período.</p>}
        <details className="mt-3 text-xs text-slate-500">
          <summary className="cursor-pointer py-1">Ver detalle diario</summary>
          <div className="max-h-48 overflow-auto mt-2"><table className="w-full text-left"><caption className="sr-only">Servicios por fecha</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Coberturas</th><th scope="col">Traslados</th></tr></thead><tbody>{summary.series.map(d => <tr key={d.date} className="border-t border-slate-100"><td className="py-1">{d.date.split('-').reverse().join('/')}</td><td>{d.coverage}</td><td>{d.transfers}</td></tr>)}</tbody></table></div>
        </details>
        <p className="mt-2 text-xs text-slate-500">Calculado sobre los registros cargados. Incluye todos los estados, salvo en finalización.</p>
      </div>
    </div>
  </section>;
}
