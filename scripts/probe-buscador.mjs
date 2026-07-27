/**
 * Comprobación del buscador unificado: que la caja de cabecera abra la paleta,
 * que los resultados lleven código a la derecha y atajos, que el «ver todos»
 * funcione y que las búsquedas recientes se recuerden.
 */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.LADLE_URL ?? 'http://localhost:61000';

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};
const go = async (story) => {
  await page.goto(`${BASE}/?story=${story}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
};
const paleta = () => page.locator('[role="listbox"]');
const caja = () => page.getByRole('button', { name: /Buscar interlocutores/ });

// ── Abrir de tres maneras ───────────────────────────────────────────────
console.log('\nAbrir la paleta');
await go('buscador-global--cabecera');
// El botón entero contiene ese texto, así que se mira el <kbd>, no la página.
check(
  'la cabecera lleva el chip del atajo',
  (await caja().locator('kbd').innerText()) === 'Ctrl+K',
  await caja().locator('kbd').innerText(),
);
check('y no es un campo de texto', (await page.locator('header input, input[type="search"]').count()) === 0);

await caja().click();
await page.waitForTimeout(300);
check('pulsarla abre la paleta', (await paleta().count()) === 1);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check('Escape la cierra', (await paleta().count()) === 0);

await caja().focus();
await page.keyboard.press('t');
await page.waitForTimeout(300);
check('teclear sobre la caja también la abre', (await paleta().count()) === 1);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

await page.keyboard.press('Control+k');
await page.waitForTimeout(300);
check('Ctrl+K la abre', (await paleta().count()) === 1);

// ── Resultados: secciones, código a la derecha, atajos ──────────────────
console.log('\nResultados');
await page.keyboard.type('tor');
await page.waitForTimeout(400);
const filas = await paleta().locator('[role="option"]').allInnerTexts();
check('filtra por texto', filas.length === 1, filas.join(' | '));
check('y enseña el código a la derecha', filas[0]?.includes('GEN-000001'), filas[0]);

await page.keyboard.press('Control+a');
await page.keyboard.type('factura');
await page.waitForTimeout(400);
const conAtajo = await paleta().locator('kbd').allInnerTexts();
check('los comandos llevan su atajo', conAtajo.join('+') === 'Ctrl+N', conAtajo.join('+'));

// Buscar por el código, no solo por el nombre.
await page.keyboard.press('Control+a');
await page.keyboard.type('B12345678');
await page.waitForTimeout(400);
const porCodigo = await paleta().locator('[role="option"]').allInnerTexts();
check('se puede buscar por código', porCodigo.length === 1 && porCodigo[0].includes('Acme'), porCodigo.join('|'));

// ── Ver todos ───────────────────────────────────────────────────────────
console.log('\nVer todos');
await page.keyboard.press('Control+a');
await page.keyboard.type('a');
await page.waitForTimeout(400);
check('cada grupo con acción trae su «ver todos»', (await paleta().getByRole('button', { name: 'Ver todos' }).count()) >= 1);
await paleta().getByRole('button', { name: 'Ver todos' }).first().click();
await page.waitForTimeout(400);
check('pulsarlo cierra la paleta', (await paleta().count()) === 0);
check('y ejecuta la acción', (await page.locator('strong').innerText()).includes('Listado'), await page.locator('strong').innerText());

// ── Elegir un resultado ─────────────────────────────────────────────────
console.log('\nElegir con el teclado');
await page.keyboard.press('Control+k');
// La paleta enfoca su campo un instante después de abrirse: teclear antes
// manda las letras al vacío.
await page.waitForTimeout(400);
await page.keyboard.type('tuercas');
await page.waitForTimeout(400);
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
check('Intro abre el resultado resaltado', (await page.locator('strong').innerText()) === 'Tuercas M8');
check('y cierra la paleta', (await paleta().count()) === 0);

// ── Recientes ───────────────────────────────────────────────────────────
console.log('\nBúsquedas recientes');
await page.keyboard.press('Control+k');
await page.waitForTimeout(400);
check('con la caja vacía ofrece lo último buscado', (await page.getByText('Búsquedas recientes').count()) === 1);
const recientes = await paleta().locator('button').allInnerTexts();
check('y ahí está la búsqueda anterior', recientes.some((t) => t.includes('tuercas')), recientes.join('|'));

await paleta().getByRole('button', { name: 'tuercas' }).click();
await page.waitForTimeout(400);
check('pulsar una reciente la vuelve a buscar', (await paleta().locator('[role="option"]').count()) === 1);

await page.keyboard.press('Control+a');
await page.keyboard.press('Backspace');
await page.waitForTimeout(300);
await paleta().getByRole('button', { name: 'Borrar' }).click();
await page.waitForTimeout(300);
check('se pueden borrar', (await page.getByText('Búsquedas recientes').count()) === 0);

// Sobreviven a recargar: se guardan en el navegador.
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check('la paleta se cerró antes de seguir', (await paleta().count()) === 0);
await page.keyboard.press('Control+k');
await page.waitForTimeout(400);
check('y vuelve a abrirse', (await paleta().count()) === 1);
await page.keyboard.type('caja');
await page.waitForTimeout(400);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await go('buscador-global--cabecera');
await page.keyboard.press('Control+k');
await page.waitForTimeout(400);
check(
  'sobreviven a recargar la página',
  (await paleta().locator('button').allInnerTexts()).some((t) => t.includes('caja')),
);

await browser.close();
console.log(failures === 0 ? '\nTodo correcto.' : `\n${failures} comprobaciones fallidas.`);
process.exit(failures ? 1 : 0);
