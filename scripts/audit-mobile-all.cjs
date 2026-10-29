/**
 * Auditoría móvil de TODAS las historias (con Ladle en marcha): a 375 px busca desbordamiento horizontal de la
 * página, elementos que se salen de la pantalla sin estar dentro de algo desplazable, controles que se pisan y errores
 * de página. Con `--shots <carpeta>` guarda además una captura de cada historia para revisarlas a ojo.
 *
 *   node scripts/audit-mobile-all.cjs [--shots .shots/mobile-all] [filtro]
 */
const fs = require('node:fs');
const path = require('node:path');
const { launch, BASE } = require('./probe-kit.cjs');

const args = process.argv.slice(2);
const shotsDir = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
const filter = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--shots');

(async () => {
  const meta = await (await fetch(`${BASE}/meta.json`)).json();
  const stories = Object.keys(meta.stories).filter((id) => !filter || id.includes(filter));
  if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });
  const browser = await launch();
  const results = [];
  let next = 0;
  try {
    await Promise.all(Array.from({ length: 4 }, async () => {
      const page = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
      while (next < stories.length) {
        const story = stories[next++];
        const errors = [];
        const onError = (error) => errors.push(error.message);
        page.on('pageerror', onError);
        try {
          await page.goto(`${BASE}/?story=${story}&mode=preview`, { waitUntil: 'load' });
          await page.waitForTimeout(500);
          const m = await page.evaluate(() => {
            const W = innerWidth;
            const scrollsX = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true; } return false; };
            const visible = (el) => { const s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
            const offenders = [...document.querySelectorAll('body *')].filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && r.height > 0 && (r.right > W + 2 || r.left < -2) && getComputedStyle(el).position !== 'fixed' && visible(el) && !scrollsX(el);
            }).slice(0, 4).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ').filter(Boolean).slice(0, 3).join('.')}`);
            // Botones que se pisan entre sí (más de un tercio del más pequeño).
            const buttons = [...document.querySelectorAll('button, [role="button"], a[href]')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && visible(el); });
            const overlaps = [];
            for (let i = 0; i < buttons.length && overlaps.length < 3; i++) {
              const a = buttons[i].getBoundingClientRect();
              for (let j = i + 1; j < buttons.length; j++) {
                if (buttons[i].contains(buttons[j]) || buttons[j].contains(buttons[i])) continue;
                const b = buttons[j].getBoundingClientRect();
                const w = Math.min(a.right, b.right) - Math.max(a.left, b.left); const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
                if (w > 0 && h > 0 && w * h > Math.min(a.width * a.height, b.width * b.height) / 3) { overlaps.push(`${(buttons[i].getAttribute('aria-label') || buttons[i].textContent || '').trim().slice(0, 24)} × ${(buttons[j].getAttribute('aria-label') || buttons[j].textContent || '').trim().slice(0, 24)}`); break; }
              }
            }
            return { overflow: document.documentElement.scrollWidth - W, offenders, overlaps };
          });
          if (shotsDir) await page.screenshot({ path: path.join(shotsDir, `${story}.png`) });
          results.push({ story, ...m, errors });
        } catch (error) {
          results.push({ story, errors: [error.message.split('\n')[0]] });
        }
        page.off('pageerror', onError);
      }
      await page.close();
    }));
  } finally { await browser.close(); }
  results.sort((a, b) => a.story.localeCompare(b.story));
  const bad = results.filter((r) => r.overflow > 1 || r.offenders?.length || r.overlaps?.length || r.errors?.length);
  if (shotsDir) fs.writeFileSync(path.join(shotsDir, 'audit.json'), JSON.stringify(results, null, 2));
  console.log(`${results.length} historias a 375 px; ${bad.length} con incidencias`);
  for (const r of bad) console.log(`- ${r.story}: ${[r.overflow > 1 && `desborda ${r.overflow}px`, r.offenders?.length && `fuera: ${r.offenders.join(' | ')}`, r.overlaps?.length && `se pisan: ${r.overlaps.join(' | ')}`, r.errors?.length && `errores: ${r.errors.join('; ')}`].filter(Boolean).join(' · ')}`);
  process.exitCode = bad.length ? 1 : 0;
})().catch((error) => { console.error(error); process.exitCode = 1; });
