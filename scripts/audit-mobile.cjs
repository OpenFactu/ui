const { chromium } = require('playwright-core');
const fs = require('node:fs');
const base = process.env.LADLE_URL || 'http://localhost:61000';
(async () => {
  const meta = await (await fetch(`${base}/meta.json`)).json(); const seen = new Set();
  const stories = Object.keys(meta.stories).filter(id => { const prefix = id.split('--')[0]; if (seen.has(prefix)) return false; seen.add(prefix); return true; });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const jobs = stories.flatMap(story => [320, 390].map(width => ({ story, width }))); let next = 0; const results = [];
  try { await Promise.all(Array.from({ length: 4 }, async () => { const page = await browser.newPage({ reducedMotion: 'reduce' });
    while (next < jobs.length) { const { story, width } = jobs[next++]; const errors = []; const onError = error => errors.push(error.message); page.on('pageerror', onError);
      try { await page.setViewportSize({ width, height: 844 }); await page.goto(`${base}/?story=${story}&mode=preview`, { waitUntil: 'networkidle' });
        const measurement = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth,
          offenders: [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.right > innerWidth + 2 && r.width > 0 && getComputedStyle(el).position !== 'absolute'; }).slice(0, 3).map(el => `${el.tagName}.${String(el.className).slice(0, 100)}`),
          controls: [...document.querySelectorAll('[data-k-control]')].filter(el => el.getBoundingClientRect().width > 0).map(el => ({ kind: el.dataset.kControl, height: Math.round(el.getBoundingClientRect().height), font: getComputedStyle(el).fontSize })) }));
        results.push({ story, width, ...measurement, errors });
      } catch (error) { results.push({ story, width, errors: [error.message] }); }
      page.off('pageerror', onError);
    } await page.close(); })); } finally { await browser.close(); }
  fs.mkdirSync('.shots/mobile-redesign-gallery', { recursive: true }); fs.writeFileSync('.shots/mobile-redesign-gallery/audit.json', JSON.stringify(results, null, 2));
  const failures = results.filter(result => result.overflow > 1 || result.errors?.length);
  console.log(`${results.length} comprobaciones; ${failures.length} incidencias`);
  failures.forEach(result => console.log(`${result.story} ${result.width}px overflow=${result.overflow ?? '?'} ${result.errors?.join('; ') || result.offenders?.join(' | ')}`));
  process.exitCode = failures.length ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 1; });
