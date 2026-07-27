/**
 * Comprobación en navegador del Calendar: colocación por hora, vista de mes,
 * arrastre, programar desde la cola y contraste del texto sobre el bloque.
 */
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.LADLE_URL ?? 'http://localhost:61000';
const OUT = '.shots/calendar';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};
const go = async (story) => {
  await page.goto(`${BASE}/?story=${story}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
};
const bloque = (id) => page.locator(`[data-evento="${id}"]`);

// ── Semana: cada bloque en su hora y con su duración ────────────────────
console.log('\nSemana');
await go('calendar--semana');
check('se pinta la rejilla horaria', (await page.getByText('07:00').count()) >= 1);

const hormigon = await bloque('hormigon').boundingBox();
const revision = await bloque('revision').boundingBox();
check(
  'una hora mide la mitad que dos',
  Math.abs(revision.height / hormigon.height - 2) < 0.15,
  `${Math.round(hormigon.height)}px (1 h) vs ${Math.round(revision.height)}px (2 h)`,
);
check(
  'el del miércoles va a la derecha del martes',
  hormigon.x > revision.x,
  `mar ${Math.round(revision.x)} · mié ${Math.round(hormigon.x)}`,
);
check(
  'el de las 07:00 va más arriba que el de las 09:00',
  hormigon.y < revision.y,
  `07:00 y=${Math.round(hormigon.y)} · 09:00 y=${Math.round(revision.y)}`,
);

const visita = await bloque('visita').boundingBox();
check('el de las 16:30 queda por debajo del de las 09:00', visita.y > revision.y);
check('el de todo el día va en la banda superior', (await page.getByText('Cierre por inventario').count()) === 1);
check('hay línea de la hora actual', (await page.locator('[data-ahora]').count()) === 1);
await page.screenshot({ path: `${OUT}/semana-claro.png` });

// ── Contraste del texto sobre el bloque ─────────────────────────────────
console.log('\nContraste del texto sobre el bloque');
const rel = (c) => {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => (Math.max(rel(a), rel(b)) + 0.05) / (Math.min(rel(a), rel(b)) + 0.05);
const nums = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);

for (const modo of ['claro', 'oscuro']) {
  await go('calendar--semana');
  if (modo === 'oscuro') {
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(300);
  }
  const medidas = await page.locator('[data-evento]').evaluateAll((els) =>
    els.map((el) => {
      const s = getComputedStyle(el);
      return [el.getAttribute('data-evento'), s.backgroundColor, s.color];
    }),
  );
  for (const [id, bg, fg] of medidas) {
    const r = ratio(nums(bg), nums(fg));
    check(`  ${modo}: «${id}»`, r >= 4.5, `${r.toFixed(2)}:1`);
  }
  if (modo === 'oscuro') await page.screenshot({ path: `${OUT}/semana-oscuro.png` });
}

// ── Mes ─────────────────────────────────────────────────────────────────
console.log('\nMes');
await go('calendar--mes');
check('la rejilla del mes son 6 semanas', (await page.locator('.grid-rows-6 > div').count()) === 42);
const dia22 = await page.evaluate(() => {
  const celdas = [...document.querySelectorAll('.grid-rows-6 > div')];
  const c = celdas.find((x) => x.firstElementChild?.textContent.trim() === '22');
  return c ? [...c.querySelectorAll('[data-evento]')].map((e) => e.getAttribute('data-evento')) : null;
});
check('los eventos caen en la casilla de su día', dia22 && dia22.includes('hormigon'), String(dia22));
check('con «+N más» al desbordar', (await page.getByText(/\+\d+ más/).count()) >= 1);
await page.screenshot({ path: `${OUT}/mes.png` });

// ── Arrastre ────────────────────────────────────────────────────────────
console.log('\nArrastre');
await go('calendar--arrastrable');
const arrastrar = async (caja, dx, dy) => {
  await page.mouse.move(caja.x + caja.width / 2, caja.y + Math.min(10, caja.height / 2));
  await page.mouse.down();
  await page.mouse.move(caja.x + caja.width / 2 + dx, caja.y + Math.min(10, caja.height / 2) + dy, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
};

const antes = await bloque('visita').boundingBox();
await arrastrar(antes, 0, 72); // dos horas hacia abajo
const aviso = await page.locator('strong').innerText();
check('mover avisa una vez con las fechas nuevas', /Visita de obra: \d\d\/\d\d \d\d:\d\d → \d\d\/\d\d \d\d:\d\d/.test(aviso), aviso);
const despues = await bloque('visita').boundingBox();
check('y el bloque baja', despues.y > antes.y + 50, `${Math.round(antes.y)} → ${Math.round(despues.y)}`);
check('sin cambiar de duración', Math.abs(despues.height - antes.height) < 2);

// Redimensionar por el borde inferior.
const b2 = await bloque('visita').boundingBox();
await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2);
await page.waitForTimeout(150);
await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height - 2);
await page.mouse.down();
await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height - 2 + 36, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(400);
const b3 = await bloque('visita').boundingBox();
check('estirar alarga el bloque', b3.height > b2.height + 20, `${Math.round(b2.height)} → ${Math.round(b3.height)}`);
check('sin mover el inicio', Math.abs(b3.y - b2.y) < 2, `${Math.round(b2.y)} → ${Math.round(b3.y)}`);

// ── Programar desde la cola ─────────────────────────────────────────────
console.log('\nSin programar');
await go('calendar--arrastrable');
check('la cola arranca con dos', (await page.locator('[data-sin-programar]').count()) === 2);
const tarjeta = await page.locator('[data-sin-programar="sin-1"]').boundingBox();
const destino = await page.locator('[data-evento="revision"]').boundingBox();
await page.mouse.move(tarjeta.x + tarjeta.width / 2, tarjeta.y + tarjeta.height / 2);
await page.mouse.down();
await page.mouse.move(destino.x + destino.width / 2, destino.y + 60, { steps: 14 });
await page.mouse.up();
await page.waitForTimeout(500);
check('arrastrarla al calendario la programa', (await page.locator('[data-sin-programar]').count()) === 1);
check('y aparece como bloque', (await bloque('sin-1').count()) === 1);

// ── Navegación y vacío ──────────────────────────────────────────────────
console.log('\nNavegación y vacío');
await go('calendar--vacio');
check('el vacío se explica', (await page.getByText('No hay nada en estas fechas').count()) === 1);
check('y la cola vacía también', (await page.getByText('No queda nada sin programar').count()) === 1);

await go('calendar--arrastrable');
const titulo = () => page.getByText(/^Semana del /).innerText();
const tituloAntes = await titulo();
await page.getByRole('button', { name: 'Semana siguiente' }).click();
await page.waitForTimeout(300);
const tituloDespues = await titulo();
check('la flecha cambia de semana', tituloAntes !== tituloDespues, `${tituloAntes} → ${tituloDespues}`);
await page.getByRole('radio', { name: 'Mes' }).click();
await page.waitForTimeout(400);
check('el selector cambia a mes', (await page.locator('.grid-rows-6').count()) === 1);

await browser.close();
console.log(failures === 0 ? '\nTodo correcto.' : `\n${failures} comprobaciones fallidas.`);
process.exit(failures ? 1 : 0);
