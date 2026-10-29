import React, { useMemo, useState } from 'react';
import { Ambulance as AmbulanceIcon, Building, ClipboardCheck, MapPin, Search, Truck, User, X } from 'lucide-react';
import { searchAll, type SearchData, type SearchKind, type SearchResult } from '../utils/search';
import { localDate } from '../utils/statistics';
import { ModalShell } from './ui/ModalShell';

const KIND: Record<SearchKind, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  coverage: { label: 'Cobertura', icon: ClipboardCheck },
  transfer: { label: 'Traslado', icon: Truck },
  staff: { label: 'Personal', icon: User },
  ambulance: { label: 'Móvil', icon: AmbulanceIcon },
  location: { label: 'Lugar', icon: MapPin },
  client: { label: 'Cliente', icon: Building },
};

interface GlobalSearchProps {
  data: SearchData;
  onClose: () => void;
  onSelect: (result: SearchResult) => void;
}

/** Buscador general: servicios, personal, móviles, lugares y clientes desde un solo lugar. */
export const GlobalSearch: React.FC<GlobalSearchProps> = ({ data, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const results = useMemo(() => searchAll(data, query, localDate()), [data, query]);

  const choose = (result?: SearchResult) => { if (result) { onSelect(result); onClose(); } };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); choose(results[active]); }
  };

  return (
    <ModalShell onClose={onClose} closeOnBackdrop label="Buscar">
      <div className="dispatch-modal-panel flex max-h-[85dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:mt-[10vh] sm:self-start sm:rounded-2xl">
        <div className="flex items-center gap-2 border-b border-slate-200 px-3">
          <Search className="h-5 w-5 shrink-0 text-slate-500" />
          <input autoFocus value={query} onChange={e => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKeyDown}
            placeholder="Buscar servicio, paciente, persona, móvil o lugar" aria-label="Buscar en todo el sistema" role="combobox" aria-expanded={results.length > 0} aria-controls="search-results"
            className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none" />
          <button type="button" onClick={onClose} aria-label="Cerrar búsqueda" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <ul id="search-results" role="listbox" className="overflow-y-auto p-2">
          {query.trim().length < 2 && <li className="p-4 text-center text-sm text-slate-500">Escribí al menos dos letras.</li>}
          {query.trim().length >= 2 && results.length === 0 && <li className="p-4 text-center text-sm text-slate-500">Sin resultados para «{query}».</li>}
          {results.map((result, index) => {
            const { label, icon: Icon } = KIND[result.kind];
            return (
              <li key={`${result.kind}:${result.id}`} role="option" aria-selected={index === active}>
                <button type="button" onClick={() => choose(result)} onMouseEnter={() => setActive(index)} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${index === active ? 'bg-indigo-50' : ''}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-900">{result.title}</span>
                    <span className="block truncate text-xs text-slate-500">{[label, result.detail].filter(Boolean).join(" · ")}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </ModalShell>
  );
};
