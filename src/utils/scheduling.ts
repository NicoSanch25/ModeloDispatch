import type { Match } from '../types';
import { localDate } from './statistics';

export interface ConflictDetail {
  match: Match;
  resources: string[];
}

export function coverageWindow(match: Pick<Match, 'date' | 'time' | 'durationMinutes' | 'extensionMinutes'>, bufferMinutes = 0) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(match.date || '') || !/^\d{2}:\d{2}(:\d{2})?$/.test(match.time || '')) return null;
  const start = Date.parse(`${match.date}T${match.time.slice(0, 5)}:00-03:00`);
  if (!Number.isFinite(start)) return null;
  const duration = Number(match.durationMinutes) > 0 ? Number(match.durationMinutes) : 90;
  const extension = Math.max(0, Number(match.extensionMinutes) || 0);
  return { start, end: start + (duration + extension + bufferMinutes) * 60_000 };
}

export function coverageIsOpen(match: Pick<Match, 'status'>) {
  return match.status !== 'Suspended' && match.status !== 'Completed';
}

export function getConflicts(current: Match, matches: Match[]): { hard: ConflictDetail[]; shared: ConflictDetail[] } {
  const hard: ConflictDetail[] = [];
  const window = coverageWindow(current, 15);
  if (!window || !coverageIsOpen(current)) return { hard, shared: [] };
  for (const other of matches) {
    if (other.id === current.id || !coverageIsOpen(other)) continue;
    const otherWindow = coverageWindow(other, 15);
    if (!otherWindow || window.start >= otherWindow.end || window.end <= otherWindow.start) continue;
    const otherCrew = new Set([other.driverId, other.nurseId, other.thirdCrewId].filter(Boolean));
    const resources: string[] = [];
    if (current.driverId && otherCrew.has(current.driverId)) resources.push('Chofer');
    if (current.nurseId && otherCrew.has(current.nurseId)) resources.push('Enfermero/a');
    if (current.thirdCrewId && otherCrew.has(current.thirdCrewId)) resources.push('Auxiliar');
    if (current.ambulanceId && current.ambulanceId === other.ambulanceId) resources.push('Móvil');
    // A shared venue cannot authorize simultaneous use of a person or vehicle.
    if (resources.length) hard.push({ match: other, resources });
  }
  return { hard, shared: [] };
}

export function checkSystemConflicts(matches: Match[], now = new Date()) {
  const today = localDate(now);
  return matches.filter(match => {
    const window = coverageWindow(match, 15);
    return coverageIsOpen(match) && window &&
      (match.date >= today || window.end > now.getTime()) && getConflicts(match, matches).hard.length > 0;
  }).length;
}

export function activeCoverage(ambulanceId: string, matches: Match[], now = new Date()) {
  return matches.find(match => {
    if (match.ambulanceId !== ambulanceId || !coverageIsOpen(match)) return false;
    const window = coverageWindow(match);
    return window && now.getTime() >= window.start && now.getTime() < window.end;
  });
}
