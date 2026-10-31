import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { SHORTCUTS } from '../utils/shortcuts';
import { ModalShell } from './ui/ModalShell';

/** Lista de atajos de teclado (tecla «?»). */
export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return <ModalShell onClose={onClose} closeOnBackdrop labelledBy="shortcuts-title">
    <section className="dispatch-modal-panel w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
      <header className="flex items-center justify-between gap-2 border-b p-4">
        <h3 id="shortcuts-title" className="flex items-center gap-2 font-bold text-slate-800"><Keyboard className="h-5 w-5 text-indigo-600" />Atajos de teclado</h3>
        <button onClick={onClose} aria-label="Cerrar atajos" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </header>
      <dl className="divide-y divide-slate-100 p-2">
        {SHORTCUTS.map(({ keys, label }) => <div key={label} className="flex items-center justify-between gap-3 px-2 py-2 text-sm">
          <dt className="text-slate-700">{label}</dt>
          <dd className="flex gap-1">{keys.map(key => <kbd key={key} className="min-w-7 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-center font-mono text-xs text-slate-700">{key}</kbd>)}</dd>
        </div>)}
      </dl>
      <p className="border-t px-4 py-3 text-xs text-slate-500">Funcionan cuando no hay una ventana abierta ni estás escribiendo en un campo.</p>
    </section>
  </ModalShell>;
}
