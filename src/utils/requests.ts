export function withTimeout<T>(request: PromiseLike<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), milliseconds);
    Promise.resolve(request).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

/** Traduce los errores de Supabase o de red a un mensaje que el operador pueda resolver. */
export function friendlyError(error: unknown): string {
  const e = (error ?? {}) as { code?: string; message?: string };
  const message = e.message || String(error || '');
  if (e.code === 'PGRST116') return 'Otro operador cambió este registro mientras lo editabas. Cerrá, actualizá y volvé a intentar.';
  if (e.code === '23503') return 'No se puede borrar porque está usado en servicios o cargas. Editalo en lugar de borrarlo.';
  if (e.code === '23505') return 'Ya existe un registro con esos datos.';
  if (e.code === '42501' || /permission denied|row-level security/i.test(message)) return 'Tu usuario no tiene permiso para esta acción.';
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) return 'Sin conexión. Revisá internet y volvé a intentar.';
  if (/jwt|session/i.test(message) && /expired|invalid/i.test(message)) return 'La sesión venció. Volvé a ingresar.';
  return message || 'Ocurrió un error inesperado.';
}
