/**
 * Comprobación en navegador del Toast: que aparece, que se anuncia, que la
 * cuenta atrás se detiene con el ratón encima y que la cola respeta el máximo.
 *
 *   node scripts/probe-toast.mjs
 */
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.LADLE_URL ?? 'http://localhost:61000';
const OUT = '.shots/toast';

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const go = async (story) => {
  await page.goto(`${BASE}/?story=${story}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
};
const toasts = () => page.locator('[role="status"], [role="alert"]');

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

/**
 * Espera a que haya `n` avisos en vez de dormir una cantidad fija: la salida
 * dura 200 ms y una espera al borde del límite falla de vez en cuando sin que
 * haya nada roto.
 */
const checkCount = async (label, n, timeout = 2000) => {
  const deadline = Date.now() + timeout;
  let count = await toasts().count();
  while (count !== n && Date.now() < deadline) {
    await page.waitForTimeout(50);
    count = await toasts().count();
  }
  check(label, count === n, `${count} visibles`);
};

// ── 1. Los cuatro tipos, y que salgan en un portal fuera del árbol ──────
console.log('\nLos cuatro tipos');
await go('toast--los-cuatro-tipos');
for (const name of ['Éxito', 'Error', 'Info', 'Aviso']) {
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForTimeout(120);
}
check('salen los 4', (await toasts().count()) === 4, `${await toasts().count()} visibles`);

const roles = await toasts().evaluateAll((els) =>
  els.map((e) => `${e.getAttribute('role')}/${e.getAttribute('aria-live')}`),
);
check(
  'el error y el aviso interrumpen; el resto es educado',
  roles.filter((r) => r === 'alert/assertive').length === 2 &&
    roles.filter((r) => r === 'status/polite').length === 2,
  roles.join(' '),
);

const inBody = await toasts()
  .first()
  .evaluate((el) => el.parentElement?.parentElement === document.body);
check('se monta en un portal colgado de body', inBody);

await page.screenshot({ path: `${OUT}/tipos-claro.png` });
await page.evaluate(() => document.documentElement.classList.add('dark'));
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/tipos-oscuro.png` });
await page.evaluate(() => document.documentElement.classList.remove('dark'));

// ── 2. Se cierran solos, salvo con el ratón encima ──────────────────────
console.log('\nCuenta atrás');
await go('toast--los-cuatro-tipos');
await page.getByRole('button', { name: 'Éxito', exact: true }).click();
await page.waitForTimeout(5100);
await checkCount('se cierra solo a los 5 s', 0);

await page.getByRole('button', { name: 'Éxito', exact: true }).click();
await page.waitForTimeout(200);
await toasts().first().hover();
await page.waitForTimeout(6000);
check('con el ratón encima no se cierra', (await toasts().count()) === 1);
await page.mouse.move(640, 700);
await page.waitForTimeout(5100);
await checkCount('al retirar el ratón se reanuda', 0);

// ── 3. Cerrar a mano y la acción ────────────────────────────────────────
console.log('\nCerrar y acción');
await go('toast--titulo-accion-y-fijo');
await page.getByRole('button', { name: 'Fijo (sin cuenta atrás)' }).click();
await page.waitForTimeout(6000);
check('duration 0 lo deja fijo', (await toasts().count()) === 1);
await page.getByRole('button', { name: 'Cerrar aviso' }).click();
await checkCount('la X lo cierra', 0);

await page.getByRole('button', { name: 'Con acción' }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/accion.png` });
await page.getByRole('button', { name: 'Deshacer' }).click();
await page.waitForTimeout(300);
const texts = await toasts().allInnerTexts();
check('la acción cierra el suyo y lanza el nuevo', texts.length === 1 && texts[0].includes('Restaurada'), texts.join('|'));

// ── 4. La promesa reutiliza el mismo aviso ──────────────────────────────
console.log('\nPromesa');
await go('toast--promesa');
await page.getByRole('button', { name: 'Promesa que va bien' }).click();
await page.waitForTimeout(400);
check('mientras tanto hay uno de carga', (await toasts().count()) === 1, (await toasts().allInnerTexts()).join(''));
await page.waitForTimeout(1600);
const done = await toasts().allInnerTexts();
check('al terminar lo sustituye, no apila', done.length === 1 && done[0].includes('correctamente'), done.join('|'));
await page.waitForTimeout(5100);
await checkCount('y el resultado sí se cierra solo', 0);

await page.getByRole('button', { name: 'Promesa que falla' }).click();
await page.waitForTimeout(2100);
const failed = await toasts().allInnerTexts();
check('el fallo muestra el motivo', failed.length === 1 && failed[0].includes('tiempo de espera'), failed.join('|'));

// ── 5. Cola y deduplicado ───────────────────────────────────────────────
console.log('\nCola y deduplicado');
await go('toast--cola-y-deduplicado');
await page.getByRole('button', { name: 'Lanzar 7 de golpe' }).click();
await page.waitForTimeout(300);
check('el máximo se respeta', (await toasts().count()) === 3, `${await toasts().count()} visibles`);
check('avisa de los que esperan', (await page.getByText('+4 en espera').count()) === 1);
await page.screenshot({ path: `${OUT}/cola.png` });

await go('toast--cola-y-deduplicado');
for (let i = 0; i < 5; i += 1) {
  await page.getByRole('button', { name: 'Repetir el mismo (id fijo)' }).click();
  await page.waitForTimeout(80);
}
check('un id repetido no apila', (await toasts().count()) === 1, `${await toasts().count()} visibles`);

// ── 6. Posiciones ───────────────────────────────────────────────────────
console.log('\nPosiciones');
await go('toast--posiciones');
await page.getByRole('button', { name: 'Éxito', exact: true }).click();
await page.waitForTimeout(250);
const box = await toasts().first().boundingBox();
check('arriba a la derecha', box.y < 200 && box.x > 640, `x=${Math.round(box.x)} y=${Math.round(box.y)}`);

await browser.close();
console.log(failures === 0 ? '\nTodo correcto.' : `\n${failures} comprobaciones fallidas.`);
process.exit(failures ? 1 : 0);
