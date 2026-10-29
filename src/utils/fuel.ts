import type { FuelRecord } from '../types';

/** Más reciente primero. La base devuelve los registros ordenados por id, no por fecha. */
export const sortFuelRecords = (records: FuelRecord[]) =>
  [...records].sort((a, b) => (b.date || '').localeCompare(a.date || '') || String(b.id).localeCompare(String(a.id)));

/** Suma un número de meses a un mes AAAA-MM. */
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/**
 * Importe escrito como en un ticket argentino: "45000", "45.000", "45.000,50" o "$ 45000,5".
 * Devuelve null si está vacío y NaN si no es un importe válido.
 */
export function parseAmount(value: string): number | null {
  let clean = value.replace(/[$\s]/g, '');
  if (clean === '') return null;
  if (clean.includes(',')) clean = clean.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) clean = clean.replace(/\./g, '');
  const amount = /^\d+(\.\d+)?$/.test(clean) ? Number(clean) : NaN;
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : NaN;
}

/** Kilometraje entero ("125300" o "125.300"). Devuelve null si está vacío y NaN si no es válido. */
export function parseKm(value: string): number | null {
  const clean = value.replace(/[.\s]/g, '');
  if (clean === '') return null;
  return /^\d+$/.test(clean) ? Number(clean) : NaN;
}

/** "$ 45.000" o, con centavos, "$ 45.000,50". */
export const formatPesos = (value: number) =>
  value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 });

export const formatKm = (value: number) => `${value.toLocaleString('es-AR')} km`;

/**
 * Último kilometraje registrado de un móvil hasta una fecha (inclusive), sin contar el
 * movimiento que se está corrigiendo. Sirve para detectar un kilometraje mal tipeado.
 */
export function lastOdometer(records: FuelRecord[], ambulanceId: string, date: string, excludeId?: string) {
  const previous = sortFuelRecords(records).find(r =>
    r.ambulanceId === ambulanceId && r.id !== excludeId && r.odometerKm !== undefined && (r.date || '') <= date);
  return previous ? { km: previous.odometerKm as number, date: previous.date } : null;
}

export function summarizeFuelMonth(records: FuelRecord[], month: string, ambulanceId = '') {
  const rows = sortFuelRecords(records.filter(r => r.date?.startsWith(month) && (!ambulanceId || r.ambulanceId === ambulanceId)));
  const byAmbulance = new Map<string, { liters: number; amount: number }>();
  for (const r of rows) {
    const liters = r.liters > 0 ? r.liters : 0;
    const amount = r.amount || 0;
    if (!liters && !amount) continue;
    const current = byAmbulance.get(r.ambulanceId) || { liters: 0, amount: 0 };
    byAmbulance.set(r.ambulanceId, { liters: current.liters + liters, amount: current.amount + amount });
  }
  return {
    rows,
    liters: rows.reduce((total, r) => total + (Number(r.liters) || 0), 0),
    amount: rows.reduce((total, r) => total + (r.amount || 0), 0),
    /** Movimientos del mes sin importe cargado (anteriores a los tickets). */
    withoutAmount: rows.filter(r => r.amount === undefined).length,
    loads: rows.filter(r => r.liters > 0).length,
    purchases: rows.filter(r => r.items?.trim()).length,
    byAmbulance: [...byAmbulance.entries()]
      .map(([id, totals]) => ({ ambulanceId: id, ...totals }))
      .sort((a, b) => b.liters - a.liters || b.amount - a.amount),
  };
}
