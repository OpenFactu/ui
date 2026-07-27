/**
 * Comprobación en navegador de Kanban, Timeline y Stepper.
 */
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.LADLE_URL ?? 'http://localhost:61000';
const OUT = '.shots/tablero';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};
const go = async (story) => {
  await page.goto(`${BASE}/?story=${story}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
};

const tarjetasDe = (columna) =>
  page.evaluate(
    (c) =>
      [...document.querySelectorAll(`[data-columna="${c}"] [data-tarjeta]`)].map((e) =>
        e.getAttribute('data-tarjeta'),
      ),
    columna,
  );

// ── Kanban ──────────────────────────────────────────────────────────────
console.log('\nKanban');
await go('kanban--tablero');
check('cuatro columnas', (await page.locator('[data-columna]').count()) === 4);
check('la vacía se explica', (await page.getByText('Nada terminado todavía').count()) === 1);
check(
  'el contador enseña el límite',
  (await page.getByTitle(/máximo recomendado/).count()) === 1,
);

const antes = await tarjetasDe('por-hacer');
check('la primera columna arranca con dos', antes.length === 2, antes.join(','));

// Arrastrar la primera tarjeta a la columna de hechas.
const arrastrar = async (desdeSel, hastaSel, dy = 20) => {
  const a = await page.locator(desdeSel).boundingBox();
  const b = await page.locator(hastaSel).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + 12);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + dy, { steps: 14 });
  await page.waitForTimeout(150);
  const marca = await page.locator('[data-insercion]').count();
  await page.mouse.up();
  await page.waitForTimeout(400);
  return marca;
};

const marca = await arrastrar('[data-tarjeta="t1"]', '[data-columna="hechas"]');
check('mientras se arrastra se ve dónde caería', marca === 1, `${marca} marcas`);
const hechas = await tarjetasDe('hechas');
check('soltar la mueve de columna', hechas.includes('t1'), hechas.join(','));
check('y sale de la de origen', !(await tarjetasDe('por-hacer')).includes('t1'));
const aviso = await page.locator('strong').innerText();
check('avisa una vez con columna y posición', /→ hechas \(posición 0\)/.test(aviso), aviso);
await page.screenshot({ path: `${OUT}/kanban.png` });

// Reordenar dentro de la misma columna.
await go('kanban--tablero');
const orden = await tarjetasDe('por-hacer');
// Hay que pasar del centro de la segunda tarjeta para que cuente como
// «después de ella»; quedarse entre las dos es soltarla donde ya estaba.
await arrastrar('[data-tarjeta="t1"]', '[data-tarjeta="t2"]', 60);
const nuevo = await tarjetasDe('por-hacer');
check(
  'reordenar dentro de la columna respeta la posición',
  nuevo.join(',') === orden.slice().reverse().join(','),
  `${orden.join(',')} → ${nuevo.join(',')}`,
);

// Sin `onCardMove` no se arrastra nada.
await go('kanban--solo-lectura');
const antesRO = await tarjetasDe('por-hacer');
await arrastrar('[data-tarjeta="t1"]', '[data-columna="hechas"]');
check('en solo lectura no se mueve nada', (await tarjetasDe('por-hacer')).join(',') === antesRO.join(','));

// ── Timeline ────────────────────────────────────────────────────────────
console.log('\nTimeline');
await go('timeline--historial');
check('un elemento por acontecimiento', (await page.locator('[data-evento]').count()) === 5);
check('agrupado por día', (await page.locator('[data-dia]').count()) === 3);

const dias = await page.locator('[data-dia]').allInnerTexts();
// El encabezado va en versalitas por CSS, así que innerText llega en mayúsculas.
check('el primer grupo es «Hoy»', dias[0].toLowerCase() === 'hoy', dias.join(' · '));
check('y el segundo «Ayer»', dias[1].toLowerCase() === 'ayer', dias.join(' · '));

const fechas = await page.locator('time').allInnerTexts();
check('el más reciente va primero y en relativo', fechas[0] === 'hace 2 h', fechas.join(' · '));
check('los de hace días se dicen en días', fechas.some((f) => /hace \d días/.test(f)), fechas.join(' · '));

const orden2 = await page.locator('[data-evento]').evaluateAll((els) =>
  els.map((e) => e.getAttribute('data-evento')),
);
check('ordenado de más nuevo a más viejo', orden2.join(',') === '5,4,3,2,1', orden2.join(','));
await page.screenshot({ path: `${OUT}/timeline.png` });

await go('timeline--compacto');
check('en compacto no se agrupa', (await page.locator('[data-dia]').count()) === 0);
await go('timeline--vacio');
check('el vacío se explica', (await page.getByText('Todavía no hay actividad').count()) === 1);

// ── Stepper ─────────────────────────────────────────────────────────────
console.log('\nStepper');
await go('stepper--asistente');
const estados = () =>
  page.locator('[data-paso]').evaluateAll((els) => els.map((e) => e.getAttribute('data-estado')));
check(
  'el estado se deduce del paso actual',
  (await estados()).join(',') === 'hecha,actual,pendiente,pendiente',
  (await estados()).join(','),
);
check('el actual se anuncia', (await page.locator('[aria-current="step"]').count()) === 1);

check('los pendientes no se pueden pulsar', (await page.locator('[data-paso] button').count()) === 2);
await page.locator('[data-paso="empresa"] button').click();
await page.waitForTimeout(300);
check(
  'se puede volver a uno ya hecho',
  (await estados()).join(',') === 'actual,pendiente,pendiente,pendiente',
  (await estados()).join(','),
);

await go('stepper--con-error');
check(
  'un paso puede marcarse como fallido',
  (await estados()).join(',') === 'hecha,error,actual,pendiente',
  (await estados()).join(','),
);
check('y hay conectores entre pasos', (await page.locator('[data-conector]').count()) === 3);
await page.screenshot({ path: `${OUT}/stepper.png` });

await go('stepper--vertical');
check('en vertical también sale entero', (await page.locator('[data-paso]').count()) === 4);

await browser.close();
console.log(failures === 0 ? '\nTodo correcto.' : `\n${failures} comprobaciones fallidas.`);
process.exit(failures ? 1 : 0);
