import React from 'react';

const Block: React.FC<{ className?: string }> = ({ className = '' }) => <div className={`rounded-xl bg-slate-200/70 ${className}`} />;

/** Esqueleto de la primera carga: muestra la forma de la pantalla en vez de una pantalla vacía. */
export const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4 motion-reduce:animate-none" role="status" aria-live="polite">
    <span className="sr-only">Cargando datos…</span>
    <div className="flex items-end justify-between gap-2">
      <div className="space-y-2"><Block className="h-5 w-36" /><Block className="h-3 w-48" /></div>
      <Block className="h-10 w-28" />
    </div>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map(i => <Block key={i} className="h-[72px]" />)}
    </div>
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <Block className="h-5 w-40" />
      {[0, 1, 2].map(i => <Block key={i} className="h-20" />)}
    </div>
  </div>
);

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail?: string;
  action?: React.ReactNode;
}

/** Estado vacío con una acción clara para seguir. */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, detail, action }) => (
  <div className="dispatch-card flex flex-col items-center gap-2 p-8 text-center">
    <Icon className="h-8 w-8 text-slate-300" />
    <p className="font-semibold text-slate-700">{title}</p>
    {detail && <p className="max-w-sm text-sm text-slate-500">{detail}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
