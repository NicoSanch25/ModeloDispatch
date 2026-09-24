import React, { useMemo, useState } from 'react';
import { Activity, ArrowUpRight, BarChart3, CalendarDays, Droplet, Plus, Truck, AlertCircle } from 'lucide-react';
import type { Ambulance, FuelRecord, Match, Transfer } from '../types';
import { localDate, summarizeOperations } from '../utils/statistics';

interface Props {
  matches: Match[]; transfers: Transfer[]; fuelRecords: FuelRecord[]; ambulances: Ambulance[];
  onNewMatch: () => void; onNewTransfer: () => void; onAgenda: () => void; onFleet: () => void;
}

export function OperationsInsights({ matches, transfers, fuelRecords, ambulances, onNewMatch, onNewTransfer, onAgenda, onFleet }: Props) {
  const [days, setDays] = useState(7);
  const today = localDate();
  const summary = useMemo(() => summarizeOperations(matches, transfers, fuelRecords, today, days), [matches, transfers, fuelRecords, today, days]);
  const unassigned = matches.filter(m => m.date === today && !['Completed', 'Suspended'].includes(m.status) && (!m.ambulanceId || !m.driverId || (!m.isSingleCrew && !m.nurseId))).length;
  const expired = ambulances.filter(a => a.maintenance?.vtvExpiration && a.maintenance.vtvExpiration < today).length;
  const max = Math.max(1, ...summary.series.map(d => d.coverage + d.transfers));
  const number = (value: number) => value.toLocaleString('es-AR', { maximumFractionDigits: 1 });
  return <section className="space-y-4" aria-label="Resumen de operaciones">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase">Centro de operaciones</p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">Cada servicio, bajo control.</h2>
        <p className="text-sm text-slate-500 mt-1">Planificá el día y seguí la actividad de tu equipo.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={onNewTransfer} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold hover:bg-slate-50"><Truck size={16} /> Traslado</button>
        <button onClick={onNewMatch} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"><Plus size={16} /> Cobertura</button>
      </div>
    </div>
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
          <p className="text-[11px] text-slate-500 mt-1">{detail}</p>
        </div>)}
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-end gap-1 h-20" role="img" aria-label={`Actividad diaria: ${summary.coverage} coberturas y ${summary.transfers} traslados en los últimos ${days} días. Detalle disponible debajo.`}>
          {summary.series.map(d => <div key={d.date} className="flex-1 h-full flex flex-col justify-end gap-0.5" title={`${d.date}: ${d.coverage} coberturas, ${d.transfers} traslados`}>
            <div className="bg-teal-400 rounded-t-sm" style={{ height: `${d.transfers / max * 90}%` }} />
            <div className="bg-indigo-500 rounded-t-sm" style={{ height: `${d.coverage / max * 90}%`, minHeight: d.coverage + d.transfers === 0 ? 2 : 0 }} />
          </div>)}
        </div>
        <div className="flex justify-between text-[11px] text-slate-500 mt-2"><span>{summary.start.split('-').reverse().join('/')}</span><span>Hasta hoy · {today.split('-').reverse().join('/')}</span></div>
        <div className="flex gap-4 text-xs text-slate-600 mt-3"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" />Coberturas</span><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-400" />Traslados</span></div>
        {!summary.coverage && !summary.transfers && <p className="text-sm text-slate-500 mt-2">No hay servicios registrados en este período.</p>}
        <details className="mt-3 text-xs text-slate-500">
          <summary className="cursor-pointer py-1">Ver detalle diario</summary>
          <div className="max-h-48 overflow-auto mt-2"><table className="w-full text-left"><caption className="sr-only">Servicios por fecha</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Coberturas</th><th scope="col">Traslados</th></tr></thead><tbody>{summary.series.map(d => <tr key={d.date} className="border-t border-slate-100"><td className="py-1">{d.date.split('-').reverse().join('/')}</td><td>{d.coverage}</td><td>{d.transfers}</td></tr>)}</tbody></table></div>
        </details>
        <p className="mt-2 text-[11px] text-slate-400">Calculado sobre los registros cargados. Incluye todos los estados, salvo en finalización.</p>
      </div>
    </div>
    {(unassigned > 0 || expired > 0) && <div className="flex flex-col sm:flex-row gap-2">
      {unassigned > 0 && <button onClick={onAgenda} className="flex-1 flex items-center gap-2 text-left text-sm bg-amber-50 text-amber-900 border border-amber-200 rounded-xl px-3 py-2.5"><AlertCircle size={17} /><span className="flex-1">{unassigned} {unassigned === 1 ? 'cobertura de hoy sin asignación completa' : 'coberturas de hoy sin asignación completa'}</span><ArrowUpRight size={16} /></button>}
      {expired > 0 && <button onClick={onFleet} className="flex-1 flex items-center gap-2 text-left text-sm bg-rose-50 text-rose-900 border border-rose-200 rounded-xl px-3 py-2.5"><AlertCircle size={17} /><span className="flex-1">{expired} {expired === 1 ? 'móvil con VTV vencida' : 'móviles con VTV vencida'}</span><ArrowUpRight size={16} /></button>}
    </div>}
  </section>;
}
