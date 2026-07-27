/**
 * Comprobación en navegador del Gantt: colocación de las barras, escalas,
 * dependencias, hitos, arrastre y contraste del texto sobre cada barra.
 */
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.LADLE_URL ?? 'http://localhost:61000';
const OUT = '.shots/gantt';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const go = async (story) => {
  await page.goto(`${BASE}/?story=${story}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
};

const barra = (nombre) => page.locator(`[role="button"][aria-label^="${nombre},"]`);

// ── Colocación ──────────────────────────────────────────────────────────
console.log('\nColocación');
await go('gantt--obra');
check('se pinta el diagrama', (await page.getByRole('table').count()) === 1);
check('una barra por tarea (6 barras + 1 hito)', (await page.locator('[role="button"][aria-label*=" al "]').count()) === 6);
check('el hito va como rombo', (await page.locator('[role="img"][aria-label*="hito"]').count()) === 1);

const proyecto = await barra('Redacción del proyecto').boundingBox();
const licencia = await barra('Licencia de obra').boundingBox();
check(
  'la que empieza después queda a la derecha',
  licencia.x > proyecto.x,
  `${Math.round(proyecto.x)} → ${Math.round(licencia.x)}`,
);
check(
  'el ancho es proporcional a la duración',
  // 12 días vs 19 días, misma escala.
  Math.abs(licencia.width / proyecto.width - 19 / 12) < 0.15,
  `${Math.round(proyecto.width)}px (12 d) vs ${Math.round(licencia.width)}px (19 d)`,
);

check('se dibujan las flechas de dependencia', (await page.locator('svg path[marker-end]').count()) === 5);
check('hay marca de hoy', (await page.locator('.bg-\\[var\\(--k-danger\\)\\]').count()) >= 1);
// La regla y la rejilla tienen que cubrir TODO el lienzo y arrancar donde
// arrancan las barras: colocadas en flujo, la semana empieza en lunes y la
// regla entera quedaba desplazada respecto a lo que hay debajo.
const cobertura = await page.evaluate(() => {
  const sc = document.querySelector('[role="table"] .overflow-x-auto');
  const lienzo = sc.firstElementChild;
  const menores = [...lienzo.firstElementChild.children[1].children];
  const rejilla = [...lienzo.children[1].children[0].children];
  const fin = (els) => {
    const u = els[els.length - 1];
    return u.offsetLeft + u.offsetWidth;
  };
  return {
    ancho: lienzo.getBoundingClientRect().width,
    finRegla: fin(menores),
    finRejilla: fin(rejilla),
    mismoOrigen: menores[0].offsetLeft === rejilla[0].offsetLeft,
  };
});
check(
  'la regla cubre todo el lienzo',
  cobertura.finRegla >= cobertura.ancho,
  `${Math.round(cobertura.finRegla)} de ${Math.round(cobertura.ancho)}`,
);
check('la rejilla también', cobertura.finRejilla >= cobertura.ancho);
check('y ambas arrancan donde las barras', cobertura.mismoOrigen);

const filas = await page.locator('[data-fila]').count();
check('la línea de tiempo tiene separadores de fila', filas === 9, `${filas} filas`);

await page.screenshot({ path: `${OUT}/obra-claro.png` });

// ── Contraste del texto sobre la barra ──────────────────────────────────
console.log('\nContraste del texto sobre la barra');
const rel = (c) => {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => (Math.max(rel(a), rel(b)) + 0.05) / (Math.min(rel(a), rel(b)) + 0.05);
const nums = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);

const medidas = await page.locator('[role="button"][aria-label*=" al "]').evaluateAll((els) =>
  els
    .map((el) => {
      const span = el.querySelector('span:last-of-type');
      if (!span || !span.textContent.trim()) return null;
      return {
        texto: span.textContent.trim(),
        bg: getComputedStyle(el).backgroundColor,
        fg: getComputedStyle(span).color,
      };
    })
    .filter(Boolean),
);
for (const m of medidas) {
  const r = ratio(nums(m.bg), nums(m.fg));
  check(`  «${m.texto}»`, r >= 4.5, `${r.toFixed(2)}:1 sobre ${m.bg}`);
}

// ── Escalas ─────────────────────────────────────────────────────────────
console.log('\nEscalas');
await go('gantt--escalas');
const anchoEn = async (etiqueta) => {
  await page.getByRole('radio', { name: etiqueta, exact: true }).click();
  await page.waitForTimeout(400);
  return (await barra('Licencia de obra').boundingBox()).width;
};
const dia = await anchoEn('Día');
const semana = await anchoEn('Semana');
const mes = await anchoEn('Mes');
check('a más zoom, barras más anchas', dia > semana && semana > mes, `día ${Math.round(dia)} · semana ${Math.round(semana)} · mes ${Math.round(mes)}`);
await page.getByRole('radio', { name: 'Día', exact: true }).click();
await page.waitForTimeout(400);
check('la escala de días marca los findes', (await page.locator('.bg-\\[var\\(--bg-hover\\)\\]').count()) > 4);
await page.screenshot({ path: `${OUT}/escala-dia.png` });

// ── Arrastre ────────────────────────────────────────────────────────────
console.log('\nArrastre');
await go('gantt--arrastrable');
const antes = await barra('Acopio de material').boundingBox();
await page.mouse.move(antes.x + antes.width / 2, antes.y + antes.height / 2);
await page.mouse.down();
await page.mouse.move(antes.x + antes.width / 2 + 39, antes.y + antes.height / 2, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(400);
const aviso = await page.locator('strong').innerText();
check('mover la barra avisa con las fechas nuevas', /Acopio de material: \d{4}-\d{2}-\d{2} → \d{4}-\d{2}-\d{2}/.test(aviso), aviso);
const despues = await barra('Acopio de material').boundingBox();
check('y la barra se queda donde se soltó', despues.x > antes.x + 20, `${Math.round(antes.x)} → ${Math.round(despues.x)}`);
check('sin cambiar de duración', Math.abs(despues.width - antes.width) < 2, `${Math.round(antes.width)} → ${Math.round(despues.width)}`);

// Redimensionar por el borde derecho.
const b2 = await barra('Acopio de material').boundingBox();
await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2);
await page.waitForTimeout(150);
await page.mouse.move(b2.x + b2.width - 2, b2.y + b2.height / 2);
await page.mouse.down();
await page.mouse.move(b2.x + b2.width - 2 + 39, b2.y + b2.height / 2, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(400);
const b3 = await barra('Acopio de material').boundingBox();
check('arrastrar el borde alarga', b3.width > b2.width + 20, `${Math.round(b2.width)} → ${Math.round(b3.width)}`);
check('sin mover el inicio', Math.abs(b3.x - b2.x) < 2);

// ── Vacío y modo oscuro ─────────────────────────────────────────────────
console.log('\nVacío y oscuro');
await go('gantt--vacio');
check('el vacío se explica', (await page.getByText('No hay tareas').count()) === 1);

await go('gantt--obra');
await page.evaluate(() => document.documentElement.classList.add('dark'));
await page.waitForTimeout(400);
const fondo = await page.getByRole('table').evaluate((el) => getComputedStyle(el).backgroundColor);
check('en oscuro usa la superficie del tema', fondo === 'rgb(26, 37, 53)', fondo);
await page.screenshot({ path: `${OUT}/obra-oscuro.png` });

await browser.close();
console.log(failures === 0 ? '\nTodo correcto.' : `\n${failures} comprobaciones fallidas.`);
process.exit(failures ? 1 : 0);
