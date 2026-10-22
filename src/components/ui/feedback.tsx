import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { ModalShell } from './ModalShell';

type Tone = 'success' | 'error' | 'info';
interface Toast { id: number; tone: Tone; message: string }
interface ConfirmRequest { title: string; message?: string; confirmLabel?: string; danger?: boolean; resolve: (ok: boolean) => void }

// Estado a nivel de módulo: cualquier formulario o servicio puede avisar sin pasar callbacks.
let toasts: Toast[] = [];
let confirmQueue: ConfirmRequest[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

const dismiss = (id: number) => { toasts = toasts.filter(t => t.id !== id); emit(); };

/** Aviso breve que no bloquea la pantalla (reemplaza a alert). Los errores duran más. */
export const notify = (message: string, tone: Tone = 'success') => {
  const id = nextId++;
  toasts = [...toasts.slice(-3), { id, tone, message }];
  emit();
  setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 3500);
};
notify.success = (message: string) => notify(message, 'success');
notify.error = (message: string) => notify(message, 'error');
notify.info = (message: string) => notify(message, 'info');

/** Confirmación propia de la app (reemplaza a window.confirm). */
export const askConfirm = (request: Omit<ConfirmRequest, 'resolve'>) => new Promise<boolean>(resolve => {
  confirmQueue = [...confirmQueue, { ...request, resolve }];
  emit();
});

const toneStyles: Record<Tone, { box: string; icon: React.ReactNode }> = {
  success: { box: 'border-emerald-200 bg-white text-slate-800', icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> },
  error: { box: 'border-rose-200 bg-rose-50 text-rose-900', icon: <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" /> },
  info: { box: 'border-indigo-200 bg-white text-slate-800', icon: <Info className="h-5 w-5 shrink-0 text-indigo-600" /> },
};

const ConfirmDialog: React.FC<{ request: ConfirmRequest; onDone: (ok: boolean) => void }> = ({ request, onDone }) => {
  const accept = useRef<HTMLButtonElement>(null);
  useEffect(() => { accept.current?.focus(); }, []);
  return (
    <ModalShell onClose={() => onDone(false)} closeOnBackdrop labelledBy="confirm-title" zIndex="z-[80]">
      <section className="dispatch-modal-panel w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <h2 id="confirm-title" className="text-base font-bold text-slate-900">{request.title}</h2>
        {request.message && <p className="mt-2 text-sm text-slate-600">{request.message}</p>}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => onDone(false)} className="dispatch-secondary-action">Cancelar</button>
          <button ref={accept} type="button" onClick={() => onDone(true)} className={request.danger ? 'inline-flex min-h-10 items-center justify-center rounded-xl bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 active:scale-[0.98]' : 'dispatch-primary-action'}>
            {request.confirmLabel || 'Confirmar'}
          </button>
        </div>
      </section>
    </ModalShell>
  );
};

/** Se monta una vez en la raíz de la app. */
export const FeedbackHost: React.FC = () => {
  const [, render] = useState(0);
  useEffect(() => {
    const listener = () => render(n => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);
  const current = confirmQueue[0];
  const finish = (ok: boolean) => {
    current?.resolve(ok);
    confirmQueue = confirmQueue.slice(1);
    emit();
  };
  return (
    <>
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex flex-col items-center gap-2 p-3 sm:items-end sm:p-4">
        {toasts.map(toast => (
          <div key={toast.id} role={toast.tone === 'error' ? 'alert' : 'status'} className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3 text-sm shadow-lg animate-toast-in ${toneStyles[toast.tone].box}`}>
            {toneStyles[toast.tone].icon}
            <p className="flex-1 leading-5">{toast.message}</p>
            <button type="button" aria-label="Cerrar aviso" onClick={() => dismiss(toast.id)} className="-m-1 rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      {current && <ConfirmDialog key={confirmQueue.length + current.title} request={current} onDone={finish} />}
    </>
  );
};

const messages = (field: HTMLInputElement) => {
  const v = field.validity;
  if (v.valueMissing) return field.type === 'checkbox' ? 'Marcá esta opción para continuar.' : field.tagName === 'SELECT' ? 'Elegí una opción.' : 'Completá este campo.';
  if (v.typeMismatch) return field.type === 'email' ? 'Ingresá un correo válido.' : 'Revisá el formato.';
  if (v.rangeUnderflow) return `El valor mínimo es ${field.min}.`;
  if (v.rangeOverflow) return `El valor máximo es ${field.max}.`;
  if (v.tooShort) return `Usá al menos ${field.minLength} caracteres.`;
  if (v.stepMismatch || v.badInput) return 'Ingresá un valor válido.';
  if (v.patternMismatch) return 'Revisá el formato.';
  return '';
};

/** Mensajes de validación del navegador en español, para toda la app. */
export const useSpanishValidation = () => {
  useEffect(() => {
    const onInvalid = (event: Event) => {
      const field = event.target as HTMLInputElement;
      if (!field.setCustomValidity) return;
      field.setCustomValidity('');
      const message = messages(field);
      if (message) field.setCustomValidity(message);
    };
    const onEdit = (event: Event) => {
      const field = event.target as HTMLInputElement;
      if (field?.setCustomValidity && field.validity?.customError) field.setCustomValidity('');
    };
    document.addEventListener('invalid', onInvalid, true);
    document.addEventListener('input', onEdit, true);
    document.addEventListener('change', onEdit, true);
    return () => {
      document.removeEventListener('invalid', onInvalid, true);
      document.removeEventListener('input', onEdit, true);
      document.removeEventListener('change', onEdit, true);
    };
  }, []);
};
