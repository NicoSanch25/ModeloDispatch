import type { SectionId } from '../components/AppNavigation';

export type ShortcutAction = 'search' | 'coverage' | 'transfer' | 'agenda' | 'help' | SectionId;

/** Atajos de teclado del escritorio, en el orden en que se muestran en la ayuda. */
export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['/', 'Ctrl K'], label: 'Buscar' },
  { keys: ['N'], label: 'Nueva cobertura' },
  { keys: ['T'], label: 'Nuevo traslado' },
  { keys: ['A'], label: 'Agenda del día' },
  { keys: ['1'], label: 'Ir al Tablero' },
  { keys: ['2'], label: 'Ir a Coberturas' },
  { keys: ['3'], label: 'Ir a Traslados' },
  { keys: ['4'], label: 'Ir a Flota' },
  { keys: ['?'], label: 'Ver estos atajos' },
  { keys: ['Esc'], label: 'Cerrar la ventana abierta' },
];

const SINGLE: Record<string, ShortcutAction> = {
  '/': 'search', n: 'coverage', t: 'transfer', a: 'agenda', '?': 'help',
  '1': 'dashboard', '2': 'matches', '3': 'transfers', '4': 'fleet',
};

/**
 * Acción de una tecla. Ctrl/⌘+K busca siempre; las teclas sueltas sólo cuando no se está
 * escribiendo en un campo y sin Ctrl, ⌘ ni Alt (para no pisar atajos del navegador).
 */
export function shortcutAction(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>, typing: boolean): ShortcutAction | null {
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === 'k') return 'search';
  if (typing || event.ctrlKey || event.metaKey || event.altKey) return null;
  return SINGLE[key] ?? null;
}
