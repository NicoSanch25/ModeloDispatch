import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock4, Copy, Send, X } from 'lucide-react';
import type { Ambulance, Match, Staff } from '../../types';
import { formatTime24, subtractTime } from '../../utils/formatters';
import { DateInput } from '../DateInput';
import { ModalShell } from '../ui/ModalShell';
import { notify } from '../ui/feedback';

interface StaffScheduleModalProps {
  date: string;
  setDate: (date: string) => void;
  matches: Match[];
  staff: Staff[];
  ambulances: Ambulance[];
  onClose: () => void;
  onBack: () => void;
  onNotified: (staffId: string, matches: Match[]) => void;
}

const involves = (match: Match, id: string) => match.driverId === id || match.nurseId === id || match.thirdCrewId === id;

/** Cronograma del día por persona, listo para enviar por WhatsApp o copiar. */
export const StaffScheduleModal: React.FC<StaffScheduleModalProps> = ({ date, setDate, matches, staff, ambulances, onClose, onBack, onNotified }) => {
  const dayMatches = useMemo(() => matches
    .filter(m => m.date === date && m.status !== 'Suspended' && m.status !== 'Completed')
    .sort((a, b) => a.time.localeCompare(b.time)), [matches, date]);
  const people = useMemo(() => [...new Set(dayMatches.flatMap(m => [m.driverId, m.nurseId, m.thirdCrewId]).filter((id): id is string => !!id))]
    .map(id => staff.find(s => s.id === id)).filter((s): s is Staff => !!s), [dayMatches, staff]);
  const [citation, setCitation] = useState<Record<string, string>>({});
  const [useCitation, setUseCitation] = useState<Record<string, boolean>>({});

  // Citación sugerida: una hora antes del primer servicio del día.
  useEffect(() => {
    const times: Record<string, string> = {};
    people.forEach(person => {
      const first = dayMatches.find(m => involves(m, person.id));
      if (first) times[person.id] = subtractTime(first.time, 60);
    });
    setCitation(times);
    setUseCitation({});
  }, [date]);

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const name = (id?: string) => staff.find(s => s.id === id)?.name;

  const message = (person: Staff) => {
    let text = `👋 Hola *${person.name}*, tu cronograma para ${dateLabel}:\n\n`;
    if (useCitation[person.id] && citation[person.id]) text += `🕒 *Citación en base:* ${formatTime24(citation[person.id])} hs\n--------------------------------\n`;
    dayMatches.filter(m => involves(m, person.id)).forEach(m => {
      const ambulance = ambulances.find(a => a.id === m.ambulanceId);
      const partners = [
        m.driverId !== person.id && name(m.driverId) && `${name(m.driverId)} (chofer)`,
        m.nurseId !== person.id && name(m.nurseId) && `${name(m.nurseId)} (enfermería)`,
        m.thirdCrewId !== person.id && name(m.thirdCrewId) && `${name(m.thirdCrewId)} (auxiliar)`,
      ].filter(Boolean);
      text += `🚑 *${formatTime24(m.time)} hs* | ${m.location}\n`;
      text += `   📝 ${m.type}${m.fieldNumber ? ` (${m.fieldNumber})` : ''}\n`;
      text += `   🚐 Móvil: ${ambulance ? ambulance.number : 'a designar'}\n`;
      text += m.isSingleCrew && partners.length === 0 ? '   👤 Tripulación simple\n\n' : `   🤝 Con: ${partners.join(', ') || 'a confirmar'}\n\n`;
    });
    return text;
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify.success('Mensaje copiado.');
    } catch {
      notify.error('No se pudo copiar. Seleccioná el texto y copialo a mano.');
    }
  };

  return (
    <ModalShell onClose={onClose} labelledBy="schedule-title">
      <div className="dispatch-modal-panel flex max-h-[94dvh] w-full max-w-4xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between rounded-t-2xl border-b bg-slate-50 p-4">
          <h3 id="schedule-title" className="flex items-center gap-2 text-lg font-bold text-slate-800"><Calendar className="h-5 w-5 text-indigo-600" /> Coberturas por personal</h3>
          <button type="button" aria-label="Cerrar cronograma" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="border-b p-4">
          <DateInput aria-label="Fecha del cronograma" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border p-2 md:w-64" />
        </div>
        <div className="flex-1 overflow-y-auto bg-slate-100 p-3 sm:p-4">
          {people.length === 0 ? (
            <p className="py-12 text-center text-slate-500">No hay personal asignado para esta fecha.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {people.map(person => {
                const text = message(person);
                const phone = person.phone.replace(/[^0-9]/g, '');
                return (
                  <div key={person.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="truncate font-bold text-slate-800">{person.name}</h4>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{person.role}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <label className="flex min-h-9 cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-600">
                          <input type="checkbox" checked={!!useCitation[person.id]} onChange={e => setUseCitation(prev => ({ ...prev, [person.id]: e.target.checked }))} className="h-4 w-4 rounded text-indigo-600" />
                          <Clock4 className="h-3.5 w-3.5" /> Citar en base
                        </label>
                        {useCitation[person.id] && (
                          <input type="time" aria-label={`Hora de citación de ${person.name}`} value={citation[person.id] || ''} onChange={e => setCitation(prev => ({ ...prev, [person.id]: e.target.value }))} className="w-28 rounded border border-indigo-100 bg-indigo-50 p-1 text-center text-sm font-medium" />
                        )}
                      </div>
                    </div>
                    <pre className="mb-3 h-32 flex-1 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-2 font-sans text-xs text-slate-700">{text}</pre>
                    <div className="flex gap-2">
                      {phone ? (
                        <a href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`} onClick={() => onNotified(person.id, dayMatches.filter(m => involves(m, person.id)))} target="_blank" rel="noopener noreferrer" className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700">
                          <Send className="h-4 w-4" /> Enviar WhatsApp
                        </a>
                      ) : (
                        <span className="flex h-11 flex-1 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">Sin teléfono cargado</span>
                      )}
                      <button type="button" onClick={() => copy(text)} aria-label={`Copiar mensaje para ${person.name}`} className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"><Copy className="h-4 w-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex justify-end rounded-b-2xl border-t bg-slate-50 p-3">
          <button type="button" onClick={onBack} className="h-11 rounded-lg bg-slate-800 px-5 text-white hover:bg-slate-700">Volver a la agenda</button>
        </div>
      </div>
    </ModalShell>
  );
};
