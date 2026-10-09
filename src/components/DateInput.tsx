import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';

export const DateInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ value, defaultValue, onChange, className, ...props }) => {
  const [draft, setDraft] = useState(String(defaultValue ?? ''));
  const date = String(value ?? draft);
  return (
    <span className="relative block min-w-0 rounded-lg focus-within:ring-2 focus-within:ring-indigo-300">
      <span aria-hidden="true" className={`${className || 'w-full rounded-lg border border-slate-200 bg-white p-2'} flex min-h-10 items-center justify-between gap-2`}>
        <span>{date ? date.split('-').reverse().join('/') : 'Elegir fecha'}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
      </span>
      <input {...props} type="date" value={date} onChange={event => { setDraft(event.target.value); onChange?.(event); }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
    </span>
  );
};
