/** Utilidades de texto compartidas: búsqueda sin acentos ni mayúsculas, y escapes. Puras. */

/** Quita acentos y diacríticos y pasa a minúsculas: «Facturación» → «facturacion». Para comparar, no para mostrar. */
export const fold = (text: string): string => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** ¿Contiene `text` todas las palabras de `query`, en cualquier orden y sin mirar acentos? «fac acme» encuentra «Factura de Acme». */
export function matchesAllWords(text: string, query: string): boolean {
  const haystack = fold(text);
  return fold(query).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

/**
 * Posición de `term` en `text` sin mirar acentos ni mayúsculas, en índices del texto **original** (para resaltar lo que
 * coincide: «facturacion» marca «Facturación» entera). `null` si no aparece.
 */
export function foldedRange(text: string, term: string): [number, number] | null {
  const needle = fold(term);
  if (!needle) return null;
  const { folded, toOriginal } = foldWithOrigin(text);
  const start = folded.indexOf(needle);
  return start === -1 ? null : toOriginal(start, needle.length);
}

/**
 * Todo lo que hay que resaltar de una búsqueda: cada aparición de cada palabra de `query`, sin mirar acentos ni
 * mayúsculas, en índices del texto original, en orden y sin solaparse. Es la pareja de `matchesAllWords`.
 */
export function foldedRanges(text: string, query: string): Array<[number, number]> {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const { folded, toOriginal } = foldWithOrigin(text);
  const ranges: Array<[number, number]> = [];
  for (const word of words) {
    for (let at = folded.indexOf(word); at !== -1; at = folded.indexOf(word, at + word.length)) ranges.push(toOriginal(at, word.length));
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]); else merged.push(range);
  }
  return merged;
}

/** Pliega carácter a carácter para saber de qué posición original sale cada letra plegada. */
function foldWithOrigin(text: string) {
  let folded = '';
  const origin: number[] = [];
  Array.from(text).reduce((at, char) => {
    const f = fold(char);
    for (let k = 0; k < f.length; k += 1) origin.push(at);
    folded += f;
    return at + char.length;
  }, 0);
  const toOriginal = (start: number, length: number): [number, number] => {
    const lastOrigin = origin[start + length - 1];
    return [origin[start], lastOrigin + (text.codePointAt(lastOrigin)! > 0xffff ? 2 : 1)];
  };
  return { folded, toOriginal };
}

/** Escapa un texto para usarlo literalmente dentro de una expresión regular. */
export const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
