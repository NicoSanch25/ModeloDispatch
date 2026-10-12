import type { Match, Transfer } from '../types';
import { coverageWindow } from './scheduling';
import type { Service } from '../services/business';

// A common read model. Original records remain the source of truth.
export interface AgendaService {
  key: string;
  kind: 'coverage' | 'transfer';
  date: string;
  title: string;
  detail: string;
  status: string;
  closed: boolean;
  operatingNow?: boolean;
  start: number | null;
  end: number | null;
  crew: string[];
  ambulanceId?: string;
  warnings: string[];
  source: Match | Transfer;
}
export function applyServiceRegistry(agenda: AgendaService[],registry: Service[]): AgendaService[] {
  const labels={scheduled:'Programado',en_route:'En camino',in_service:'En servicio',finished:'Finalizó · regreso pendiente',returning:'Regresando',closed:'Cerrado',cancelled:'Cancelado'};
  const indexed=new Map(registry.map(s=>[`${s.kind}:${s.coverage_id||s.transfer_id}`,s]));
  return agenda.map(row=>{
    const s=indexed.get(row.key);if(!s)return row;
    return {...row,status:labels[s.state],closed:s.state==='closed'||s.state==='cancelled',operatingNow:['en_route','in_service','finished','returning'].includes(s.state),crew:s.crew,ambulanceId:s.ambulance_id,
      start:s.start_at?Date.parse(s.start_at):row.start,end:s.end_at?Date.parse(s.end_at):row.end};
  });
}
export interface AgendaConflict {
  other: AgendaService;
  staffIds: string[];
  ambulanceId?: string;
  possible: boolean;
}

function timestamp(date: string, time?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time || '')) return null;
  const value = Date.parse(`${date}T${time!.slice(0, 5)}:00-03:00`);
  return Number.isFinite(value) ? value : null;
}

/** Inicio y fin de un traslado: plan explícito o, si falta, sus horas de control. */
export function transferWindow(transfer: Transfer): { start: number | null; end: number | null } {
  // These are checkpoint hours, not a new planned reservation or a GPS report.
  const first = transfer.departure_base_time || transfer.arrival_origin_time || transfer.departure_origin_time || transfer.arrival_destination_time || transfer.departure_destination_time;
  const start = transfer.planned_start_at ? Date.parse(transfer.planned_start_at) : timestamp(transfer.date, first);
  let end = transfer.planned_end_at ? Date.parse(transfer.planned_end_at) : timestamp(transfer.date, transfer.arrival_base_time);
  if (start !== null && end !== null && end < start) end += 86_400_000;
  if (start === null || end === start) end = null;
  return { start, end };
}

export function buildAgenda(matches: Match[], transfers: Transfer[]): AgendaService[] {
  const coverages: AgendaService[] = matches.map(match => {
    const window = coverageWindow(match);
    return {
      key: `coverage:${match.id}`, kind: 'coverage', date: match.date,
      title: match.location || 'Lugar pendiente', detail: [match.type, match.fieldNumber].filter(Boolean).join(' · '),
      status: match.status === 'Pending' ? 'Pendiente' : match.status === 'Confirmed' ? 'Confirmada' : match.status === 'Completed' ? 'Finalizada' : 'Suspendida',
      closed: match.status === 'Completed' || match.status === 'Suspended',
      start: window?.start ?? null, end: window?.end ?? null,
      crew: [...new Set([match.driverId, match.nurseId, match.thirdCrewId].filter((id): id is string => !!id))],
      ambulanceId: match.ambulanceId, source: match,
      warnings: [!window && 'Horario pendiente', !match.ambulanceId && 'Móvil pendiente', !match.driverId && 'Chofer pendiente', !match.isSingleCrew && !match.nurseId && 'Enfermero/a pendiente'].filter((value): value is string => !!value)
    };
  });
  const journeys: AgendaService[] = transfers.map(transfer => {
    const { start, end } = transferWindow(transfer);
    return {
      key: `transfer:${transfer.id}`, kind: 'transfer', date: transfer.date,
      title: `${transfer.origin || 'Origen pendiente'} → ${transfer.destination || 'Destino pendiente'}`,
      detail: transfer.transfer_number ? `Traslado ${transfer.transfer_number}` : 'Traslado',
      status: transfer.status === 'Completed' ? 'Finalizado' : transfer.status === 'Cancelled' ? 'Cancelado' : 'Pendiente',
      closed: transfer.status === 'Completed' || transfer.status === 'Cancelled',
      start, end, crew: [transfer.driver_id, transfer.nurse_id].filter((id): id is string => !!id), ambulanceId: transfer.ambulance_id, source: transfer,
      warnings: [start === null && 'Horario pendiente', end === null && 'Regreso sin horario: ocupación por verificar', !transfer.driver_id && 'Chofer pendiente', !transfer.ambulance_id && 'Móvil y tripulación del traslado sin reserva registrada'].filter((value): value is string => !!value)
    };
  });
  return [...coverages, ...journeys].sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? Infinity) - (b.start ?? Infinity) || a.key.localeCompare(b.key));
}

export function servicesForDay(services: AgendaService[], date: string, includeClosed = false) {
  const dayStart = timestamp(date, '00:00');
  if (dayStart === null) return [];
  return services.filter(service => (includeClosed || !service.closed) &&
    (service.date === date || (service.operatingNow && date === new Date().toLocaleDateString('en-CA',{timeZone:'America/Argentina/Buenos_Aires'})) || (service.start !== null && service.end !== null && service.start < dayStart + 86_400_000 && service.end > dayStart))
  ).sort((a, b) => (a.start ?? Infinity) - (b.start ?? Infinity) || a.key.localeCompare(b.key));
}

export function agendaConflicts(current: AgendaService, services: AgendaService[]): AgendaConflict[] {
  if (current.closed) return [];
  return services.flatMap(other => {
    if (other.key === current.key || other.closed) return [];
    const staffIds = current.crew.filter(id => other.crew.includes(id));
    const ambulanceId = current.ambulanceId && current.ambulanceId === other.ambulanceId ? current.ambulanceId : undefined;
    if (!staffIds.length && !ambulanceId) return [];
    const complete = current.start !== null && current.end !== null && other.start !== null && other.end !== null;
    if (complete) {
      // Preserve the existing 15-minute coverage clearance; transfer return is only a checkpoint.
      if (current.start! >= other.end! + 15 * 60_000 || current.end! + 15 * 60_000 <= other.start!) return [];
    } else {
      // Missing hours cannot prove safety. Flag shared resources in overlapping days for review.
      const overlapsDay = servicesForDay([other], current.date).length > 0 || servicesForDay([current], other.date).length > 0;
      if (!overlapsDay) return [];
      if (current.end !== null && other.start !== null && current.end + 15 * 60_000 <= other.start) return [];
      if (other.end !== null && current.start !== null && other.end + 15 * 60_000 <= current.start) return [];
    }
    return [{ other, staffIds, ambulanceId, possible: !complete }];
  });
}

export function agendaTime(value: number | null) {
  return value === null ? 'Sin horario' : new Date(value).toLocaleTimeString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hour12: false });
}

export function shiftAgendaDate(date: string, days: number) {
  const value = timestamp(date, '12:00');
  return value === null ? date : new Date(value + days * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}
