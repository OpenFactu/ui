/**
 * Mide el contraste REAL de cada texto de las stories bajo un tema dado y
 * avisa de lo que no llega al mínimo WCAG AA (4.5:1, o 3:1 si el texto es
 * grande). Compone las capas translúcidas, así que un fondo al 10 % no se
 * confunde con uno sólido.
 *
 *   npx tsx scripts/check-contrast.mts                 # tema Plum (oscuro, acento rosa)
 *   npx tsx scripts/check-contrast.mts keirost-carbon  # cualquier preset
 *
 * Requiere Ladle levantado (`npm run dev`).
 */
import { chromium } from 'playwright-core';
import { resolveTheme, themeToCssVars } from '../src/theme/tokens';
import { THEME_PRESETS } from '../src/theme/presets';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE_URL = process.env.LADLE_URL ?? 'http://localhost:61000';

/** Stories representativas: superficies, formularios, listas y superposiciones. */
const STORIES = (process.env.CONTRAST_STORIES ?? '').split(',').filter(Boolean).length
  ? process.env.CONTRAST_STORIES!.split(',')
  : [
      'theme-in-use--pantalla-completa',
      'theme-in-use--overlays-tematizados',
      'color-input--con-paleta',
      'file-dropzone--basico',
      'number-input--basico',
      'list--por-secciones',
      'date-picker--basico',
      'table--basica',
      'modal--formulario',
    ];

const presetId = process.argv[2] ?? 'keirost-plum';
const preset = THEME_PRESETS.find((p) => p.id === presetId);
if (!preset) {
  console.error(`Preset desconocido: ${presetId}. Opciones: ${THEME_PRESETS.map((p) => p.id).join(', ')}`);
  process.exit(1);
}
const vars = themeToCssVars(resolveTheme(preset.theme));

/**
 * El cuerpo de la medición va como CADENA, no como función: al ejecutar este
 * fichero con tsx, esbuild inyecta un helper (`__name`) en las funciones que
 * se serializan al navegador, y allí no existe.
 */
const MEASURE = `(() => {
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const nums = (s) => (s.match(/[\\d.]+/g) || []).map(Number);
  const bgOf = (el) => {
    const layers = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const v = nums(getComputedStyle(n).backgroundColor);
      if (v.length >= 3) {
        const a = v.length > 3 ? v[3] : 1;
        if (a > 0) { layers.push({ rgb: v.slice(0, 3), a }); if (a >= 0.999) break; }
      }
      n = n.parentElement;
    }
    const rootv = nums(getComputedStyle(document.documentElement).backgroundColor);
    let base = rootv.length >= 3 && (rootv[3] ?? 1) > 0 ? rootv.slice(0, 3) : [255, 255, 255];
    for (let i = layers.length - 1; i >= 0; i--) {
      const { rgb, a } = layers[i];
      base = base.map((c, j) => rgb[j] * a + c * (1 - a));
    }
    return base;
  };
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const txt = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    if (!txt) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.3) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const l1 = lum(nums(cs.color).slice(0, 3));
    const l2 = lum(bgOf(el));
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    out.push({ text: txt.slice(0, 30), ratio: +ratio.toFixed(2), size: parseFloat(cs.fontSize), bold: +cs.fontWeight >= 700 });
  }
  return out;
})()`;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

let failures = 0;
let worst = { ratio: 99, text: '', story: '' };

for (const story of STORIES) {
  await page.goto(`${BASE_URL}/?story=${story}&mode=preview`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250);
  await page.evaluate(
    `(() => {
      const root = document.documentElement;
      root.classList.toggle('dark', ${resolveTheme(preset.theme).mode === 'dark'});
      const vars = ${JSON.stringify(vars)};
      for (const k in vars) root.style.setProperty(k, vars[k]);
    })()`,
  );
  // Sin esto se mide a mitad de la transición de color que dispara el cambio
  // de tema, y salen valores intermedios que no existen en pantalla.
  await page.addStyleTag({
    content:
      '*,*::before,*::after{transition-duration:0s!important;animation-duration:0s!important;animation-delay:0s!important}',
  });
  await page.waitForTimeout(350);

  const results = (await page.evaluate(MEASURE)) as Array<{
    text: string; ratio: number; size: number; bold: boolean;
  }>;

  // Umbral AA: 3:1 si el texto es grande (>=24px, o >=18.66px en negrita).
  const threshold = (r: { size: number; bold: boolean }) =>
    r.size >= 24 || (r.size >= 18.66 && r.bold) ? 3 : 4.5;
  const bad = results.filter((r) => r.ratio < threshold(r));
  const localWorst = results.reduce((a, r) => (r.ratio < a.ratio ? r : a), { ratio: 99, text: '' } as any);
  if (localWorst.ratio < worst.ratio) worst = { ...localWorst, story };
  failures += bad.length;

  console.log(
    `${story.padEnd(38)} textos=${String(results.length).padStart(3)}  peor=${String(localWorst.ratio).padStart(5)}  bajo umbral=${bad.length}` +
      (bad.length ? '\n    ' + bad.slice(0, 5).map((x) => `«${x.text}» ${x.ratio}`).join(' · ') : ''),
  );
}

console.log(`\nTema: ${preset.label} · peor contraste ${worst.ratio} en «${worst.text}» (${worst.story})`);
console.log(failures === 0 ? 'Ningún texto por debajo del umbral WCAG AA.' : `${failures} textos por debajo del umbral.`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
