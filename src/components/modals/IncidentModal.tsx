import React, { useState } from 'react';
import { Check, ClipboardList, X } from 'lucide-react';
import type { IncidentReport, Match } from '../../types';
import { formatDateAR, formatTime24 } from '../../utils/formatters';
import { ModalShell } from '../ui/ModalShell';

interface IncidentModalProps {
  match: Match;
  onClose: () => void;
  onSave: (report: IncidentReport) => Promise<void>;
}

/** Cierre de una cobertura con su reporte. El formulario vive acá para no perder el foco al escribir. */
export const IncidentModal: React.FC<IncidentModalProps> = ({ match, onClose, onSave }) => {
  const [form, setForm] = useState<IncidentReport>(match.incidentReport || { hasIncident: false, wasTransferred: false, details: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave({ ...form, wasTransferred: form.hasIncident && form.wasTransferred });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} busy={saving} labelledBy="incident-title">
      <div className="dispatch-modal-panel w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between rounded-t-2xl border-b bg-slate-50 p-4">
          <h3 id="incident-title" className="flex items-center gap-2 font-bold text-slate-800">
            <ClipboardList className="h-5 w-5 text-indigo-600" /> Cerrar cobertura
          </h3>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 p-4 sm:p-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-700"><strong>{match.location}</strong> · {formatDateAR(match.date)} {formatTime24(match.time)} hs</p>
            <p className="mt-1 text-xs text-slate-500">{match.type}</p>
          </div>
          <div className="space-y-1">
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input type="checkbox" checked={form.hasIncident} onChange={e => setForm(prev => ({ ...prev, hasIncident: e.target.checked }))} className="h-5 w-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
              <span className="text-sm font-medium text-slate-700">Hubo incidente o emergencia</span>
            </label>
            {form.hasIncident && (
              <label className="ml-8 flex min-h-11 cursor-pointer items-center gap-3">
                <input type="checkbox" checked={form.wasTransferred} onChange={e => setForm(prev => ({ ...prev, wasTransferred: e.target.checked }))} className="h-5 w-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
                <span className="text-sm font-medium text-slate-700">Se trasladó al paciente</span>
              </label>
            )}
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Observaciones</span>
            <textarea value={form.details} onChange={e => setForm(prev => ({ ...prev, details: e.target.value }))} className="h-24 w-full rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Qué pasó, a quién se atendió, novedades del servicio…" />
          </label>
        </div>
        <div className="flex justify-end gap-2 rounded-b-2xl border-t bg-slate-50 p-4">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 rounded-lg px-4 text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button type="button" onClick={submit} disabled={saving} className="flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            <Check className="h-4 w-4" /> {saving ? 'Guardando…' : 'Finalizar cobertura'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};
