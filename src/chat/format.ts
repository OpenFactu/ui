import { formatMessage } from '../i18n/format';
import { esMessages, type Messages } from '../i18n/messages';
import { formatTimeOfDay } from '../internal/format';
/** Hora del mensaje, «09:41». */
export function chatTime(value: string): string {
  return formatTimeOfDay(value);
}
/** «27 de octubre de 2026», con las palabras de `dates` (las del idioma activo; por defecto, español). */
export function chatDate(value: string, dates: Messages['dates'] = esMessages.dates): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : formatMessage(dates.longDate, { day: date.getDate(), month: dates.months[date.getMonth()], year: date.getFullYear() });
}
export function chatDay(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
