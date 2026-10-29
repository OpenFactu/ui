import * as React from 'react';

/**
 * `localStorage` a prueba de fallos: sin navegador (SSR), con el almacenamiento bloqueado o lleno, o con datos
 * corruptos, lee el valor por defecto y escribir no hace nada. Nada de lo que se guarda aquí es imprescindible.
 */
export const safeStorage = {
  get<T>(key: string, fallback: T): T {
    if (typeof localStorage === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown): void {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* lleno o bloqueado: no persiste */ }
  },
  remove(key: string): void {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.removeItem(key); } catch { /* bloqueado */ }
  },
};

/**
 * Búsquedas recientes guardadas en el navegador con la clave `key` (sin clave, no se guardan). Lo último va primero, sin
 * repetidos y hasta `max`. `reloadOn` vuelve a leerlas (por ejemplo, al abrir una paleta que otra pestaña pudo cambiar).
 */
export function useRecentSearches(key: string | false | undefined, max: number, reloadOn?: unknown) {
  const [recent, setRecent] = React.useState<string[]>(() => (key ? safeStorage.get<string[]>(key, []) : []));
  React.useEffect(() => { if (key) setRecent(safeStorage.get<string[]>(key, [])); }, [key, reloadOn]);

  const remember = React.useCallback((term: string) => {
    if (!key || !term.trim()) return;
    setRecent((prev) => {
      const next = [term, ...prev.filter((x) => x !== term)].slice(0, max);
      safeStorage.set(key, next);
      return next;
    });
  }, [key, max]);

  const clear = React.useCallback(() => {
    setRecent([]);
    if (key) safeStorage.remove(key);
  }, [key]);

  return { recent, remember, clear };
}
