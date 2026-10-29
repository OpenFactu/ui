/**
 * Foco del tema en campos compuestos (con Ladle en marcha). Con un tema que define su propio anillo de foco
 * (`data-k-focus`, p. ej. keirost-mono) ese anillo va a todo lo enfocable, pero un input SIN borde propio que vive
 * dentro de un campo con borde (buscador de la paleta, código hexadecimal, buscador del mapa, chips…) no debe
 * dibujarlo: el foco ya lo marca su contenedor. Si sale, se ve un rectángulo encima del campo.
 *
 * Además, el anillo no puede quedar recortado: una pestaña, una opción o una fila dentro de un contenedor desplazable u
 * `overflow: hidden` con el anillo por fuera solo enseña una raya en un lado. Esos lo llevan por dentro (por su rol o
 * con `data-k-focus-inset`).
 *
 * Recorre TODAS las historias, enfoca cada campo de texto visible sin borde y cada elemento enfocable, y abre a mano los
 * que no se ven al cargar (la paleta de comandos).
 *
 *   node scripts/probe-focus-inputs.cjs [filtro]
 */
const path = require('node:path');
const { launch, BASE, run } = require('./probe-kit.cjs');

const themeModule = `/@fs/${path.resolve(__dirname, '../src/theme/index.ts').replace(/\\/g, '/')}`;
const filtro = process.argv.slice(2).find((a) => !a.startsWith('--'));

const aplicarTema = (page) => page.evaluate(async (modulePath) => {
  const { applyTheme, THEME_PRESETS } = await import(modulePath);
  applyTheme(THEME_PRESETS.find((item) => item.id === 'keirost-mono').theme, document.documentElement, { injectFontLink: false });
}, themeModule);

/** Campos de texto sin borde propio que, enfocados, llevan contorno. */
const conContorno = (page) => page.evaluate(() => {
  const campos = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]):not([type=hidden]), textarea')]
    .filter((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 20 && r.height > 10 && s.visibility !== 'hidden' && !el.disabled && !el.closest('[aria-hidden="true"]'); })
    .filter((el) => { const s = getComputedStyle(el); return parseFloat(s.borderTopWidth) === 0 && parseFloat(s.borderBottomWidth) === 0; });
  const malos = [];
  for (const el of campos.slice(0, 12)) {
    el.focus({ preventScroll: true });
    if (document.activeElement !== el) continue;
    const s = getComputedStyle(el);
    if (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) malos.push(`${el.tagName.toLowerCase()}${el.getAttribute('aria-label') ? `[${el.getAttribute('aria-label')}]` : el.placeholder ? `[${el.placeholder}]` : ''}`);
    el.blur();
  }
  return malos;
});

/** Elementos enfocables cuyo anillo sale por fuera de un contenedor que lo recorta. */
const recortados = (page) => page.evaluate(() => {
  const sel = 'button, a[href], [tabindex]:not([tabindex="-1"]), [role="tab"], [role="option"], [role="menuitem"], [role="radio"], input:not([type=hidden]), textarea, summary';
  const els = [...document.querySelectorAll(sel)].filter((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && !el.disabled && r.bottom > 0 && r.top < innerHeight; }).slice(0, 40);
  const out = [];
  for (const el of els) {
    el.focus({ preventScroll: true });
    if (document.activeElement !== el) continue;
    const s = getComputedStyle(el);
    const grow = (parseFloat(s.outlineOffset) || 0) + (parseFloat(s.outlineWidth) || 0);
    if (s.outlineStyle !== 'none' && grow > 0.5) {
      const r = el.getBoundingClientRect();
      // El primer antepasado que recorta: si el elemento cabe en él pero su anillo no, se corta.
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (ps.overflowX === 'visible' && ps.overflowY === 'visible') continue;
        const pr = p.getBoundingClientRect();
        const cabe = r.left >= pr.left - 1 && r.right <= pr.right + 1 && r.top >= pr.top - 1 && r.bottom <= pr.bottom + 1;
        const corta = (ps.overflowX !== 'visible' && (r.left - grow < pr.left - 0.5 || r.right + grow > pr.right + 0.5))
          || (ps.overflowY !== 'visible' && (r.top - grow < pr.top - 0.5 || r.bottom + grow > pr.bottom + 0.5));
        if (cabe && corta) out.push(`${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[${el.getAttribute('role')}]` : ''} «${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}»`);
        break;
      }
    }
    el.blur();
  }
  return out;
});

run(async ({ browser, check }) => {
  const meta = await (await fetch(`${BASE}/meta.json`)).json();
  const historias = Object.keys(meta.stories).filter((id) => !filtro || id.includes(filtro));
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const fallos = [];
  const cortados = [];
  for (const id of historias) {
    await page.goto(`${BASE}/?story=${id}&mode=preview`, { waitUntil: 'load' });
    await page.waitForTimeout(250);
    await aplicarTema(page);
    const malos = await conContorno(page);
    if (malos.length) fallos.push(`${id}: ${malos.join(', ')}`);
    const rotos = await recortados(page);
    if (rotos.length) cortados.push(`${id}: ${rotos.slice(0, 3).join(', ')}`);
  }
  check(`ningún campo sin borde dibuja el anillo del tema (${historias.length} historias)`, fallos.length === 0, fallos.slice(0, 8).join(' | '));
  check('ningún anillo de foco queda recortado por su contenedor', cortados.length === 0, cortados.slice(0, 8).join(' | '));

  // La paleta de comandos no se ve hasta abrirla.
  if (!filtro || 'command-palette'.includes(filtro)) {
    await page.goto(`${BASE}/?story=command-palette--basica&mode=preview`, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await aplicarTema(page);
    await page.keyboard.press('Control+k');
    const input = page.locator('[role="dialog"] input[role="combobox"]').first();
    if (!(await input.count())) await page.getByRole('button').first().click();
    await input.waitFor();
    await input.focus();
    check('el buscador de la paleta no lleva contorno', await input.evaluate((el) => getComputedStyle(el).outlineStyle) === 'none');
    const boton = page.locator('[role="dialog"] button').first();
    if (await boton.count()) {
      await boton.focus();
      check('los botones conservan el anillo del tema', await boton.evaluate((el) => getComputedStyle(el).outlineStyle) !== 'none');
    }
  }
});

void launch;
