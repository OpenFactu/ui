/** Formatos de dato compartidos por componentes, chat e IA. Puros. */
import { DEFAULT_LOCALE, formatNumber } from './intl';

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** Tamaño legible con el formato del idioma: `1536` → «1,5 KB», `4823000` → «4,6 MB». */
export function formatBytes(bytes: number, locale: string = DEFAULT_LOCALE): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  let value = bytes; let unit = 0;
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) { value /= 1024; unit += 1; }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${formatNumber(value, locale, { maximumFractionDigits: digits })} ${SIZE_UNITS[unit]}`;
}

/** Hora del día, «09:41». Cadena vacía si la fecha no es válida. */
export function formatTimeOfDay(value: string | number | Date, locale: string = DEFAULT_LOCALE): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

/** Duración de reloj, «1:05» (minutos sin relleno, segundos con dos cifras). */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
