/**
 * Segunda tanda de comprobaciones del Toast: móvil, gesto de descarte, formas y
 * animaciones de salida.
 *
 *   node scripts/probe-toast-mobile.mjs
 *
 * El gesto se envía por CDP (`Input.dispatchTouchEvent`) y no con eventos
 * sintéticos: así el navegador genera pointer events de verdad, con
 * `pointerType: 'touch'` y captura de puntero, que es lo que usa el componente.
 */
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.LADLE_URL ?? 'http://localhost:61000';
const OUT = '.shots/toast';
const PHONE = { width: 390, height: 844 };

fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const browser = await chromium.launch({ executablePath: CHROME });

// ── Móvil ───────────────────────────────────────────────────────────────
console.log('\nMóvil (390 × 844, táctil)');
const phone = await browser.newContext({
  viewport: PHONE,
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 2,
});
const page = await phone.newPage();
const toasts = () => page.locator('[role="status"], [role="alert"]');

await page.goto(`${BASE}/?story=toast--movil`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Error', exact: true }).click();
await page.waitForTimeout(400);

const box = await toasts().first().boundingBox();
check(
  'no se sale de la pantalla',
  box.x >= 0 && box.x + box.width <= PHONE.width,
  `x=${Math.round(box.x)} ancho=${Math.round(box.width)} de ${PHONE.width}`,
);
check(
  'ocupa el ancho con un margen a cada lado',
  Math.round(box.x) === 16 && Math.round(box.x + box.width) === PHONE.width - 16,
  `márgenes ${Math.round(box.x)} / ${Math.round(PHONE.width - box.x - box.width)}`,
);
check('anclado abajo', box.y > PHONE.height / 2, `y=${Math.round(box.y)}`);
await page.screenshot({ path: `${OUT}/movil.png` });

// ── Deslizar para descartar ─────────────────────────────────────────────
console.log('\nGesto de descarte');
const cdp = await phone.newCDPSession(page);
const swipe = async (fromX, y, toX, steps = 8) => {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: fromX, y }],
  });
  for (let i = 1; i <= steps; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: fromX + ((toX - fromX) * i) / steps, y }],
    });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};

const centre = async () => {
  const b = await toasts().first().boundingBox();
  return [b.x + b.width / 2, b.y + b.height / 2];
};

// Arrastre corto: vuelve a su sitio.
let [cx, cy] = await centre();
await swipe(cx, cy, cx + 30);
await page.waitForTimeout(400);
check('un arrastre corto no lo cierra', (await toasts().count()) === 1);

// Arrastre largo: se va.
[cx, cy] = await centre();
await swipe(cx, cy, cx + 160);
await page.waitForTimeout(500);
check('deslizando a la derecha se descarta', (await toasts().count()) === 0);

await page.getByRole('button', { name: 'Info', exact: true }).click();
await page.waitForTimeout(400);
[cx, cy] = await centre();
await swipe(cx, cy, cx - 160);
await page.waitForTimeout(500);
check('y a la izquierda también', (await toasts().count()) === 0);

// El temporizador se detiene mientras el dedo está encima.
await page.getByRole('button', { name: 'Éxito', exact: true }).click();
await page.waitForTimeout(300);
[cx, cy] = await centre();
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
await page.waitForTimeout(6000);
const vivo = (await toasts().count()) === 1;
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
check('con el dedo encima no se cierra', vivo);
await phone.close();

// ── Formas y contraste del relleno ──────────────────────────────────────
const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const d = await desk.newPage();
const dToasts = () => d.locator('[role="status"], [role="alert"]');

const rel = (rgb) => {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => (Math.max(rel(a), rel(b)) + 0.05) / (Math.min(rel(a), rel(b)) + 0.05);
/** Acepta `#rgb`, `#rrggbb`, `rgb(...)` y `rgba(...)`; devuelve [r,g,b,a]. */
const parse = (str) => {
  const s = str.trim();
  if (s.startsWith('#')) {
    const h = s.slice(1);
    const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).concat(1);
  }
  const n = s.match(/[\d.]+/g).map(Number);
  return [n[0], n[1], n[2], n.length > 3 ? n[3] : 1];
};

