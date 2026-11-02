// Accesibilidad de todas las stories con axe (WCAG 2 A y AA). Compara con `scripts/a11y-baseline.json`: lo que ya estaba
// registrado no falla, pero un problema nuevo sí, así que la lista solo puede bajar.
//
//   node scripts/probe-a11y.cjs               comprueba
//   node scripts/probe-a11y.cjs --update      rehace la lista con lo que hay ahora
//   node scripts/probe-a11y.cjs table         solo las stories que contengan «table»
//
// Necesita Ladle en marcha. El contraste real lo mide `check-contrast.mts`, que entiende las capas translúcidas.
const fs = require('node:fs');
const path = require('node:path');
const { run, storyUrl, BASE } = require('./probe-kit.cjs');

const BASELINE = path.join(__dirname, 'a11y-baseline.json');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const update = process.argv.includes('--update');
const filter = process.argv.slice(2).find((a) => !a.startsWith('--'));

run(async ({ browser, check }) => {
  const meta = await (await fetch(`${BASE}/meta.json`)).json();
  const stories = Object.keys(meta.stories).filter((id) => !filter || id.includes(filter));
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const found = {};
  for (const id of stories) {
    try {
      // Con `load` aún no se ha pintado la story, y axe analizaría una página a medias: el resultado cambiaría de una pasada a otra.
      await page.goto(storyUrl(id), { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(400);
      await page.evaluate(AXE);
      const violations = await page.evaluate(async () => {
        // eslint-disable-next-line no-undef
        const result = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'], rules: { 'color-contrast': { enabled: false } } });
        return result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') ?? '' }));
      });
      if (violations.length) found[id] = violations;
    } catch (error) {
      console.log(`  ?    ${id}: ${String(error.message).split('\n')[0]}`);
    }
  }
  await page.close();

  const flat = (map) => Object.fromEntries(Object.entries(map).flatMap(([id, list]) => list.map((v) => [`${id} · ${v.id}`, v.nodes ?? v])));
  const now = flat(found);
  if (update) {
    fs.writeFileSync(BASELINE, `${JSON.stringify(now, Object.keys(now).sort(), 2)}\n`);
    console.log(`${Object.keys(now).length} problemas registrados en ${stories.length} stories.`);
    return;
  }
  const known = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
  const fresh = Object.keys(now).filter((key) => !filter ? !(key in known) || now[key] > known[key] : !(key in known) || now[key] > known[key]);
  const fixed = filter ? [] : Object.keys(known).filter((key) => !(key in now));
  for (const key of fresh) {
    const [id, rule] = key.split(' · ');
    const detail = found[id].find((v) => v.id === rule);
    console.log(`  NUEVO ${key} (${detail.impact}, ${detail.nodes}): ${detail.sample}`);
  }
  if (fixed.length) console.log(`  Ya arreglados ${fixed.length}: quítalos con --update.`);
  console.log(`${stories.length} stories, ${Object.keys(now).length} problemas, ${Object.keys(known).length} registrados.`);
  check('no hay problemas de accesibilidad nuevos', fresh.length === 0, `${fresh.length} nuevos`);
});
