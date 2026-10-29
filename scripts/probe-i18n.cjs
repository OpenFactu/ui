/**
 * Traducciones en Chrome real (con Ladle en marcha): abre TODAS las historias con `?k-locale=pseudo`, donde cada texto
 * del catálogo sale envuelto en ⟦…⟧, y busca frases del catálogo español que se vean SIN envolver (texto o etiquetas
 * accesibles). Esas frases llegan a la pantalla sin pasar por el idioma activo: un `esMessages` leído a pelo, un
 * valor por defecto calculado fuera de React… La guarda `check-i18n` encuentra los literales; esto, el resto.
 *
 *   node scripts/probe-i18n.cjs [filtro]
 */
require('./test-support.cjs');
const { launch, BASE } = require('./probe-kit.cjs');
const { esMessages } = require('../src/i18n/messages.ts');

/** Frases del catálogo (los trozos fijos de cada texto) lo bastante largas para no confundirse con datos. */
const frases = new Set();
const recoger = (v) => {
  if (typeof v === 'string') for (const trozo of v.split(/\{\w+\}|#/)) { const t = trozo.trim().replace(/[.,:;·]+$/, ''); if (t.split(/\s+/).length >= 3 && t.length >= 12) frases.add(t); }
  else if (Array.isArray(v)) return;
  else if (v && typeof v === 'object') Object.values(v).forEach(recoger);
};
recoger(esMessages);
const lista = [...frases];

/**
 * Historias cuyo contenido propio repite a propósito una frase del catálogo (ejemplos de `labels`, de textos
 * personalizados…). Se listan aparte para no esconder fallos reales.
 */
const PROPIAS = [
  /^traducciones--/, // fija su propio idioma con un selector
  /^banner--tonos$/, // «No se ha podido enviar a la AEAT», título de la historia
  /^otp-input--basico$/, // `label="Código de verificación"` de la historia
  /^texto--parrafos$/, // «actualizado hace un momento», texto de la historia
];

const filtro = process.argv.slice(2).find((a) => !a.startsWith('--'));

(async () => {
  const meta = await (await fetch(`${BASE}/meta.json`)).json();
  const historias = Object.keys(meta.stories).filter((id) => !filtro || id.includes(filtro));
  const browser = await launch();
  const hallazgos = [];
  let next = 0;
  try {
    await Promise.all(Array.from({ length: 4 }, async () => {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
      while (next < historias.length) {
        const id = historias[next++];
        // Un hook del catálogo mal colocado rompe el render: la historia se queda en blanco y no se vería nada.
        const errores = [];
        const onError = (error) => errores.push(error.message.split('\n')[0]);
        page.on('pageerror', onError);
        try {
          await page.goto(`${BASE}/?story=${id}&mode=preview&k-locale=pseudo`, { waitUntil: 'load' });
          await page.waitForTimeout(600);
          const textos = await page.evaluate(() => {
            const out = [document.body.innerText];
            for (const el of document.querySelectorAll('[aria-label], [title], [placeholder], [alt], [aria-roledescription]')) {
              for (const a of ['aria-label', 'title', 'placeholder', 'alt', 'aria-roledescription']) { const v = el.getAttribute(a); if (v) out.push(v); }
            }
            return out;
          });
          // Se quita todo lo que va entre ⟦…⟧ (también anidado) y se buscan frases del catálogo en lo que queda.
          const fuera = textos.map((t) => { let s = t; let prev; do { prev = s; s = s.replace(/⟦[^⟦⟧]*⟧/g, ' '); } while (s !== prev); return s; }).join('\n');
          const vistas = lista.filter((f) => fuera.includes(f));
          if (vistas.length && !PROPIAS.some((re) => re.test(id))) hallazgos.push({ id, vistas });
          if (errores.length) hallazgos.push({ id, vistas: errores.map((e) => `(error de página: ${e})`) });
        } catch (error) {
          hallazgos.push({ id, vistas: [`(no se pudo abrir: ${error.message.split('\n')[0]})`] });
        } finally {
          page.off('pageerror', onError);
        }
      }
      await page.close();
    }));
  } finally {
    await browser.close();
  }
  for (const h of hallazgos.sort((a, b) => a.id.localeCompare(b.id))) console.log(`  FALLA ${h.id}: ${h.vistas.slice(0, 4).map((v) => `«${v}»`).join(', ')}`);
  console.log(`\n${historias.length} historias en pseudoidioma, ${lista.length} frases del catálogo vigiladas.`);
  if (hallazgos.length) { console.log(`${hallazgos.length} historia(s) con textos que no siguen al idioma.`); process.exit(1); }
  console.log('Todo bien');
})();
