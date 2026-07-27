/**
 * Comprueba en navegador los arreglos del bloque A: que `required` llegue al
 * DOM, que las etiquetas queden asociadas al control, que `rowClassName` y el
 * vacío como nodo funcionen, y que ningún color fijo haya sobrevivido.
 */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.LADLE_URL ?? 'http://localhost:61000';

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};
const go = async (story) => {
  await page.goto(`${BASE}/?story=${story}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
};

// ── A4: required ────────────────────────────────────────────────────────
console.log('\nA4 · required llega al DOM');
await go('api-formularios--obligatorios');
const marcas = await page.locator("label span[aria-hidden=\"true\"]").allInnerTexts();
check('los 5 controles llevan marca visible', marcas.filter((t) => t === '*').length === 5, `${marcas.length} marcas`);

const requeridos = await page.evaluate(() =>
  [...document.querySelectorAll('[aria-required="true"], input[required], textarea[required]')].map(
    (e) => e.tagName.toLowerCase() + (e.getAttribute('role') ? `[${e.getAttribute('role')}]` : ''),
  ),
);
check('y lo anuncian a los lectores de pantalla', requeridos.length === 5, requeridos.join(' · '));

// ── A4: etiquetas asociadas ─────────────────────────────────────────────
console.log('\nA4 · etiquetas asociadas al control');
await go('api-formularios--etiquetas');
const asociadas = await page.evaluate(() =>
  [...document.querySelectorAll('label[for]')].map((l) => ({
    texto: l.textContent.trim().slice(0, 28),
    existe: Boolean(document.getElementById(l.getAttribute('for'))),
  })),
);
check(
  'todas las etiquetas apuntan a un control que existe',
  asociadas.length >= 4 && asociadas.every((a) => a.existe),
  `${asociadas.length} etiquetas`,
);

// Pulsar el texto marca la casilla: es lo que da el `htmlFor`.
const antes = await page.locator('input[type="checkbox"]').first().isChecked();
await page.getByText('Recargo de equivalencia').click();
await page.waitForTimeout(200);
const despues = await page.locator('input[type="checkbox"]').first().isChecked();
check('pulsar el texto marca la casilla', antes !== despues);

// ── A3: rowClassName y vacío como nodo ──────────────────────────────────
console.log('\nA3 · Table');
await go('api-formularios--tabla-con-estado-por-fila');
const clases = await page.locator('tbody tr').evaluateAll((els) => els.map((e) => e.className));
check(
  'la fila asignada va tachada',
  clases.some((c) => c.includes('line-through')),
);
check(
  'la seleccionada va resaltada',
  clases.some((c) => c.includes('ring-accent')),
);
check('el vacío admite icono y botón', (await page.getByRole('button', { name: /Asignar el primero/ }).count()) === 1);

// ── A5: variantes de Badge ──────────────────────────────────────────────
console.log('\nA5 · Badge');
await go('api-formularios--variantes-de-badge');
const badges = await page.evaluate(() =>
  [...document.querySelectorAll('div')]
    .filter((e) => ['danger', 'error', 'accent', 'teal'].includes(e.textContent.trim()) && e.className.includes('border'))
    .map((e) => [e.textContent.trim(), getComputedStyle(e).backgroundColor, getComputedStyle(e).color]),
);
const igual = (a, b) => a[1] === b[1] && a[2] === b[2];
const de = (n) => badges.find((b) => b[0] === n);
check('danger y error pintan igual', igual(de('danger'), de('error')), `${de('danger')?.[1]} vs ${de('error')?.[1]}`);
check('accent y teal pintan igual', igual(de('accent'), de('teal')), `${de('accent')?.[1]} vs ${de('teal')?.[1]}`);

// ── El campo no se remonta al escribir ──────────────────────────────────
// Input tenía dos marcados distintos y cambiaba de uno a otro en cuanto
// aparecía un complemento: al escribir la primera letra el <input> se
// remontaba y se perdía el foco. Se escribía al vacío.
console.log('\nEl foco aguanta al escribir');
for (const story of [
  'search-input--basico',
  'search-input--con-atajo-y-debounce',
  'input--complementos',
  'input--validación',
]) {
  await go(story);
  const campo = page.locator('input').first();
  if ((await campo.count()) === 0) continue;
  await campo.click();
  await page.keyboard.type('abc', { delay: 60 });
  await page.waitForTimeout(200);
  const enFoco = await page.evaluate(() => document.activeElement?.tagName);
  check(`${story}: no pierde el foco`, enFoco === 'INPUT', `foco en ${enFoco}`);
  check(`${story}: se escriben las 3 letras`, (await campo.inputValue()).toLowerCase().endsWith('abc'), await campo.inputValue());
}

// ── FilterBar sin controles nativos ─────────────────────────────────────
console.log('\nFilterBar');
await go('filter-bar--completa');
const nativos = await page.evaluate(() => ({
  selects: document.querySelectorAll('select').length,
  fechas: document.querySelectorAll('input[type="date"]').length,
}));
check('ningún <select> nativo', nativos.selects === 0, `${nativos.selects}`);
check('ningún input[type=date] nativo', nativos.fechas === 0, `${nativos.fechas}`);
check('el desplegable es el de la librería', (await page.getByRole('combobox').count()) >= 2);

await page.getByRole('combobox').first().click();
await page.waitForTimeout(300);
const opciones = await page.getByRole('option').allInnerTexts();
check('y sus opciones se pintan en el documento', opciones.length === 4, opciones.join('|'));
await page.keyboard.press('Escape');

// ── A1: no queda ningún color fijo en pantalla ──────────────────────────
console.log('\nA1 · colores de estado');
await go('confirm-dialog--peligro');
await page.getByRole('button', { name: /Eliminar factura/ }).click();
await page.waitForTimeout(500);
const iconoTono = await page.evaluate(() => {
  const svg = document.querySelector('[role="dialog"] svg, [role="alertdialog"] svg');
  return svg ? getComputedStyle(svg).color : null;
});
check(
  'el icono del diálogo usa el token de estado, no rose-600',
  iconoTono === 'rgb(220, 38, 38)',
  String(iconoTono),
);

await browser.close();
console.log(failures === 0 ? '\nTodo correcto.' : `\n${failures} comprobaciones fallidas.`);
process.exit(failures ? 1 : 0);
