/**
 * Harness de regresión visual del playground.
 * Captura cada story de Ladle en modo claro y oscuro.
 *
 *   node scripts/shots.mjs <carpeta-destino> [filtro-substring]
 *
 * Uso típico: capturar una referencia antes de un cambio grande y volver a
 * capturar después, comparando los PNG.
 *   node scripts/shots.mjs .shots/base
 *   …cambios…
 *   node scripts/shots.mjs .shots/after
 *   node scripts/shots.mjs --diff .shots/base .shots/after
 *
 * Es herramienta de desarrollo: no se publica (no está en `files`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE_URL = process.env.LADLE_URL ?? 'http://localhost:61000';

function compareDirs(dirA, dirB) {
  const files = fs.readdirSync(dirA).filter((f) => f.endsWith('.png'));
  let same = 0;
  const changed = [];
  const missing = [];
  for (const file of files) {
    const b = path.join(dirB, file);
    if (!fs.existsSync(b)) {
      missing.push(file);
      continue;
    }
    const bufA = fs.readFileSync(path.join(dirA, file));
    const bufB = fs.readFileSync(b);
    if (bufA.equals(bufB)) same += 1;
    else changed.push(file);
  }
  console.log(`\nIdénticas: ${same}/${files.length}`);
  if (changed.length) console.log(`Cambiadas (${changed.length}):\n  ${changed.join('\n  ')}`);
  if (missing.length) console.log(`Ausentes (${missing.length}):\n  ${missing.join('\n  ')}`);
  if (!changed.length && !missing.length) console.log('Sin diferencias.');
  return changed.length + missing.length;
}

if (process.argv[2] === '--diff') {
  const exitCode = compareDirs(process.argv[3], process.argv[4]) > 0 ? 1 : 0;
  process.exit(exitCode);
}

const outDir = process.argv[2] ?? '.shots/base';
const filter = process.argv[3] ?? '';
fs.mkdirSync(outDir, { recursive: true });

const metaRes = await fetch(`${BASE_URL}/meta.json`);
const meta = await metaRes.json();
const storyIds = Object.keys(meta.stories).filter((id) => id.includes(filter));
if (!storyIds.length) {
  console.error('Ninguna story coincide. ¿Está Ladle levantado?');
  process.exit(1);
}

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  // Con esto los gráficos no animan (lo respetan por diseño) y las capturas
  // salen deterministas sin tener que esperar a nada.
  reducedMotion: 'reduce',
});
const errors = [];
page.on('pageerror', (err) => errors.push(err.message.slice(0, 160)));

for (const id of storyIds) {
  for (const theme of ['light', 'dark']) {
    const url = `${BASE_URL}/?story=${id}&mode=preview&theme=${theme}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    // El Provider aplica html.dark desde el estado global de Ladle; se fuerza
    // por si el parámetro de URL no llega a tiempo al primer paint.
    await page.evaluate((t) => {
      document.documentElement.classList.toggle('dark', t === 'dark');
    }, theme);
    // Congelar animaciones de entrada para que las capturas sean deterministas.
    await page.addStyleTag({
      content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}',
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(outDir, `${id}--${theme}.png`), fullPage: true });
  }
}

await browser.close();
console.log(`${storyIds.length} stories × 2 temas → ${outDir}`);
if (errors.length) {
  console.log(`\nErrores de página (${errors.length}):`);
  for (const e of [...new Set(errors)]) console.log('  ' + e);
}
