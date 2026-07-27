/**
 * Utilidades de fecha compartidas por `Gantt` y `Calendar`.
 *
 * Interno: no se exporta del paquete. La librería no quiere ser una librería de
 * fechas, solo necesita lo justo para colocar barras y bloques sin arrastrar
 * una dependencia entera.
 *
 * Todo se normaliza a **mediodía** en lugar de a medianoche: al sumar días
 * cruzando un cambio de hora, medianoche puede caer en el día anterior o
 * saltarse uno, y las barras se desplazan una columna sin motivo aparente.
 */

export const DIA_MS = 86400000;
export const HORA_MS = 3600000;

/** Normaliza a mediodía del mismo día, acepte `Date` o texto ISO. */
export function aFecha(v: Date | string): Date {
  const d = v instanceof Date ? new Date(v.getTime()) : new Date(v);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Como {@link aFecha} pero conservando la hora: para calendarios con horas. */
export function aInstante(v: Date | string): Date {
  return v instanceof Date ? new Date(v.getTime()) : new Date(v);
}

export function sumarDias(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DIA_MS);
}

export function sumarMinutos(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60000);
}

/** Días enteros entre dos fechas ya normalizadas a mediodía. */
export function dias(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DIA_MS);
}

export const MESES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

export const MESES_LARGOS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Empieza en domingo porque `Date.getDay()` devuelve 0 para domingo. */
export const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function esFinde(d: Date): boolean {
  return d.getDay() === 0 || d.getDay() === 6;
}

/** Lunes de la semana de `d`, a mediodía. La semana empieza en lunes. */
export function inicioDeSemana(d: Date): Date {
  const x = aFecha(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/** Día 1 del mes de `d`, a mediodía. */
export function inicioDeMes(d: Date): Date {
  const x = aFecha(d);
  x.setDate(1);
  return x;
}

export function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Hora del día en decimal: 09:30 → 9.5. Es lo que posiciona los bloques. */
export function horaDecimal(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

/** `2026-07-22`, para usar como clave o para devolver al servidor. */
export function ymd(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** `09:30`. */
export function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Coloca la parte de hora de `hora` sobre el día de `dia`. Al arrastrar un
 * bloque de un día a otro se conserva la hora, que es lo que se espera.
 */
export function conHoraDe(dia: Date, hora: Date): Date {
  const x = new Date(dia.getTime());
  x.setHours(hora.getHours(), hora.getMinutes(), 0, 0);
  return x;
}
