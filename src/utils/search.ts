import type { Ambulance, Client, Location, Match, Staff, Transfer } from '../types';

export type SearchKind = 'coverage' | 'transfer' | 'staff' | 'ambulance' | 'location' | 'client';
export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  detail: string;
  /** Fecha del servicio (AAAA-MM-DD), para ordenar por cercanía. */
  date?: string;
  score: number;
}
export interface SearchData {
  matches: Match[]; transfers: Transfer[]; staff: Staff[]; ambulances: Ambulance[]; locations: Location[]; clients: Client[];
}

export const normalizeText = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const day = (date: string) => date.split('-').reverse().slice(0, 2).join('/');

/** Puntaje: 3 si un texto empieza con la búsqueda, 2 si una palabra empieza con ella, 1 si la contiene. 0 si falta alguna palabra. */
export function scoreText(haystack: string, query: string) {
  const text = normalizeText(haystack);
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return 0;
  let score = 0;
  for (const term of terms) {
    if (text.startsWith(term)) score += 3;
    else if (new RegExp(`(^|[\\s·/,(-])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text)) score += 2;
    else if (text.includes(term)) score += 1;
    else return 0;
  }
  return score;
}

/** Búsqueda en todo lo cargado. Ordena por relevancia y, entre servicios, por cercanía a hoy. */
export function searchAll(data: SearchData, query: string, today: string, limit = 20): SearchResult[] {
  if (normalizeText(query).length < 2) return [];
  const name = (id?: string) => data.staff.find(s => s.id === id)?.name || '';
  const mobile = (id?: string) => { const a = data.ambulances.find(x => x.id === id); return a ? `Móvil ${a.number}` : ''; };
  const results: SearchResult[] = [];
  const push = (r: Omit<SearchResult, 'score'>, text: string) => { const score = scoreText(text, query); if (score) results.push({ ...r, score }); };

  data.matches.forEach(m => push({ kind: 'coverage', id: m.id, date: m.date, title: m.location || 'Cobertura', detail: `${day(m.date)} ${m.time || ''} · ${[m.type, mobile(m.ambulanceId), name(m.driverId)].filter(Boolean).join(' · ')}` },
    [m.location, m.type, m.fieldNumber, m.hiredBy, data.clients.find(c => c.id === m.clientId)?.name, mobile(m.ambulanceId), name(m.driverId), name(m.nurseId), name(m.thirdCrewId)].filter(Boolean).join(' · ')));
  data.transfers.forEach(t => push({ kind: 'transfer', id: t.id, date: t.date, title: `${t.origin || 'Origen'} → ${t.destination || 'Destino'}`, detail: `${day(t.date)} · ${[t.transfer_number && `N.º ${t.transfer_number}`, t.patient_name, name(t.driver_id)].filter(Boolean).join(' · ')}` },
    [t.transfer_number, t.patient_name, t.origin, t.destination, name(t.driver_id), mobile(t.ambulance_id)].filter(Boolean).join(' · ')));
  data.staff.forEach(s => push({ kind: 'staff', id: s.id, title: s.name, detail: [s.role, s.phone].filter(Boolean).join(' · ') }, [s.name, s.role, s.phone, s.companyName].filter(Boolean).join(' · ')));
  data.ambulances.forEach(a => push({ kind: 'ambulance', id: a.id, title: `Móvil ${a.number}`, detail: [a.plate, a.vehicleType].filter(Boolean).join(' · ') }, [`Movil ${a.number}`, a.number, a.plate, a.vehicleType].filter(Boolean).join(' · ')));
  data.locations.forEach(l => push({ kind: 'location', id: l.id, title: l.name, detail: l.address || '' }, [l.name, l.address, l.contactName].filter(Boolean).join(' · ')));
  data.clients.forEach(c => push({ kind: 'client', id: c.id, title: c.name, detail: c.contactName || '' }, [c.name, c.contactName, c.email].filter(Boolean).join(' · ')));

  const distance = (r: SearchResult) => {
    if (!r.date) return 0;
    const diff = (Date.parse(r.date) - Date.parse(today)) / 86_400_000;
    return diff >= 0 ? diff : 365 - diff; // los próximos antes que los pasados
  };
  return results.sort((a, b) => b.score - a.score || distance(a) - distance(b) || a.title.localeCompare(b.title)).slice(0, limit);
}
