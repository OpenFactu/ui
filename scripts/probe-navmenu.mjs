/**
 * Comprobación en navegador del NavMenu: agrupado, teclado de barra de menús,
 * distintivos y que el desplegable no lo recorte el scroll de la barra.
 */
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.LADLE_URL ?? 'http://localhost:61000';
const OUT = '.shots/navmenu';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 700 } });

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const go = async (story) => {
  await page.goto(`${BASE}/?story=${story}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
};

const barra = () => page.getByRole('menubar');
const panel = () => page.locator('[role="menu"]');

// ── Agrupado ────────────────────────────────────────────────────────────
console.log('\nAgrupado');
await go('nav-menu--modulo');
const enBarra = await barra().locator('> button, > *').evaluateAll((els) =>
  els.map((e) => e.textContent.trim()),
);
check(
  'los sueltos quedan sueltos y los agrupados se pliegan',
  enBarra.length === 6,
  `${enBarra.length} entradas: ${enBarra.join(' · ')}`,
);
check('ningún desplegable abierto al cargar', (await panel().count()) === 0);

// ── Abrir, elegir y estado activo ───────────────────────────────────────
console.log('\nAbrir y elegir');
await page.getByRole('menuitem', { name: /Tiempo y turnos/ }).click();
await page.waitForTimeout(300);
check('se abre el panel', (await panel().count()) === 1);
const items = await panel().getByRole('menuitem').allInnerTexts();
check('lleva las 5 secciones del grupo', items.length === 5, items.length + ' ítems');
check(
  'con su distintivo BETA',
  items.every((t) => t.includes('BETA')),
);
await page.screenshot({ path: `${OUT}/abierto-claro.png` });

const anchoPanel = (await panel().boundingBox()).width;
check('el panel no sale a ancho de pantalla', anchoPanel > 150 && anchoPanel < 420, `${Math.round(anchoPanel)}px`);

await panel().getByRole('menuitem', { name: /Kioskos/ }).click();
await page.waitForTimeout(300);
check('al elegir se cierra', (await panel().count()) === 0);
check('y queda seleccionada', (await page.locator('strong').innerText()) === 'kiosks');
const grupoActivo = await page
  .getByRole('menuitem', { name: /Tiempo y turnos/ })
  .evaluate((el) => getComputedStyle(el).color);
check('el grupo que la contiene se resalta', /13, ?148, ?136/.test(grupoActivo), grupoActivo);

// ── Teclado ─────────────────────────────────────────────────────────────
console.log('\nTeclado');
await go('nav-menu--modulo');
await page.getByRole('menuitem', { name: 'Empleados' }).focus();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(150);
check(
  'flecha derecha pasa al siguiente',
  (await page.evaluate(() => document.activeElement.textContent.trim())) === 'Departamentos',
);
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(300);
check('flecha abajo despliega el grupo', (await panel().count()) === 1);
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
check('se navega con Enter', (await page.locator('strong').innerText()) === 'payroll-concepts');
check('y el panel se cierra', (await panel().count()) === 0);

await page.getByRole('menuitem', { name: /Nóminas/ }).focus();
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(250);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check('Escape cierra sin elegir', (await panel().count()) === 0);

// ── Deshabilitado ───────────────────────────────────────────────────────
console.log('\nDeshabilitado');
await go('nav-menu--distintivos');
const pronto = page.getByRole('menuitem', { name: /Próximamente/ });
check('el deshabilitado no se puede pulsar', await pronto.isDisabled());

// ── Barra estrecha: el panel se portalea, no lo recorta el scroll ───────
console.log('\nBarra estrecha');
await go('nav-menu--barra-estrecha');
await page.getByRole('menuitem', { name: /Incidencias/ }).click();
await page.waitForTimeout(350);
const p = await panel().boundingBox();
const b = await barra().boundingBox();
// boundingBox no trae `bottom`: hay que sumarlo.
const abajo = (r) => r.y + r.height;
check(
  'el panel se sale de la barra sin recortarse',
  abajo(p) > abajo(b),
  `panel ${Math.round(abajo(p))} vs barra ${Math.round(abajo(b))}`,
);
check('y cabe en la ventana', p.x >= 0 && p.x + p.width <= 1280, `x=${Math.round(p.x)} w=${Math.round(p.width)}`);
await page.screenshot({ path: `${OUT}/estrecha.png` });

// ── Modo oscuro ─────────────────────────────────────────────────────────
console.log('\nModo oscuro');
await go('nav-menu--modulo');
await page.evaluate(() => document.documentElement.classList.add('dark'));
await page.getByRole('menuitem', { name: /Avanzado\+/ }).click();
await page.waitForTimeout(350);
const fondo = await panel().evaluate((el) => getComputedStyle(el).backgroundColor);
check('el panel usa la superficie del tema', fondo === 'rgb(26, 37, 53)', fondo);
await page.screenshot({ path: `${OUT}/abierto-oscuro.png` });

await browser.close();
console.log(failures === 0 ? '\nTodo correcto.' : `\n${failures} comprobaciones fallidas.`);
process.exit(failures ? 1 : 0);
