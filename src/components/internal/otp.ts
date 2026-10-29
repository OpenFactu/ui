/** Cálculos del `OtpInput`: qué queda en las casillas y a dónde va el foco. Puros para poder probarlos. */

export type OtpMode = 'numeric' | 'alphanumeric';

/** Caracteres admitidos según el modo; lo demás se descarta (espacios y guiones de un código pegado, por ejemplo). */
export function sanitize(text: string, mode: OtpMode): string {
  const clean = mode === 'numeric' ? text.replace(/\D/g, '') : text.replace(/[^0-9a-z]/gi, '').toUpperCase();
  return clean;
}

/** Normaliza el valor a `length` casillas: un array con un carácter (o vacío) por casilla. */
export function toCells(value: string, length: number): string[] {
  return Array.from({ length }, (_, i) => value[i] ?? '');
}

/** El valor como cadena a partir de las casillas: se corta en el primer hueco (no hay códigos con agujeros). */
export function fromCells(cells: readonly string[]): string {
  const first = cells.findIndex((c) => !c);
  return (first === -1 ? cells : cells.slice(0, first)).join('');
}

/**
 * Escribe en la casilla `index`. Si llega más de un carácter (autocompletar de iOS, teclados predictivos) se reparte
 * en las siguientes. Devuelve el valor nuevo y la casilla que debe recibir el foco.
 */
export function applyInput(value: string, length: number, index: number, typed: string, mode: OtpMode): { value: string; focus: number } {
  const chars = sanitize(typed, mode);
  if (!chars) return { value, focus: index };
  const cells = toCells(value, length);
  // Escribir más allá del final del código no deja huecos: se escribe en la primera casilla libre.
  let at = Math.min(index, fromCells(cells).length);
  for (const char of chars) { if (at >= length) break; cells[at] = char; at += 1; }
  return { value: fromCells(cells), focus: Math.min(at, length - 1) };
}

/** Pegar un código entero: sustituye desde el principio. */
export function applyPaste(text: string, length: number, mode: OtpMode): { value: string; focus: number } {
  const chars = sanitize(text, mode).slice(0, length);
  return { value: chars, focus: Math.min(chars.length, length - 1) };
}

/** Retroceso en `index`: borra esa casilla o, si ya está vacía, la anterior. */
export function applyBackspace(value: string, length: number, index: number): { value: string; focus: number } {
  const cells = toCells(value, length);
  const target = cells[index] ? index : Math.max(0, index - 1);
  // Borrar en medio desplaza lo que sigue, para no dejar huecos.
  const next = [...cells.slice(0, target), ...cells.slice(target + 1), ''];
  return { value: fromCells(next), focus: target };
}
