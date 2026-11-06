/**
 * ¿Se ve el subrayado de la pestaña activa? Es el indicador que viaja (`.k-indicator`), no el borde del botón. Se
 * compara su rectángulo con el de la fila: lo que el navegador recorta (al deslizarse) no lo ve nadie, aunque la clase
 * esté puesta.
 */
import { chromium } from 'playwright-core';

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.LADLE_URL ?? 'http://localhost:61000';

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

/**
 * Píxeles visibles del borde inferior de la pestaña activa. Se compara el
 * rectángulo del botón con el del contenedor que desplaza: lo que caiga fuera
 * está recortado y no lo ve nadie.
 */
const medir = async () =>
  page.evaluate(() => {
    const activo = document.querySelector('[role="tab"][aria-selected="true"]');
    const lista = activo.closest('[role="tablist"]');
    const indicador = lista.querySelector('.k-indicator');
    const s = getComputedStyle(indicador);
    const b = indicador.getBoundingClientRect();
    const recorta = getComputedStyle(lista).overflowY;
    // Lo que recorta la fila es su caja de relleno: sin el borde inferior.
    const c = lista.getBoundingClientRect();
    const fondo = recorta === 'visible' ? Infinity : c.bottom - parseFloat(getComputedStyle(lista).borderBottomWidth);
    const visible = Math.max(0, Math.min(b.bottom, fondo) - b.top);
    const a = activo.getBoundingClientRect();
    return {
      color: s.backgroundColor,
      grosor: b.height,
      visible,
      debajo: Math.abs(b.left - a.left) < 1 && Math.abs(b.width - a.width) < 1,
      recorta,
    };
  });

for (const [nombre, story, width] of [
  ['escritorio, caben todas', 'tabs--underline', 900],
  ['escritorio, con menú «Más»', 'tabs--subrayado-desplazable', 900],
  ['escritorio, overflow="scroll"', 'tabs--deslizable', 900],
  ['móvil, se desliza', 'tabs--subrayado-desplazable', 375],
]) {
  await page.setViewportSize({ width, height: 600 });
  await page.goto(`${BASE}/?story=${story}&mode=preview`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const m = await medir();
  console.log(`\n${nombre} (overflow-y: ${m.recorta})`);
  check('está bajo la pestaña activa', m.debajo);
  check('el subrayado tiene color de acento', /rgb\(13, ?148, ?136\)/.test(m.color), m.color);
  check(
    'y se ve entero',
    m.visible >= m.grosor,
    `${m.visible}px visibles de ${m.grosor}px`,
  );
}

await browser.close();
console.log(failures === 0 ? '\nTodo correcto.' : `\n${failures} comprobaciones fallidas.`);
process.exit(failures ? 1 : 0);
