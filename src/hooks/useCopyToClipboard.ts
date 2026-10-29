import * as React from 'react';

/**
 * Copia texto al portapapeles. Resuelve `true` si se copió y `false` si no se pudo (sin permiso, sin portapapeles, sin
 * HTTPS): nunca se da por bueno un fallo.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Estado de un botón de copiar: `copy(texto)` copia y deja `status` en `copied` o `error` durante `resetMs` (2 s por
 * defecto) antes de volver a `idle`.
 */
export function useCopyToClipboard(resetMs = 2000) {
  const [status, setStatus] = React.useState<'idle' | 'copied' | 'error'>('idle');
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copy = React.useCallback(async (text: string) => {
    const ok = await copyText(text);
    setStatus(ok ? 'copied' : 'error');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), resetMs);
    return ok;
  }, [resetMs]);
  return { status, copy };
}
