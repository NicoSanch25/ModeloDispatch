import type { Match, Transfer } from '../types';
import type { ServiceState } from '../services/business';

/** Tono visual de un estado. Se usa igual en tablero, agenda, listas y administración. */
export type StatusTone = 'pending' | 'confirmed' | 'active' | 'done' | 'cancelled';

export const TONE_CLASS: Record<StatusTone, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-sky-100 text-sky-800',
  active: 'bg-violet-100 text-violet-800',
  done: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-200 text-slate-700',
};

export const MATCH_STATUS: Record<Match['status'], { label: string; tone: StatusTone }> = {
  Pending: { label: 'Pendiente', tone: 'pending' },
  Confirmed: { label: 'Confirmada', tone: 'confirmed' },
  Completed: { label: 'Finalizada', tone: 'done' },
  Suspended: { label: 'Suspendida', tone: 'cancelled' },
};

export const TRANSFER_STATUS: Record<Transfer['status'], { label: string; tone: StatusTone }> = {
  Pending: { label: 'Pendiente', tone: 'pending' },
  Completed: { label: 'Finalizado', tone: 'done' },
  Cancelled: { label: 'Cancelado', tone: 'cancelled' },
};

export const SERVICE_TONE: Record<ServiceState, StatusTone> = {
  scheduled: 'confirmed', en_route: 'active', in_service: 'active', finished: 'active', returning: 'active', closed: 'done', cancelled: 'cancelled',
};
