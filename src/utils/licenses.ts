import type { Staff } from '../types';

// Días de anticipación para avisar que una licencia está por vencer.
export const LICENSE_WARNING_DAYS = 30;

export type LicenseState = 'missing' | 'expired' | 'soon' | 'ok';
export interface LicenseStatus { state: LicenseState; days?: number; }

const dayNumber = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** Estado de la licencia en una fecha (YYYY-MM-DD). La licencia es válida hasta el día de vencimiento inclusive. */
export function licenseStatus(expiration: string | undefined | null, onDate: string, warningDays = LICENSE_WARNING_DAYS): LicenseStatus {
  if (!expiration || !/^\d{4}-\d{2}-\d{2}/.test(expiration)) return { state: 'missing' };
  const days = dayNumber(expiration.slice(0, 10)) - dayNumber(onDate);
  if (days < 0) return { state: 'expired', days };
  return { state: days <= warningDays ? 'soon' : 'ok', days };
}

export const needsLicense = (person: Pick<Staff, 'role'>) => person.role === 'Chofer';

/** Texto de un vencimiento (licencia, VTV, seguro...). `masculine` para sustantivos como «Seguro». */
export function expiryLabel(status: LicenseStatus, noun: string, masculine = false): string {
  if (status.state === 'missing') return `${noun} sin vencimiento cargado`;
  const days = status.days ?? 0;
  const expired = masculine ? 'vencido' : 'vencida';
  if (status.state === 'expired') return days === -1 ? `${noun} ${expired} ayer` : `${noun} ${expired} hace ${-days} días`;
  if (days === 0) return `${noun} vence hoy`;
  if (status.state === 'soon') return days === 1 ? `${noun} vence mañana` : `${noun} vence en ${days} días`;
  return `${noun} al día`;
}

export function licenseLabel(status: LicenseStatus): string {
  return status.state === 'missing' ? 'Sin vencimiento cargado' : expiryLabel(status, 'Licencia');
}

/** Texto para las opciones de chofer al asignar un servicio en una fecha. */
export function driverOptionLabel(person: Staff, onDate: string) {
  const status = licenseStatus(person.licenseExpiration, onDate);
  const external = person.isOutsourced ? ' (Ext)' : '';
  return status.state === 'expired' ? `${person.name}${external} · ⚠ licencia vencida` : `${person.name}${external}`;
}

/** Choferes ordenados por urgencia: vencidas, por vencer y sin fecha. */
export function licenseAlerts(staff: Staff[], today: string) {
  const drivers = staff.filter(needsLicense).map(person => ({ person, status: licenseStatus(person.licenseExpiration, today) }));
  const byDays = (a: { status: LicenseStatus }, b: { status: LicenseStatus }) => (a.status.days ?? 0) - (b.status.days ?? 0);
  return {
    expired: drivers.filter(d => d.status.state === 'expired').sort(byDays),
    soon: drivers.filter(d => d.status.state === 'soon').sort(byDays),
    missing: drivers.filter(d => d.status.state === 'missing'),
  };
}
