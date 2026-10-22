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

export function summarizeFuelMonth(records: FuelRecord[], month: string, ambulanceId = '') {
  const rows = sortFuelRecords(records.filter(r => r.date?.startsWith(month) && (!ambulanceId || r.ambulanceId === ambulanceId)));
  const byAmbulance = new Map<string, number>();
  for (const r of rows) if (r.liters > 0) byAmbulance.set(r.ambulanceId, (byAmbulance.get(r.ambulanceId) || 0) + r.liters);
  return {
    rows,
    liters: rows.reduce((total, r) => total + (Number(r.liters) || 0), 0),
    loads: rows.filter(r => r.liters > 0).length,
    purchases: rows.filter(r => r.items?.trim()).length,
    byAmbulance: [...byAmbulance.entries()].map(([id, liters]) => ({ ambulanceId: id, liters })).sort((a, b) => b.liters - a.liters),
  };
}
