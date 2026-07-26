/**
 * Utilidades numéricas de los campos de cifras.
 *
 * El planteamiento viene de la implementación que ya funcionaba en la
 * aplicación: mientras se escribe hay que aceptar estados intermedios que no
 * son números válidos («0,», «-», «1.»), porque si se normaliza en cada tecla
 * resulta imposible teclear un decimal.
 */

/** Acepta cifras con un único separador decimal, coma o punto. */
export const DECIMAL_RE = /^-?\d*[.,]?\d*$/;

export function isPartialNumber(raw: string, allowNegative = true): boolean {
  if (raw === '') return true;
  if (!allowNegative && raw.includes('-')) return false;
  return DECIMAL_RE.test(raw);
}

/** «1.234,56» → 1234.56. Devuelve null si no hay número. */
export function parseDecimal(raw: string, thousandSeparator?: string | false): number | null {
  if (raw == null) return null;
  let cleaned = String(raw).trim();
  if (cleaned === '' || cleaned === '-') return null;
  if (thousandSeparator) cleaned = cleaned.split(thousandSeparator).join('');
  cleaned = cleaned.replace(',', '.');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface FormatNumberOptions {
  precision?: number;
  decimalSeparator?: string;
  thousandSeparator?: string | false;
}

/** 1234.5 → «1.234,50» con las opciones por defecto en español. */
export function formatNumber(
  value: number | null | undefined,
  { precision = 0, decimalSeparator = ',', thousandSeparator = false }: FormatNumberOptions = {},
): string {
  if (value == null || !Number.isFinite(value)) return '';
  const fixed = Math.abs(value).toFixed(precision);
  const [intPart, decPart] = fixed.split('.');
  const grouped = thousandSeparator
    ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator)
    : intPart;
  const sign = value < 0 ? '-' : '';
  return decPart ? `${sign}${grouped}${decimalSeparator}${decPart}` : `${sign}${grouped}`;
}

export function clampNumber(value: number, min?: number, max?: number): number {
  let out = value;
  if (min !== undefined) out = Math.max(min, out);
  if (max !== undefined) out = Math.min(max, out);
  return out;
}

/** Redondeo a N decimales sin los artefactos del binario (0.1+0.2). */
export function roundTo(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
