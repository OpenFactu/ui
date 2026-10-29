/**
 * Utilidades comunes de las sondas de navegador (Playwright + Chrome del sistema contra Ladle).
 *
 *   const { run, storyUrl, createChecker, touch } = require('./probe-kit.cjs');      // .cjs
 *   import { run, storyUrl, createChecker } from './probe-kit.cjs';                    // .mjs / .mts
 *
 * Variables de entorno: `CHROME_PATH` (Chrome a usar) y `LADLE_URL` (por defecto http://localhost:61000).
 */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const WIN_CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
/** Chrome a usar: `CHROME_PATH`, o el de Windows si existe; si no, el que traiga Playwright. */
const CHROME = process.env.CHROME_PATH || (fs.existsSync(WIN_CHROME) ? WIN_CHROME : undefined);
const BASE = process.env.LADLE_URL || 'http://localhost:61000';

/** URL de una historia de Ladle. `preview` (por defecto) la abre sin la interfaz de Ladle alrededor. */
function storyUrl(id, { theme, preview = true } = {}) {
  const params = new URLSearchParams({ story: id });
  if (preview) params.set('mode', 'preview');
  if (theme) params.set('theme', theme);
  return `${BASE}/?${params}`;
}

/** Abre Chrome. */
function launch(options = {}) {
  return chromium.launch({ executablePath: CHROME, ...options });
}

/** Junta los errores de página (excepciones sin capturar) en un array que se puede comprobar al final. */
function collectErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** Quita animaciones y transiciones de la página (para medir o capturar sin esperar). */
function freezeMotion(page) {
  return page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
}

/**
 * Comprobaciones con recuento de fallos:
 * - `check(etiqueta, ok, detalle)` síncrona;
 * - `step(etiqueta, fn, { bail })` asíncrona: falla si `fn` lanza (con `bail`, corta la sonda);
 * - `finish()` escribe el resumen y fija el código de salida.
 */
function createChecker() {
  let failures = 0;
  const check = (label, ok, detail = '') => {
    console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${label}${detail ? ` — ${detail}` : ''}`);
    if (!ok) failures += 1;
    return ok;
  };
  const step = async (label, fn, { bail = false } = {}) => {
    try { await fn(); return check(label, true); } catch (error) {
      check(label, false, error instanceof Error ? error.message.split('\n')[0] : String(error));
      if (bail) throw error;
      return false;
    }
  };
  const finish = () => {
    console.log(failures ? `\n${failures} comprobación(es) fallida(s)` : '\nTodo bien');
    process.exitCode = failures ? 1 : 0;
    return failures;
  };
  return { check, step, finish, get failures() { return failures; } };
}

/**
 * Ejecuta una sonda con un navegador y su comprobador: cierra el navegador pase lo que pase, escribe el resumen y deja
 * el código de salida (1 si algo falla o lanza).
 */
async function run(body, options) {
  const browser = await launch(options);
  const checker = createChecker();
  try {
    await body({ browser, ...checker });
  } catch (error) {
    console.error(error);
    checker.check('la sonda terminó sin errores', false);
  } finally {
    await browser.close().catch(() => undefined);
  }
  return checker.finish();
}

/**
 * Gesto táctil real por CDP (genera pointer events con `pointerType: 'touch'`). `points` son `[x, y, esperaMs?]`: el
 * primero empieza el toque y el resto lo mueven.
 */
async function touch(cdp, points, { stepDelay = 0 } = {}) {
  const [first, ...rest] = points;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: first[0], y: first[1] }] });
  for (const [x, y, wait = stepDelay] of rest) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/** Lanzamiento vertical: desde (x, y) recorre `dy` píxeles en `steps` pasos rápidos. */
function flick(cdp, x, y, dy, { steps = 4, stepDelay = 0 } = {}) {
  return touch(cdp, [[x, y], ...Array.from({ length: steps }, (_, i) => [x, y + (dy * (i + 1)) / steps, stepDelay])]);
}

/** Carpeta para capturas: `PROBE_OUT` si está definida; si no, `.shots/<nombre>` (se crea). */
function shotsDir(name) {
  const dir = process.env.PROBE_OUT || path.join('.shots', name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = { CHROME, BASE, storyUrl, launch, collectErrors, freezeMotion, createChecker, run, touch, flick, shotsDir };
