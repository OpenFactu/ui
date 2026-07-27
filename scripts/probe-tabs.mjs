/**
 * ¿Se ve el subrayado de la pestaña activa? Se mide leyendo los píxeles de la
 * captura justo debajo del texto, no mirando las clases: una clase aplicada que
 * el navegador recorta sigue siendo un subrayado invisible.
 */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
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
    const scroller = activo.closest('.overflow-x-auto') ?? lista;
    const s = getComputedStyle(activo);
    const b = activo.getBoundingClientRect();
    const c = scroller.getBoundingClientRect();
    const grosor = parseFloat(s.borderBottomWidth);
    // Parte del borde que queda dentro del área visible del scroller.
    const visible = Math.max(0, Math.min(b.bottom, c.bottom) - (b.bottom - grosor));
    return {
      color: s.borderBottomColor,
      grosor,
      visible,
      recorta: getComputedStyle(scroller).overflowY,
    };
  });

for (const [nombre, story] of [
  ['sin scrollable', 'tabs--underline'],
  ['con scrollable', 'tabs--subrayado-desplazable'],
]) {
  await page.goto(`${BASE}/?story=${story}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const m = await medir();
  console.log(`\n${nombre} (overflow-y: ${m.recorta})`);
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
