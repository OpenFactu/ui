/** Diff de líneas sin dependencias: LCS sobre la parte central, tras recortar prefijo y sufijo comunes. */
export interface AIDiffLine { type: 'equal' | 'add' | 'remove'; text: string; oldLine?: number; newLine?: number }
export type AIDiffRow = AIDiffLine | { type: 'skip'; count: number; from: number };

/** Por encima de este producto de líneas la LCS sería cara: se marca el bloque central como reemplazado. */
const MAX_CELLS = 4_000_000;
const splitLines = (text: string) => text === '' ? [] : text.replace(/\r\n?/g, '\n').split('\n');

export function lineDiff(original: string, modified: string): AIDiffLine[] {
  const a = splitLines(original); const b = splitLines(modified);
  let head = 0; while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0; while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  const out: AIDiffLine[] = [];
  for (let i = 0; i < head; i++) out.push({ type: 'equal', text: a[i], oldLine: i + 1, newLine: i + 1 });
  const midA = a.slice(head, a.length - tail); const midB = b.slice(head, b.length - tail);
  const n = midA.length; const m = midB.length;
  if (n && m && n * m <= MAX_CELLS) {
    // dp[i][j] = longitud de la LCS de midA[i..] y midB[j..], en un único buffer plano.
    const width = m + 1; const dp = new Uint32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      dp[i * width + j] = midA[i] === midB[j] ? dp[(i + 1) * width + j + 1] + 1 : Math.max(dp[(i + 1) * width + j], dp[i * width + j + 1]);
    let i = 0; let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && midA[i] === midB[j]) { out.push({ type: 'equal', text: midA[i], oldLine: head + i + 1, newLine: head + j + 1 }); i++; j++; }
      else if (j < m && (i === n || dp[i * width + j + 1] > dp[(i + 1) * width + j])) { out.push({ type: 'add', text: midB[j], newLine: head + j + 1 }); j++; }
      else { out.push({ type: 'remove', text: midA[i], oldLine: head + i + 1 }); i++; }
    }
  } else {
    midA.forEach((text, i) => out.push({ type: 'remove', text, oldLine: head + i + 1 }));
    midB.forEach((text, j) => out.push({ type: 'add', text, newLine: head + j + 1 }));
  }
  for (let k = 0; k < tail; k++) out.push({ type: 'equal', text: a[a.length - tail + k], oldLine: a.length - tail + k + 1, newLine: b.length - tail + k + 1 });
  return out;
}

/** Agrupa las líneas iguales lejos de un cambio en filas `skip`, conservando `context` líneas a cada lado. */
export function diffRows(lines: readonly AIDiffLine[], context = 3, expanded: ReadonlySet<number> = new Set()): AIDiffRow[] {
  const near = new Uint8Array(lines.length);
  lines.forEach((line, index) => { if (line.type !== 'equal') for (let k = Math.max(0, index - context); k <= Math.min(lines.length - 1, index + context); k++) near[k] = 1; });
  const rows: AIDiffRow[] = [];
  for (let index = 0; index < lines.length;) {
    if (near[index] || lines[index].type !== 'equal') { rows.push(lines[index]); index++; continue; }
    let end = index; while (end < lines.length && !near[end]) end++;
    if (expanded.has(index) || end - index <= 1) rows.push(...lines.slice(index, end));
    else rows.push({ type: 'skip', count: end - index, from: index });
    index = end;
  }
  return rows;
}

export const diffStats = (lines: readonly AIDiffLine[]) => lines.reduce((total, line) => {
  if (line.type === 'add') total.added++; else if (line.type === 'remove') total.removed++;
  return total;
}, { added: 0, removed: 0 });
