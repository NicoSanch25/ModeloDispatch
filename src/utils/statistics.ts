import type { Match, Transfer, FuelRecord } from '../types';

export function localDate(date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).format(date);
}

export function periodStart(today: string, days: number): string {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date.toISOString().slice(0, 10);
}

export function summarizeOperations(matches: Match[], transfers: Transfer[], fuel: FuelRecord[], today: string, days: number) {
  const start = periodStart(today, days);
  const inPeriod = (item: { date: string }) => item.date >= start && item.date <= today;
  const coverage = matches.filter(inPeriod);
  const trips = transfers.filter(inPeriod);
  const eligible = coverage.filter(m => m.status !== 'Suspended');
  const completed = eligible.filter(m => m.status === 'Completed').length;
  return {
    start, coverage: coverage.length, transfers: trips.length, completed,
    completionRate: eligible.length ? Math.round(completed / eligible.length * 100) : null,
    liters: fuel.filter(inPeriod).reduce((total, item) => total + (Number(item.liters) || 0), 0),
    completedTransfers: trips.filter(t => t.status === 'Completed').length,
    suspended: coverage.filter(m => m.status === 'Suspended').length,
    series: Array.from({ length: days }, (_, index) => {
      const date = periodStart(today, days - index);
      return { date, coverage: coverage.filter(m => m.date === date).length, transfers: trips.filter(t => t.date === date).length };
    }),
  };
}
