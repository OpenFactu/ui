import { DEFAULT_LOCALE } from '../internal/intl';
import { formatTimeOfDay } from '../internal/format';
/** Hora del mensaje, «09:41». */
export function chatTime(value: string): string {
  return formatTimeOfDay(value);
}
export function chatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(DEFAULT_LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
}
export function chatDay(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
