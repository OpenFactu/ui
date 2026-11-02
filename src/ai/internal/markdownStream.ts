/**
 * Markdown de una respuesta que aún está llegando, sin DOM: se parte en bloques para que los terminados no se vuelvan a
 * procesar con cada trozo, y al último, el único incompleto, se le cierra lo que tenga abierto para que se vea bien.
 */

const REFERENCE = /^ {0,3}\[[^\]\n]+\]:\s/m;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const LIST_ITEM = /^ {0,3}(?:[-*+]|\d{1,9}[.)])[ \t]/;

/**
 * Parte el texto por líneas en blanco en bloques que se pueden procesar por separado: juntos dan lo mismo que el texto
 * entero. No corta dentro de un bloque de código ni de una lista. Con referencias o notas al pie (`[a]: http…`) lo deja
 * entero, porque un bloque necesita leer lo que otro define.
 */
export function splitMarkdownBlocks(text: string): string[] {
  if (REFERENCE.test(text)) return text ? [text] : [];
  const lines = text.split('\n');
  const blocks: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;
  const flush = () => { if (current.length) blocks.push(current.join('\n')); current = []; };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const mark = FENCE.exec(line);
    if (fence) {
      current.push(line);
      // Cierra el mismo carácter, con al menos la misma longitud y nada detrás.
      if (mark && mark[1][0] === fence[0] && mark[1].length >= fence.length && line.trim() === mark[1]) fence = null;
      continue;
    }
    if (mark) { fence = mark[1]; current.push(line); continue; }
    if (line.trim()) { current.push(line); continue; }
    let next = i + 1;
    while (next < lines.length && !lines[next].trim()) next += 1;
    if (next === lines.length) break; // solo quedan líneas en blanco
    const inList = current.some((l) => LIST_ITEM.test(l));
    // Lo sangrado sigue al bloque anterior, y un elemento de lista continúa la lista aunque haya una línea en blanco.
    if (/^\s/.test(lines[next]) || (inList && LIST_ITEM.test(lines[next]))) { current.push(line); continue; }
    flush();
    i = next - 1;
  }
  flush();
  return blocks;
}

/** Fila de separación de una tabla, ya completa para las columnas de su cabecera. */
function isTableDelimiter(line: string, header: string): boolean {
  if (!/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line)) return false;
  const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').length;
  return cells(line) === cells(header);
}

/**
 * Deja el último bloque listo para pintarse aunque esté a medias. Cierra el código, las negritas, las cursivas y los
 * tachados; un enlace o una imagen sin terminar no enseña su sintaxis; y una tabla no aparece hasta que tiene su fila de
 * separación (antes solo serían barras). Devuelve `''` si aún no hay nada que enseñar.
 */
export function closeIncompleteMarkdown(block: string): string {
  const lines = block.split('\n');
  let fence: string | null = null;
  for (const line of lines) {
    const mark = FENCE.exec(line);
    if (!mark) continue;
    if (!fence) fence = mark[1];
    else if (mark[1][0] === fence[0] && mark[1].length >= fence.length && line.trim() === mark[1]) fence = null;
  }
  if (fence) return `${block}\n${fence}`;

  const head = lines.findIndex((l) => l.trim());
  if (head >= 0 && lines[head].trimStart().startsWith('|')) {
    const delimiter = lines[head + 1];
    if (delimiter === undefined || !isTableDelimiter(delimiter, lines[head])) return '';
    return block;
  }

  let out = block
    // Lo que aún no dice nada: unas comillas invertidas sueltas, o solo la marca de un título, lista o cita.
    .replace(/(^|\n)[ \t]*`{1,2}[ \t]*$/, '$1')
    .replace(/(^|\n)[ \t]*(?:#{1,6}|[-*+]|\d{1,9}[.)]|>)[ \t]*$/, '$1')
    // Imagen sin terminar: fuera (no hay que pedir una URL a medias). Enlace sin terminar: solo su texto.
    .replace(/!\[[^\]\n]*(?:\](?:\([^)\n]*)?)?$/, '')
    .replace(/\[([^\]\n]*)\]\([^)\n]*$/, '$1')
    .replace(/\[([^\]\n]*)$/, (whole, text: string) => (/^[ xX]?$/.test(text) ? whole : text));
  if (!out.trim()) return '';

  const ticks = (out.match(/`/g) ?? []).length;
  if (ticks % 2 === 1) return `${out}\``;
  // El resto se cuenta fuera del código en línea, donde estos signos son literales.
  const prose = out.replace(/`[^`\n]*`/g, '');
  let closers = '';
  if (((prose.match(/\*\*/g) ?? []).length) % 2 === 1) closers += '**';
  if (((prose.match(/~~/g) ?? []).length) % 2 === 1) closers += '~~';
  // Una cursiva solo se abre tras un espacio o al empezar; así `2*3` no se convierte en cursiva.
  const single = /(?:^|\s)([*_])(?=[^\s*_])[^*_\n]*$/.exec(prose.replace(/\*\*/g, ''));
  if (single) closers = single[1] + closers;
  if (closers) out = out.trimEnd() + closers;
  return out;
}
