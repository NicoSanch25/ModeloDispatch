import type { Ambulance } from '../types';
import { agendaConflicts, type AgendaService } from './agenda';

// Margen después del fin previsto antes de avisar que un servicio quedó sin cerrar.
export const CLOSE_GRACE_MINUTES = 30;

const isOpenAhead = (service: AgendaService, today: string, now: number) =>
  !service.closed && (service.date >= today || (service.end !== null && service.end > now));

/** Servicios que ya tendrían que haber terminado y siguen abiertos. Sin horario de fin, cuenta desde el día siguiente. */
export function overdueServices(services: AgendaService[], today: string, now: number) {
  return services
    .filter(service => !service.closed && (service.end !== null ? service.end + CLOSE_GRACE_MINUTES * 60_000 < now : service.date < today))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? Infinity) - (b.start ?? Infinity));
}

/** Servicios abiertos (de hoy en adelante) que comparten chofer, tripulación o móvil con otro en el mismo horario. */
export function conflictedServices(services: AgendaService[], today: string, now: number) {
  return services.filter(service => isOpenAhead(service, today, now) && agendaConflicts(service, services).length > 0);
}

/** Servicios abiertos asignados a un móvil propio que figura en taller o fuera de servicio. */
export function blockedAssignments(services: AgendaService[], ambulances: Ambulance[], today: string, now: number) {
  const blocked = new Map(ambulances.filter(a => a.maintenance?.status && a.maintenance.status !== 'Active').map(a => [a.id, a]));
  return services
    .filter(service => service.ambulanceId && blocked.has(service.ambulanceId) && isOpenAhead(service, today, now))
    .map(service => ({ service, ambulance: blocked.get(service.ambulanceId!)! }));
}