/** Superpone `fg` (con alfa) sobre `bg` opaco. */
const over = (fg, bg) => fg.slice(0, 3).map((c, i) => c * fg[3] + bg[i] * (1 - fg[3]));

/** El Select de la librería es un combobox propio, no un <select> nativo. */
const pick = async (option) => {
  await d.getByRole('combobox').first().click();
  await d.waitForTimeout(250);
  await d.getByRole('option', { name: new RegExp(option, 'i') }).click();
  await d.waitForTimeout(300);
};

for (const modo of ['claro', 'oscuro']) {
  console.log(`\nFormas (modo ${modo})`);
  for (const variante of ['accent', 'soft', 'solid', 'outline']) {
    await d.goto(`${BASE}/?story=toast--formas`, { waitUntil: 'networkidle' });
    await d.waitForTimeout(300);
    if (modo === 'oscuro') {
      await d.evaluate(() => document.documentElement.classList.add('dark'));
      await d.waitForTimeout(200);
    }
    if (variante !== 'accent') await pick(variante);
    for (const t of ['Éxito', 'Error', 'Info', 'Aviso']) {
      await d.getByRole('button', { name: t, exact: true }).click();
      await d.waitForTimeout(90);
    }
    await d.waitForTimeout(300);
    check(`${variante}: salen los 4`, (await dToasts().count()) === 4);
    await d.screenshot({ path: `${OUT}/forma-${variante}-${modo}.png` });

    // Contraste real del texto sobre el fondo que le toca a cada forma. En
    // 'soft' el tinte es translúcido, así que hay que componerlo sobre la
    // superficie de tarjeta antes de medir; medir el tinte suelto mentiría.
    const medidas = await dToasts().evaluateAll((els) =>
      els.map((el) => {
        const s = getComputedStyle(el);
        const p = el.querySelector('p');
        return {
          base: s.backgroundColor,
          tinte: s.getPropertyValue('--k-tone-bg').trim(),
          soft: s.backgroundImage !== 'none',
          fg: getComputedStyle(p).color,
        };
      }),
    );
    for (const m of medidas) {
      let bg = parse(m.base).slice(0, 3);
      if (m.soft && m.tinte) bg = over(parse(m.tinte), bg);
      const r = ratio(bg, parse(m.fg).slice(0, 3));
      check(
        `  ${variante}: texto legible sobre ${bg.map(Math.round).join(',')}`,
        r >= 4.5,
        `${r.toFixed(2)}:1`,
      );
    }
  }
}

// ── Animaciones de salida ───────────────────────────────────────────────
console.log('\nAnimaciones de salida');
for (const [opcion, esperado] of [
  ['Fade', /opacity-0/],
  ['Scale', /scale-95/],
  ['Lift', /-translate-y-3/],
]) {
  await d.goto(`${BASE}/?story=toast--animaciones-de-salida`, { waitUntil: 'networkidle' });
  await d.waitForTimeout(300);
  await pick(opcion);
  await d.getByRole('button', { name: 'Éxito', exact: true }).click();
  await d.waitForTimeout(400);
  await d.getByRole('button', { name: 'Cerrar aviso' }).click();
  await d.waitForTimeout(60);
  const clases = await dToasts().first().getAttribute('class').catch(() => '');
  check(`${opcion} aplica su clase de salida`, esperado.test(clases ?? ''), (clases ?? '').slice(-60));
  await d.waitForTimeout(600);
  check(`${opcion} termina de irse`, (await dToasts().count()) === 0);
}

await browser.close();
console.log(failures === 0 ? '\nTodo correcto.' : `\n${failures} comprobaciones fallidas.`);
process.exit(failures ? 1 : 0);
