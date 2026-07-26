/**
 * Comprueba que `resolveTheme()` (el motor en TypeScript) produce los mismos
 * valores que `styles/tokens.css` (el CSS publicado). Si divergen, un consumidor
 * vería un color antes de que arranque el JS y otro después.
 *
 *   npx tsx scripts/check-tokens.mjs
 *
 * Se importa desde `src` porque el `dist` que genera tsc usa imports sin
 * extensión (formato pensado para bundlers), que Node no resuelve por su cuenta.
 */
import fs from 'node:fs';
import { resolveTheme, themeToCssVars } from '../src/theme/tokens';

const css = fs.readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');

/** Extrae el bloque de un selector y devuelve su mapa de variables. */
function parseBlock(selector) {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No se encontró el bloque ${selector}`);
  const body = css.slice(start + selector.length + 2, css.indexOf('\n}', start));
  const vars = {};
  for (const line of body.split('\n')) {
    const m = /^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/i.exec(line);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

// Alias que el CSS resuelve por indirección y el motor emite ya expandidos.
const INDIRECT = new Set([
  '--k-accent-50',
  '--k-accent-100',
  '--k-accent-500',
  '--k-accent-600',
  '--k-accent-900',
]);
// Alias hex que se derivan dentro del propio CSS; el motor no los emite.
const CSS_ONLY = new Set([
  '--color-primary',
  '--color-primary-hover',
  '--color-primary-fg',
  '--color-accent',
  '--color-accent-fg',
]);

let failures = 0;

function compare(label, cssVars, tsVars) {
  const missing = [];
  const mismatched = [];
  for (const [key, cssValue] of Object.entries(cssVars)) {
    if (CSS_ONLY.has(key)) continue;
    const tsValue = tsVars[key];
    if (tsValue === undefined) {
      missing.push(key);
      continue;
    }
    const expected = INDIRECT.has(key) ? cssVars[cssValue.replace(/var\((.+)\)/, '$1')] : cssValue;
    if (String(tsValue).toLowerCase() !== String(expected).toLowerCase()) {
      mismatched.push(`${key}: css=${expected}  ts=${tsValue}`);
    }
  }
  const extra = Object.keys(tsVars).filter((k) => !(k in cssVars));

  console.log(`\n[${label}] ${Object.keys(cssVars).length} variables en CSS`);
  if (missing.length) {
    console.log(`  Ausentes en el motor TS (${missing.length}): ${missing.join(', ')}`);
    failures += missing.length;
  }
  if (mismatched.length) {
    console.log(`  Valores distintos (${mismatched.length}):\n    ${mismatched.join('\n    ')}`);
    failures += mismatched.length;
  }
  if (extra.length) console.log(`  Solo en el motor TS (informativo): ${extra.join(', ')}`);
  if (!missing.length && !mismatched.length) console.log('  Todo coincide.');
}

compare(':root (claro)', parseBlock(':root'), themeToCssVars(resolveTheme({ mode: 'light' })));

// En oscuro el motor DERIVA las superficies del primario, mientras que el CSS
// lleva los valores estáticos de la marca por defecto. Solo se comparan las
// variables que no dependen del primario.
const darkCss = parseBlock('html.dark');
const darkTs = themeToCssVars(resolveTheme({ mode: 'dark' }));
// Ya no se excluye nada: con el primario de fábrica, el CSS estático y el
// motor deben coincidir token a token.
const DERIVED_IN_DARK = new Set([]);
compare(
  'html.dark',
  Object.fromEntries(Object.entries(darkCss).filter(([k]) => !DERIVED_IN_DARK.has(k))),
  darkTs,
);

console.log(
  failures === 0
    ? '\nEl CSS publicado y el motor de temas están sincronizados.'
    : `\n${failures} discrepancias.`,
);
process.exit(failures === 0 ? 0 : 1);
