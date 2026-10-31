#!/usr/bin/env node
/**
 * Guarda: toda duración y todo retardo de la librería van al ritmo de `--k-motion` (0 = sin movimiento, 1,6 = lento).
 *
 * - `styles/*.css`: un `transition`/`animation` con un tiempo literal (`150ms`, `.2s`) tiene que ir multiplicado,
 *   `calc(150ms * var(--k-motion, 1))`, o venir de una variable que ya lo esté. Se excluyen los bloques de
 *   `prefers-reduced-motion` y la barra de los avisos (mide tiempo, no es decoración).
 * - `src/`: lo mismo en estilos en línea (`animation: \`… 0.35s …\``), y nada de duraciones arbitrarias de Tailwind
 *   (`duration-[200ms]`), que el preset no escala.
 *
 * Uso: node scripts/check-motion.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TIME = /(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g;
const skipLine = /k-toast-progress|--k-theme-transition/;
const problems = [];

/** Tiempos literales de un valor que no están dentro de algo ya escalado. */
function unscaled(value) {
  let rest = value;
  // Quita, de dentro afuera, los paréntesis que ya multiplican por la velocidad.
  for (let guard = 0; guard < 20; guard++) {
    // Ⓜ marca «ya escalado» y sube hacia fuera: `calc(1s * var(--k-motion, 1))` → `calc(1s * Ⓜ)` → `Ⓜ`.
    // Una variable de duración con reserva literal (`var(--x-fast, 150ms)`) no cuenta: la reserva también se escala.
    const next = rest.replace(/(?:calc|var|max|min|clamp)?\(([^()]*)\)/g, (all, inner) => {
      if (/^var\(\s*--[\w-]+\s*,\s*[\d.]+m?s\s*\)$/.test(all)) return `⟨${inner}⟩`;
      return /Ⓜ|--k-motion|--k-spinner-speed|--[\w-]*(dur|fast|slow|base)[\w-]*/.test(all) ? 'Ⓜ' : `⟨${inner}⟩`;
    });
    if (next === rest) break;
    rest = next;
  }
  return [...rest.matchAll(TIME)].map(m => m[0]).filter(t => parseFloat(t) !== 0);
}

for (const file of fs.readdirSync(path.join(root, 'styles')).filter(f => f.endsWith('.css'))) {
  const text = fs.readFileSync(path.join(root, 'styles', file), 'utf8');
  const reduced = [];
  for (const m of text.matchAll(/@media\s*\(prefers-reduced-motion[^{]*\{/g)) {
    let depth = 0; let i = m.index + m[0].length - 1;
    for (; i < text.length; i++) { if (text[i] === '{') depth++; if (text[i] === '}' && --depth === 0) break; }
    reduced.push([m.index, i]);
  }
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ' '));
  for (const m of clean.matchAll(/(?:^|[;{\s])((?:transition|animation)(?:-duration|-delay)?)\s*:\s*([^;}]+)/g)) {
    if (reduced.some(([a, b]) => m.index >= a && m.index <= b)) continue;
    const line = text.slice(0, m.index).split('\n').length + (m[0].startsWith('\n') ? 1 : 0);
    if (skipLine.test(text.split('\n')[line - 1] ?? '')) continue;
    const bad = unscaled(m[2]);
    if (bad.length) problems.push(`styles/${file}:${line}  ${m[1]}: ${m[2].trim().slice(0, 100)}`);
  }
}

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []);
for (const file of walk(path.join(root, 'src'))) {
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const where = `${path.relative(root, file).replace(/\\/g, '/')}:${i + 1}`;
    for (const m of line.matchAll(/\b(?:duration|delay)-\[[^\]]+\]/g)) problems.push(`${where}  ${m[0]} (usa las duraciones del preset o calc(... * var(--k-motion, 1)))`);
    for (const m of line.matchAll(/\b(?:animation|transition|animationDuration|transitionDuration)\s*:\s*[`'"]([^`'"]*)[`'"]/g)) {
      if (unscaled(m[1].replace(/\$\{[^}]*\}/g, '0')).length) problems.push(`${where}  ${m[0].slice(0, 100)}`);
    }
  });
}

if (problems.length) {
  console.error(`Duraciones fuera del sistema de movimiento (${problems.length}): multiplícalas por var(--k-motion, 1).\n`);
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('Todas las duraciones van al ritmo de --k-motion.');
