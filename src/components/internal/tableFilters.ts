/** Filtros, búsqueda y agregados de la tabla, sin React. Probados en `scripts/schedule.test.cjs`. */
import { fold, matchesAllWords } from '../../internal/text';
import { formatNumber } from '../../internal/intl';

export interface TableFilterOption {
  value: string;
  label: string;
}

/** Cómo se filtra una columna. */
export type TableColumnFilter =
  | { type: 'text'; placeholder?: string }
  | { type: 'select'; options: TableFilterOption[] }
  | { type: 'range'; min?: number; max?: number; step?: number; unit?: string }
  | { type: 'date-range' };

/** Valor de un filtro activo: texto, opciones marcadas, rango numérico o rango de fechas ISO. */
export type TableFilterValue =
  | string
  | string[]
  | { min?: number | null; max?: number | null }
  | { start?: string | null; end?: string | null };

/** Filtros activos por `col.id ?? col.header`. */
export type TableFilters = Record<string, TableFilterValue>;

/** ¿Está vacío (y por tanto no filtra)? */
export function isEmptyFilter(value: TableFilterValue | undefined): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if ('min' in value || 'max' in value) {
    const r = value as { min?: number | null; max?: number | null };
    return r.min == null && r.max == null;
  }
  const d = value as { start?: string | null; end?: string | null };
  return !d.start && !d.end;
}

/** Texto comparable de un valor de celda (los nodos de React no se pueden buscar). */
export function searchableText(value: unknown): string {
  if (value == null || typeof value === 'boolean') return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
};

const asIsoDay = (value: unknown): string | null => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return null;
};

/** ¿Pasa `value` el filtro? Un filtro vacío deja pasar todo. */
export function matchesFilter(value: unknown, filter: TableColumnFilter, active: TableFilterValue | undefined): boolean {
  if (isEmptyFilter(active)) return true;
  switch (filter.type) {
    case 'text':
      return matchesAllWords(searchableText(value), String(active));
    case 'select':
      return (active as string[]).includes(searchableText(value));
    case 'range': {
      const n = asNumber(value);
      const { min, max } = active as { min?: number | null; max?: number | null };
      if (n === null) return false;
      return (min == null || n >= min) && (max == null || n <= max);
    }
    case 'date-range': {
      const day = asIsoDay(value);
      const { start, end } = active as { start?: string | null; end?: string | null };
      if (!day) return false;
      return (!start || day >= start) && (!end || day <= end);
    }
  }
}

/** Texto corto de un filtro activo para su chip («Pagada, Borrador», «100 – 500 €», «desde 01/07»). */
export function describeFilter(filter: TableColumnFilter, active: TableFilterValue): string {
  switch (filter.type) {
    case 'text':
      return `«${String(active).trim()}»`;
    case 'select': {
      const labels = (active as string[]).map((v) => filter.options.find((o) => o.value === v)?.label ?? v);
      return labels.length > 2 ? `${labels.slice(0, 2).join(', ')} y ${labels.length - 2} más` : labels.join(', ');
    }
    case 'range': {
      const { min, max } = active as { min?: number | null; max?: number | null };
      const u = filter.unit ? ` ${filter.unit}` : '';
      if (min != null && max != null) return `${formatNumber(min)} – ${formatNumber(max)}${u}`;
      return min != null ? `≥ ${formatNumber(min)}${u}` : `≤ ${formatNumber(max!)}${u}`;
    }
    case 'date-range': {
      const { start, end } = active as { start?: string | null; end?: string | null };
      const f = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
      if (start && end) return `${f(start)} – ${f(end)}`;
      return start ? `desde ${f(start)}` : `hasta ${f(end!)}`;
    }
  }
}

/** ¿Contiene la fila todas las palabras de la búsqueda en alguno de sus textos? (sin acentos ni mayúsculas) */
export function matchesSearch(texts: readonly unknown[], query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold(texts.map(searchableText).join(' \u0000 '));
  return words.every((w) => haystack.includes(w));
}

export type TableAggregate = 'sum' | 'avg' | 'min' | 'max' | 'count';

/** Agregado numérico de una columna (los valores no numéricos se ignoran, salvo en `count`). */
export function aggregate(values: readonly unknown[], kind: TableAggregate): number | null {
  if (kind === 'count') return values.filter((v) => v != null && v !== '').length;
  const nums = values.map(asNumber).filter((n): n is number => n !== null);
  if (nums.length === 0) return null;
  switch (kind) {
    case 'sum': return nums.reduce((a, b) => a + b, 0);
    case 'avg': return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'min': return Math.min(...nums);
    case 'max': return Math.max(...nums);
  }
}

/**
 * Páginas a mostrar en la paginación: siempre la primera, la última y las vecinas de la actual, con `null` donde
 * hay un salto («…»). Ocupa siempre el mismo número de huecos para que los botones no bailen al navegar.
 */
export function pageItems(page: number, total: number, siblings = 1): Array<number | null> {
  const slots = siblings * 2 + 5;
  if (total <= slots) return Array.from({ length: total }, (_, i) => i + 1);
  const left = Math.max(page - siblings, 1);
  const right = Math.min(page + siblings, total);
  const showLeftGap = left > 3;
  const showRightGap = right < total - 2;
  if (!showLeftGap) return [...Array.from({ length: slots - 2 }, (_, i) => i + 1), null, total];
  if (!showRightGap) return [1, null, ...Array.from({ length: slots - 2 }, (_, i) => total - (slots - 3) + i)];
  return [1, null, ...Array.from({ length: right - left + 1 }, (_, i) => left + i), null, total];
}
