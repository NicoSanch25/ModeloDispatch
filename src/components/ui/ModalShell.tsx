import React, { useEffect, useRef } from 'react';

// Pila de modales abiertos: Escape cierra sólo el de arriba.
const stack: symbol[] = [];

interface ModalShellProps {
  onClose: () => void;
  /** Mientras guarda, Escape no cierra. */
  busy?: boolean;
  /** Cerrar al tocar el fondo. Desactivado por defecto para no perder formularios. */
  closeOnBackdrop?: boolean;
  labelledBy?: string;
  label?: string;
  zIndex?: string;
  children: React.ReactNode;
}

/**
 * Fondo y animación comunes a todos los modales.
 * En celular el panel sube desde abajo como hoja; en escritorio aparece centrado.
 * El panel (primer hijo) conserva sus propias clases.
 */
export const ModalShell: React.FC<ModalShellProps> = ({ onClose, busy = false, closeOnBackdrop = false, labelledBy, label, zIndex = 'z-50', children }) => {
  const id = useRef(Symbol('modal'));
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  const container = useRef<HTMLDivElement>(null);
  // Se toma al montar, antes de que el contenido mueva el foco.
  const previous = useRef<HTMLElement | null>(typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null);
  closeRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    const me = id.current;
    stack.push(me);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || stack[stack.length - 1] !== me || busyRef.current) return;
      event.preventDefault();
      closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    if (!container.current?.contains(document.activeElement)) container.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(me), 1);
      if (!stack.length) document.body.style.overflow = overflow;
      previous.current?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <div
      ref={container}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      className={`dispatch-modal fixed inset-0 ${zIndex} flex items-end justify-center bg-slate-900/50 outline-none animate-fade-in sm:items-center sm:p-4`}
      onMouseDown={event => { if (closeOnBackdrop && !busy && event.target === event.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
};
