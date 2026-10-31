import type { Match, Transfer } from '../types';
import { shiftAgendaDate } from './agenda';

// Por defecto la copia va a la semana siguiente: mismo día y hora, que es lo habitual en servicios que se repiten.
export const DUPLICATE_DAYS = 7;

/** Nueva cobertura con los datos de otra: lugar, horario, cliente y tripulación. Queda pendiente y sin reportes. */
export function duplicateMatch(match: Match, days = DUPLICATE_DAYS): Partial<Match> {
  return {
    date: shiftAgendaDate(match.date, days), time: match.time, endTime: match.endTime,
    location: match.location, fieldNumber: match.fieldNumber, type: match.type,
    durationMinutes: match.durationMinutes, extensionMinutes: match.extensionMinutes, chukkers: match.chukkers,
    clientId: match.clientId, hiredBy: match.hiredBy, hiredContact: match.hiredContact,
    ambulanceId: match.ambulanceId, driverId: match.driverId, nurseId: match.nurseId, thirdCrewId: match.thirdCrewId,
    isSingleCrew: match.isSingleCrew, status: 'Pending',
  };
}

// Datos del pedido que se repiten. No se copian número de hoja, horas reales, kilómetros ni observaciones del viaje.
const TRANSFER_FIELDS = ['driver_id', 'nurse_id', 'ambulance_id', 'client_id', 'holder_name', 'patient_name', 'subscriber_number',
  'address', 'affiliate_number', 'locality', 'age', 'document_number', 'ambulance_type', 'origin', 'destination',
  'departure_base_time', 'amount_to_bill', 'presumed_diagnosis'] as const;

const shiftInstant = (value: string | undefined, days: number) =>
  value && Number.isFinite(Date.parse(value)) ? new Date(Date.parse(value) + days * 86_400_000).toISOString() : undefined;

/** Nuevo traslado para el mismo paciente y recorrido, con el plan horario corrido a la nueva fecha. */
export function duplicateTransfer(transfer: Transfer, days = DUPLICATE_DAYS): Partial<Transfer> {
  const copy: Partial<Transfer> = { date: shiftAgendaDate(transfer.date, days), status: 'Pending' };
  for (const key of TRANSFER_FIELDS) if (transfer[key] !== undefined && transfer[key] !== null) (copy as any)[key] = transfer[key];
  const start = shiftInstant(transfer.planned_start_at, days);
  const end = shiftInstant(transfer.planned_end_at, days);
  if (start) copy.planned_start_at = start;
  if (end) copy.planned_end_at = end;
  return copy;
}
