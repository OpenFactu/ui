/** Cálculos de calendario compartidos por el selector de rango, el mapa de calor y la cuenta atrás. Puros. */
import { isoDate } from '../../internal/fechas';

export interface DayCell {
  iso: string;
  y: number;
  m: number;
  d: number;
  /** Pertenece al mes anterior o siguiente (relleno de la primera y la última semana). */
  outside: boolean;
}

/** `2026-10-29` → `{ y, m, d }`, o `null` si no es una fecha ISO. Sin `Date`, para no depender del huso. */
export function parseIso(iso?: string | null): { y: number; m: number; d: number } | null {
  const match = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  return match ? { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) } : null;
}

/** Fecha local a ISO. */
export const isoOf = (date: Date) => isoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());

/** Mediodía local de una fecha ISO (a mediodía, sumar días nunca cruza un cambio de hora). */
export function dateOf(iso: string): Date {
  const p = parseIso(iso)!;
  return new Date(p.y, p.m - 1, p.d, 12);
}

/** Suma días a una fecha ISO. */
export function addDays(iso: string, days: number): string {
  const d = dateOf(iso);
  d.setDate(d.getDate() + days);
  return isoOf(d);
}

/** Días entre dos fechas ISO (b − a). */
export const daysBetween = (a: string, b: string) => Math.round((dateOf(b).getTime() - dateOf(a).getTime()) / 86400000);

/** Mes desplazado: `shiftMonth(2026, 12, 1)` → `{ y: 2027, m: 1 }`. */
export function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const index = y * 12 + (m - 1) + delta;
  return { y: Math.floor(index / 12), m: (index % 12 + 12) % 12 + 1 };
}

/**
 * Semanas de un mes (mes de 1 a 12), completas con los días del mes anterior y siguiente. La semana empieza el lunes
 * (`weekStartsOn = 1`) o el domingo (`0`).
 */
export function monthGrid(y: number, m: number, weekStartsOn: 0 | 1 = 1): DayCell[][] {
  const first = new Date(y, m - 1, 1, 12);
  const lead = (first.getDay() - weekStartsOn + 7) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;
  const start = isoOf(new Date(y, m - 1, 1 - lead, 12));
  const cells: DayCell[] = [];
  for (let i = 0; i < total; i += 1) {
    const iso = addDays(start, i);
    const p = parseIso(iso)!;
    cells.push({ iso, ...p, outside: p.m !== m });
  }
  return Array.from({ length: total / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

export interface DateRange { start: string | null; end: string | null }

/** Ordena un rango: si el final va antes que el inicio, los intercambia. Las fechas ISO se comparan como texto. */
export const normalizeRange = (a: string, b: string): DateRange => (a <= b ? { start: a, end: b } : { start: b, end: a });

/** ¿Está `iso` dentro del rango (incluidos los extremos)? */
export const inRange = (iso: string, range: DateRange) => !!range.start && !!range.end && iso >= range.start && iso <= range.end;

export interface RangePreset {
  id: string;
  label: string;
  /** Rango a partir de la fecha de hoy (ISO). */
  range: (today: string) => DateRange;
}

/** Atajos habituales de un ERP. Se pueden sustituir o ampliar con la prop `presets`. */
export const DEFAULT_RANGE_PRESETS: RangePreset[] = [
  { id: 'today', label: 'Hoy', range: (t) => ({ start: t, end: t }) },
  { id: 'yesterday', label: 'Ayer', range: (t) => ({ start: addDays(t, -1), end: addDays(t, -1) }) },
  { id: 'last7', label: 'Últimos 7 días', range: (t) => ({ start: addDays(t, -6), end: t }) },
  { id: 'last30', label: 'Últimos 30 días', range: (t) => ({ start: addDays(t, -29), end: t }) },
  {
    id: 'thisMonth', label: 'Este mes',
    range: (t) => { const p = parseIso(t)!; return { start: isoDate(p.y, p.m, 1), end: isoDate(p.y, p.m, new Date(p.y, p.m, 0).getDate()) }; },
  },
  {
    id: 'lastMonth', label: 'Mes pasado',
    range: (t) => { const p = parseIso(t)!; const prev = shiftMonth(p.y, p.m, -1); return { start: isoDate(prev.y, prev.m, 1), end: isoDate(prev.y, prev.m, new Date(prev.y, prev.m, 0).getDate()) }; },
  },
  {
    id: 'thisQuarter', label: 'Este trimestre',
    range: (t) => { const p = parseIso(t)!; const q = Math.floor((p.m - 1) / 3) * 3 + 1; return { start: isoDate(p.y, q, 1), end: isoDate(p.y, q + 2, new Date(p.y, q + 2, 0).getDate()) }; },
  },
  { id: 'thisYear', label: 'Este año', range: (t) => { const p = parseIso(t)!; return { start: isoDate(p.y, 1, 1), end: isoDate(p.y, 12, 31) }; } },
];

/** Partes de una cuenta atrás. `done` cuando ya ha llegado (todo a 0, nunca negativo). */
export function countdownParts(ms: number): { days: number; hours: number; minutes: number; seconds: number; done: boolean } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: total === 0,
  };
}

export interface HeatmapCell { iso: string; value: number; level: number; inRange: boolean }

/**
 * Columnas (semanas, de lunes a domingo) de un mapa de calor entre `start` y `end`, con el nivel 0–`levels` de cada día
 * según su valor frente al máximo. Devuelve también dónde empieza cada mes, para las etiquetas.
 */
export function buildHeatmap(start: string, end: string, values: ReadonlyMap<string, number>, levels = 4) {
  const lead = (dateOf(start).getDay() + 6) % 7; // lunes = 0
  const first = addDays(start, -lead);
  const span = daysBetween(first, end) + 1;
  const weeks = Math.ceil(span / 7);
  let max = 0;
  values.forEach((v, iso) => { if (iso >= start && iso <= end) max = Math.max(max, v); });
  const columns: HeatmapCell[][] = [];
  const months: { column: number; y: number; m: number }[] = [];
  for (let w = 0; w < weeks; w += 1) {
    const column: HeatmapCell[] = [];
    for (let d = 0; d < 7; d += 1) {
      const iso = addDays(first, w * 7 + d);
      const value = values.get(iso) ?? 0;
      const within = iso >= start && iso <= end;
      column.push({ iso, value, inRange: within, level: !within || value <= 0 || max <= 0 ? 0 : Math.max(1, Math.ceil((value / max) * levels)) });
      const p = parseIso(iso)!;
      if (within && p.d === 1) months.push({ column: w, y: p.y, m: p.m });
    }
    columns.push(column);
  }
  return { columns, months, max };
}
