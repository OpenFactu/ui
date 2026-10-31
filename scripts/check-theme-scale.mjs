#!/usr/bin/env node
/**
 * Guarda: la letra y los bordes de la librería siguen al tema.
 *
 * - `styles/*.css`: un tamaño de letra (`font-size`, `font:`) o un interlineado en px tiene que ir multiplicado,
 *   `calc(13px * var(--k-text-scale, 1))` (vale dentro de `min`/`max`, para topes como los 16px de iOS). Un borde
 *   de 1px usa el grosor del tema: `var(--k-border-width, 1px) solid …`.
 * - `src/`: nada de tamaños arbitrarios de Tailwind en px (`text-[12px]`), que el preset no escala: o un tamaño con
 *   nombre o `text-[length:calc(12px*var(--k-text-scale,1))]`. Lo mismo en estilos en línea (`fontSize: 11`).
 *
 * Uso: node scripts/check-theme-scale.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PX = /(?<![\w.-])(\d*\.?\d+)px\b/g;
// Filas de altura fija calculada en JS (LINE_HEIGHT de CodeEditor.tsx): ni su letra ni su interlineado pueden crecer
// sin salirse de la fila (la letra del editor crece con `min(16px, …)` en code-editor.css).
const fixedLine = /line-height: 22px/;
const allowedFiles = new Set(['tokens.css']);
const problems = [];

/** Medidas en px de un valor que no están dentro de algo ya escalado por `--k-text-scale`. */
function unscaled(value) {
  let rest = value;
  for (let guard = 0; guard < 20; guard++) {
    // Ⓢ marca «ya escalado» y sube hacia fuera: `max(16px, calc(16px * var(--k-text-scale, 1)))` → `max(16px, Ⓢ)` → `Ⓢ`.
    const next = rest.replace(/(?:calc|var|max|min|clamp)?\(([^()]*)\)/g, (all, inner) => /Ⓢ|--k-text-scale/.test(all) ? 'Ⓢ' : `⟨${inner}⟩`);
    if (next === rest) break;
    rest = next;
  }
  return [...rest.matchAll(PX)].map(m => m[0]).filter(v => parseFloat(v) !== 0);
}

for (const file of fs.readdirSync(path.join(root, 'styles')).filter(f => f.endsWith('.css') && !allowedFiles.has(f))) {
  const text = fs.readFileSync(path.join(root, 'styles', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ' '));
  text.split('\n').forEach((line, i) => {
    const where = `styles/${file}:${i + 1}`;
    for (const m of line.matchAll(/(?:^|[;{\s])(font-size|line-height)\s*:\s*([^;}]+)/g)) {
      if (fixedLine.test(line)) continue;
      if (unscaled(m[2]).length) problems.push(`${where}  ${m[1]}: ${m[2].trim().slice(0, 80)}`);
    }
    for (const m of line.matchAll(/(?:^|[;{\s])font\s*:\s*([^;}]+)/g)) {
      // En el atajo `font:` solo cuentan el tamaño y el interlineado (`600 12px/20px …`), no lo que haya en var().
      const sizes = m[1].replace(/var\([^()]*(?:\([^()]*\)[^()]*)*\)/g, v => /--k-text-scale/.test(v) ? v : '');
      if (unscaled(sizes).length) problems.push(`${where}  font: ${m[1].trim().slice(0, 80)}`);
    }
    for (const m of line.matchAll(/(border(?:-[a-z-]+)?)\s*:\s*1px\s+(?:solid|dashed|dotted)/g)) {
      problems.push(`${where}  ${m[0]} (usa var(--k-border-width, 1px))`);
    }
  });
}

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []);
for (const file of walk(path.join(root, 'src'))) {
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const where = `${path.relative(root, file).replace(/\\/g, '/')}:${i + 1}`;
    for (const m of line.matchAll(/\btext-\[(?:length:)?\d*\.?\d+px\]/g)) problems.push(`${where}  ${m[0]} (text-[length:calc(…px*var(--k-text-scale,1))] o un tamaño del preset)`);
    for (const m of line.matchAll(/\bfontSize\s*:\s*(\d+|['"`]\d*\.?\d+px['"`])/g)) problems.push(`${where}  ${m[0]} (multiplica por var(--k-text-scale, 1))`);
  });
}

if (problems.length) {
  console.error(`Letra o bordes fuera del tema (${problems.length}).\n`);
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('La letra y los bordes siguen al tema (escala de texto y grosor de borde).');
