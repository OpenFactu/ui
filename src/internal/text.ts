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
  // Se pliega carácter a carácter para saber de qué posición original sale cada letra plegada.
  let folded = '';
  const origin: number[] = [];
  Array.from(text).reduce((at, char) => {
    const f = fold(char);
    for (let k = 0; k < f.length; k += 1) origin.push(at);
    folded += f;
    return at + char.length;
  }, 0);
  const start = folded.indexOf(needle);
  if (start === -1) return null;
  const lastOrigin = origin[start + needle.length - 1];
  const end = lastOrigin + (text.codePointAt(lastOrigin)! > 0xffff ? 2 : 1);
  return [origin[start], end];
}

/** Escapa un texto para usarlo literalmente dentro de una expresión regular. */
export const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
