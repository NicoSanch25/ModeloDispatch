import type { Ambulance, FuelRecord } from '../types';
import { lastOdometer, parseKm } from './fuel';
import { licenseStatus, type LicenseState } from './licenses';

// Kilómetros de anticipación para avisar que se acerca el service.
export const SERVICE_WARNING_KM = 1000;

/** Colores de los vencimientos de flota (VTV, seguro, service). */
export const EXPIRY_CHIP: Record<LicenseState, string> = {
  expired: 'bg-rose-50 text-rose-700',
  soon: 'bg-amber-50 text-amber-800',
  ok: 'bg-emerald-50 text-emerald-700',
  missing: 'bg-slate-100 text-slate-500',
};

/** Kilometraje más alto conocido: el cargado en el móvil o el último ticket de combustible. */
export function currentKm(ambulance: Ambulance, fuelRecords: FuelRecord[], today: string): number | null {
  const loaded = parseKm(String(ambulance.maintenance?.mileage ?? ''));
  const ticket = lastOdometer(fuelRecords, ambulance.id, today)?.km ?? null;
  const values = [loaded, ticket].filter((km): km is number => typeof km === 'number' && Number.isFinite(km));
  return values.length ? Math.max(...values) : null;
}

export interface ServiceStatus { state: LicenseState; kmLeft?: number; days?: number; }

const RANK: Record<LicenseState, number> = { expired: 3, soon: 2, ok: 1, missing: 0 };

/** Próximo service por kilometraje, por fecha o ambos: manda lo que venza primero. */
export function serviceStatus(ambulance: Ambulance, km: number | null, today: string): ServiceStatus {
  const nextKm = ambulance.maintenance?.nextServiceKm;
  const byKm: ServiceStatus = nextKm === undefined || nextKm === null ? { state: 'missing' }
    : km === null ? { state: 'ok' }
    : { state: nextKm - km < 0 ? 'expired' : nextKm - km <= SERVICE_WARNING_KM ? 'soon' : 'ok', kmLeft: nextKm - km };
  const date = licenseStatus(ambulance.maintenance?.nextServiceDate, today);
  const byDate: ServiceStatus = { state: date.state, days: date.days };
  if (RANK[byDate.state] > RANK[byKm.state]) return byDate;
  if (RANK[byKm.state] > RANK[byDate.state]) return byKm;
  return { state: byKm.state, kmLeft: byKm.kmLeft, days: byDate.days };
}

const km = (value: number) => `${value.toLocaleString('es-AR')} km`;
const dayCount = (days: number) => days === 1 ? '1 día' : `${days} días`;

/** Texto corto del service para tarjetas y avisos. */
export function serviceLabel(ambulance: Ambulance, status: ServiceStatus): string {
  const { nextServiceKm, nextServiceDate } = ambulance.maintenance || {};
  if (status.state === 'missing') return 'Service sin programar';
  if (status.state === 'expired') {
    if (status.kmLeft !== undefined && status.kmLeft < 0) return `Service vencido hace ${km(-status.kmLeft)}`;
    return `Service vencido hace ${dayCount(-(status.days ?? 0))}`;
  }
  if (status.state === 'soon') {
    if (status.kmLeft !== undefined && status.kmLeft <= SERVICE_WARNING_KM) return status.kmLeft === 0 ? 'Service ahora' : `Service en ${km(status.kmLeft)}`;
    return status.days === 0 ? 'Service vence hoy' : `Service en ${dayCount(status.days ?? 0)}`;
  }
  if (nextServiceKm !== undefined && nextServiceKm !== null) return `Service a los ${km(nextServiceKm)}`;
  return `Service hasta el ${nextServiceDate!.split('-').reverse().join('/')}`;
}
